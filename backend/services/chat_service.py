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
4. Prepare a professional, reassuring Turkish explanation (`user_explanation`) confirming what was found and asking the user to confirm before the items are permanently deleted.
Example user_explanation:
"Silivri'deki arsa satıldığı için ilgili portföy ve dokümanları sistemden silmek istediğinizi anladım. Aşağıdaki kayıtlar tespit edildi:
- **Kurum:** Nuran hanimin portfoy
- **Portföy:** Silivri Arsa Portföyü
- **Dokümanlar:** 1_Silivri_Arsa_Tapu_Bilgisi.png, 2_Silivri_Arsa_Kat_Karsiligi.png

Bu dokümanlar ve vektör indeksleri sistemden kalıcı olarak kaldırılacaktır. Onaylıyor musunuz?"

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
        f"Based on the following documents, answer this question: {query}\n\n"
        f"Documents Context:\n{ctx}\n\n"
        "RESPONSE STRUCTURE & FORMATTING RULES (STRICT):\n"
        "1. VISUAL STRUCTURE & READABILITY:\n"
        "   - Start with a direct 1-2 sentence introductory summary answering the core question.\n"
        "   - Leave an empty line between paragraphs, headers, and list sections for clean spacing.\n"
        "   - Group key requirements, procedures, clauses, financial numbers, and critical conditions into clear Bullet Points (`- **Madde / Konu Başlığı**: Açıklama`).\n"
        "   - Use bold text (`**...**`) for critical percentages, amounts, deadlines, and key terms to make scanning effortless.\n"
        "   - If comparing different organizations or documents, use clear subheadings (`### Kurum/Doküman Adı`) or a clean markdown table.\n"
        "   - End with a short summary or practical takeaway paragraph.\n"
        "2. GROUNDING & SOURCE CITATIONS:\n"
        "   - For each bullet point or major claim, cite the source cleanly at the end of the line in italics/parentheses: `*(Kaynak: DosyaAdı.pdf, s. 4 | Kurum: Bassel Group)*`\n"
        "   - DO NOT insert bulky raw bracket tags in the middle of sentences.\n"
        "3. ACCURACY & CONCISENESS:\n"
        "   - Use ONLY information from the provided document chunks. If information is missing or unclear, explicitly note it."
    )

    messages = [
        SystemMessage(content=(
            "You are an expert AI Document & Organization Knowledge Assistant. "
            "You provide highly organized, professional, visually clean, and well-spaced answers using Markdown. "
            "Always structure answers with a short overview, clean bullet points with bold titles for critical items, double newlines between sections, and concise source citations."
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
