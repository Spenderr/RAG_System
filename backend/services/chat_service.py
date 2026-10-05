import re
import json
import uuid
import asyncio
from typing import List, Dict, Any, Optional

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from config import UPLOAD_DIR
from database import (
    organizations_db,
    processed_documents,
    chat_history,
    vector_store,
    save_organizations,
)
from models.chat import ExecuteActionRequest

DELETE_INTENT_PATTERN = re.compile(
    r'\b(?:sil|silelim|silebilir|silebiliriz|silebilir\s*miyiz|silsene|silinsin|silmek|kaldır|kaldıralım|kaldırabilir|kaldırabilir\s*miyiz|kaldırsana|kaldırılsın|kaldırmak|çıkar|çıkaralım|çıkarsana|temizle|temizleyelim|delete|remove|purge|erase)\b',
    re.IGNORECASE
)

CONFIRMATION_PATTERN = re.compile(
    r'^(?:evet|onayl[ıi]yorum|tamam|tamam sil|evet sil|silebilirsin|onay|kaldır|sil gitsin|kabul|onayl[ıi]yorum sil)$',
    re.IGNORECASE
)

CANCEL_PATTERN = re.compile(
    r'^(?:vazge[çc]|iptal|hay[ıi]r|silme|vazge[çc]tim|dur|istemiyorum)$',
    re.IGNORECASE
)


async def detect_deletion_action(query: str, history: List[Any]) -> Optional[Dict[str, Any]]:
    """Determine if query expresses intent to delete a portfolio/folder/doc and match it to existing records."""
    if not DELETE_INTENT_PATTERN.search(query):
        return None

    org_list = []
    for org_id, org in organizations_db.get("organizations", {}).items():
        if org_id == "__unassigned__":
            continue
        org_list.append({
            "id": org_id,
            "name": org.get("name", ""),
            "description": org.get("description", ""),
            "folders": org.get("folders", []),
            "tags": org.get("tags", [])
        })

    doc_list = []
    for fname, assign in organizations_db.get("document_assignments", {}).items():
        doc_list.append({
            "filename": fname,
            "org_id": assign.get("org_id", ""),
            "folder": assign.get("folder", ""),
            "tags": assign.get("tags", []),
            "doc_type": assign.get("doc_type", "")
        })

    prompt = f"""You are an intelligent document and portfolio management assistant.
The user sent a message that contains deletion or removal keywords.

Current Organizations and Portfolios/Folders:
{json.dumps(org_list, ensure_ascii=False, indent=2)}

Current Documents:
{json.dumps(doc_list, ensure_ascii=False, indent=2)}

User Message: "{query}"

Determine whether the user is asking to DELETE, REMOVE, or PURGE a document, portfolio, folder, property/asset, or record from the system.
(Example: "silivrideki yeri birisi almis silelim", "ahmed patel git sertifikasını sil", "silivri arsasını kaldıralım", "izmir dikili portföyünü sil").
Note: If the user is just asking a legal, factual, or hypothetical question without requesting an action on the system files, answer is false.

If the user is asking to delete:
1. Match what they want to delete against the current Organizations, Folders, and Documents.
2. If a folder or portfolio is targeted (e.g., "Silivri" or "Silivri Arsa Portföyü"), identify its organization, the folder name, and ALL documents belonging to that folder!
3. If specific documents are targeted, identify those filenames.
4. Prepare a professional, reassuring explanation (`user_explanation`) and (`confirmation_title`) in the SAME LANGUAGE AS THE USER QUERY (English if user wrote in English, Turkish if Turkish), confirming what was found and asking the user to confirm before the items are permanently deleted.
Example user_explanation (if Turkish):
"İlgili portföy ve dokümanları sistemden silmek istediğinizi anladım. Aşağıdaki kayıtlar tespit edildi:
- **Portföy:** Portföy Adı
- **Dokümanlar:** dosya1.pdf, dosya2.png

Bu dokümanlar ve vektör indeksleri sistemden kalıcı olarak kaldırılacaktır. Onaylıyor musunuz?"

Example user_explanation (if English):
"I understand you want to delete the following records from the system:
- **Portfolio:** Portfolio Name
- **Documents:** file1.pdf, file2.png

These files and their vector memory indices will be permanently removed. Do you confirm?"

Respond ONLY with valid JSON:
{{
  "is_delete_request": true/false,
  "found": true/false,
  "target_org_id": "org_id or null",
  "target_org_name": "org_name or null",
  "target_folder": "folder_name or null",
  "target_filenames": ["filename1", "filename2"],
  "confirmation_title": "Silme Onayı Başlığı",
  "user_explanation": "Açıklama metni"
}}"""

    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        res = await asyncio.to_thread(llm.invoke, [SystemMessage(content="You are a JSON-only response assistant."), HumanMessage(content=prompt)])
        content = res.content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)
        data = json.loads(content)
        if data.get("is_delete_request"):
            return data
    except Exception as e:
        print(f"[detect_deletion_action] Error: {e}")

    return None


async def do_execute_chat_action(body: ExecuteActionRequest) -> Dict[str, Any]:
    """Execute deletion of documents, vectors, and folder atomically."""
    global processed_documents
    deleted_files = []

    target_files = list(body.target_filenames)
    if body.target_folder and body.target_org_id and not target_files:
        for fname, assign in organizations_db.get("document_assignments", {}).items():
            if assign.get("org_id") == body.target_org_id and assign.get("folder") == body.target_folder:
                target_files.append(fname)

    if target_files:
        data = vector_store.get()
        files_set = set(target_files)
        ids_to_delete = [
            doc_id for doc_id, meta in zip(data.get("ids", []), data.get("metadatas", []))
            if meta.get("source") in files_set
        ]
        if ids_to_delete:
            vector_store.delete(ids=ids_to_delete)

        for filename in target_files:
            if filename in processed_documents:
                del processed_documents[filename]
            if filename in organizations_db.get("document_assignments", {}):
                del organizations_db["document_assignments"][filename]
            file_path = UPLOAD_DIR / filename
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception as ex:
                    print(f"[action_execute] file unlink error: {ex}")
            deleted_files.append(filename)

    deleted_folder = None
    if body.delete_folder and body.target_folder and body.target_org_id:
        org = organizations_db.get("organizations", {}).get(body.target_org_id)
        if org and "folders" in org:
            if body.target_folder in org["folders"]:
                org["folders"].remove(body.target_folder)
                deleted_folder = body.target_folder
        for fname, assign in organizations_db.get("document_assignments", {}).items():
            if assign.get("org_id") == body.target_org_id and assign.get("folder") == body.target_folder:
                assign["folder"] = ""

    save_organizations()

    summary_target = deleted_folder or (", ".join(deleted_files) if deleted_files else "Seçilen kayıtlar")
    summary = f"'{summary_target}' ve ilgili {len(deleted_files)} adet doküman sistemden kalıcı olarak silindi."
    return {
        "status": "success",
        "message": summary,
        "deleted_files": deleted_files,
        "deleted_folder": deleted_folder,
        "deleted_count": len(deleted_files)
    }


async def generate_rag_chat_response(query: str) -> Dict[str, Any]:
    """Perform semantic search and generate a well-structured Markdown response with citations."""
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    # Rewrite query if chat history exists
    search_query = query
    if chat_history:
        rewrite_msgs = [
            SystemMessage(content=(
                "Given the chat history, rewrite the new question to be standalone and searchable. "
                "Return ONLY the rewritten question."
            )),
        ] + chat_history + [
            HumanMessage(content="New question: " + query),
        ]
        rw = await asyncio.to_thread(llm.invoke, rewrite_msgs)
        search_query = rw.content.strip()

    # Similarity search
    docs = await asyncio.to_thread(vector_store.similarity_search, search_query, k=6)

    # Build context
    ctx_parts = []
    for d in docs:
        source = d.metadata.get("source", "unknown")
        assignment = organizations_db["document_assignments"].get(source, {})
        org_id = assignment.get("org_id")
        org_name = organizations_db["organizations"].get(org_id, {}).get("name", "Unassigned") if org_id else "Unassigned"
        page = d.metadata.get("page", "?")
        tags = ", ".join(assignment.get("tags", []))

        ctx_parts.append(
            f"[Source: {source} | Organization: {org_name} | Page: {page} | Tags: {tags}]\n{d.page_content}"
        )

    ctx = "\n\n---\n\n".join(ctx_parts)

    combined = (
        f"User Question / Kullanıcı Sorusu: {query}\n\n"
        f"Warehouse Archive & Document Records (Context):\n{ctx}\n\n"
        "AI WAREHOUSE & DOCUMENT ASSISTANT INSTRUCTIONS:\n"
        "1. LANGUAGE MATCHING (CRITICAL / ÇOK ÖNEMLİ):\n"
        "   - ALWAYS respond in the EXACT same language that the user used to ask their question.\n"
        "   - If the user wrote in English, your entire response, headings, bullet points and citations MUST be in natural, professional English.\n"
        "   - If the user wrote in Turkish, your entire response MUST be in Turkish.\n"
        "2. IDENTITY AND TONE:\n"
        "   - You are the system's 'Document & Information Warehouse Assistant'.\n"
        "   - You are methodical, concise, disciplined, and transparent. You cite the exact document and page where information was found.\n"
        "3. FORMATTING & READABILITY:\n"
        "   - Begin with a direct 1-2 sentence executive summary of the answer.\n"
        "   - Use clear bullet points (`- **Key Term**: detail`) for terms, prices, square meters, names, and contract clauses.\n"
        "   - Bold critical dates, amounts, and figures.\n"
        "   - If comparing properties or clients, use subheadings (`### Client / Portfolio Name`).\n"
        "4. CITATIONS:\n"
        "   - At the end of each key point, cite the source: `*(Source: FileName.pdf, p. 4 | Portfolio: PortfolioName)*` (or in Turkish: `*(Arşiv: DosyaAdı.pdf, s. 4 | Portföy: PortföyAdı)*`).\n"
        "5. ACCURACY:\n"
        "   - Base your answer strictly on the provided warehouse context. If a detail is missing, state that it is not found in the archive."
    )

    messages = [
        SystemMessage(content=(
            "You are the intelligent 'Document & Info Assistant' for the digital warehouse repository. "
            "You classify, store, and retrieve information from real estate deeds, construction contracts, commercial agreements, and client notes. "
            "CRITICAL: Always detect the language of the user's prompt and respond in that exact language (e.g. English for English questions, Turkish for Turkish questions). "
            "Format your output cleanly using structured Markdown with bullet points and bold highlights."
        )),
    ] + chat_history + [
        HumanMessage(content=combined),
    ]

    result = await asyncio.to_thread(llm.invoke, messages)
    answer = result.content

    # Update history
    chat_history.append(HumanMessage(content=query))
    chat_history.append(AIMessage(content=answer))

    # Sources
    sources = []
    seen_sources = set()
    for d in docs:
        source_name = d.metadata.get("source", "unknown")
        chunk_index = d.metadata.get("chunk_index", -1)
        source_key = f"{source_name}_{chunk_index}"
        if source_key in seen_sources:
            continue
        seen_sources.add(source_key)

        assignment = organizations_db["document_assignments"].get(source_name, {})
        org_id = assignment.get("org_id")
        org = organizations_db["organizations"].get(org_id, {}) if org_id else {}

        sources.append({
            "source": source_name,
            "chunk_index": chunk_index,
            "page": d.metadata.get("page", 1),
            "preview": d.page_content[:200],
            "org_id": org_id,
            "org_name": org.get("name", "Unassigned"),
            "org_color": org.get("color", "#6b7280"),
            "tags": assignment.get("tags", []),
            "is_pdf": source_name.lower().endswith(".pdf"),
        })

    return {"answer": answer, "sources": sources, "action": None}
