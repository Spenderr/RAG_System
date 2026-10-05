import re
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import pypdf

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from config import UPLOAD_DIR, IMAGE_EXTENSIONS
from database import organizations_db, processed_documents, vector_store, save_organizations
from services.ocr_service import extract_text_from_image


async def ai_detect_organization(filename: str, text_preview: str) -> dict:
    """
    Use AI to analyze a document and suggest which organization and distinct portfolio/folder it belongs to.
    """
    existing_orgs = [
        {
            "id": oid,
            "name": org["name"],
            "description": org.get("description", ""),
            "folders": org.get("folders", [])
        }
        for oid, org in organizations_db["organizations"].items()
        if not org.get("is_system", False)
    ]

    org_list_text = "\n".join([
        f"- ID: {o['id']}, Name: {o['name']}, Existing Folders: {o.get('folders', [])}"
        for o in existing_orgs
    ]) if existing_orgs else "No registered organizations yet."

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    prompt = f"""You are an intelligent real estate and portfolio archiving assistant.
Analyze the following document; determine its client/organization, property/location-based PORTFOLIO FOLDER, and tags.

EXISTING ORGANIZATIONS AND FOLDERS:
{org_list_text}

DOCUMENT FILENAME: {filename}
DOCUMENT TEXT PREVIEW:
{text_preview[:2500]}

RULES:
1. ORGANIZATION:
   - Match against existing organizations ("suggested_org_id") based on client/company names in the document, or suggest a new clean organization name in English ("suggested_org_name").
2. PORTFOLIO / FOLDER NAMING (CRITICAL):
   - Each distinct land parcel, apartment, city/district, or project is a SEPARATE PORTFOLIO FOLDER (e.g. "Paris Property Portfolio", "Berlin Office Building", "London Central Commercial").
   - If this document refers to a distinct property location, DO NOT assign an old folder name! Propose a clean, descriptive folder name in English.
   - Only reuse an existing folder if the document belongs to the exact same property/subject.
3. TAGS:
   - 2-4 clean English tags: ["deed", "zoning", "contract", "land", "agreement", "notes"].
4. LANGUAGE:
   - ALL output, reasoning, names, and tags MUST BE IN ENGLISH.

Respond strictly in this JSON format:
{{
  "suggested_org_id": "<matched ID or null>",
  "suggested_org_name": "<clean English organization name>",
  "suggested_folder": "<property/location specific English folder name>",
  "confidence": "high/medium/low",
  "reasoning": "<concise English explanation>",
  "suggested_tags": ["tag1", "tag2"],
  "doc_type": "contract/proposal/invoice/procedure/report/correspondence/other"
}}
"""

    try:
        result = await llm.ainvoke([HumanMessage(content=prompt)])
        content = result.content.strip()
        if "```" in content:
            content = re.search(r'```(?:json)?\s*(.*?)```', content, re.DOTALL)
            content = content.group(1).strip() if content else "{}"
        return json.loads(content)
    except Exception as e:
        print(f"[ai_detect] Error: {e}")
        return {
            "suggested_org_id": None,
            "suggested_org_name": None,
            "suggested_folder": "",
            "confidence": "low",
            "reasoning": f"AI detection failed: {str(e)}",
            "suggested_tags": [],
            "doc_type": "other",
        }


async def analyze_batch_for_smart_organization(filenames: List[str]) -> dict:
    """Analyze multiple uploaded documents together to identify shared portfolio, clean filenames, and tags."""
    existing_orgs = [
        {"id": oid, "name": org["name"], "description": org.get("description", ""), "folders": org.get("folders", [])}
        for oid, org in organizations_db["organizations"].items()
        if not org.get("is_system", False)
    ]

    files_context = []
    for fname in filenames:
        text = ""
        if fname in processed_documents:
            text = processed_documents[fname].get("text", "")
        if not text:
            file_path = UPLOAD_DIR / fname
            if file_path.exists():
                ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
                if ext == "pdf":
                    try:
                        reader = pypdf.PdfReader(file_path)
                        text = "\n".join(page.extract_text() or "" for page in reader.pages[:3])
                    except: pass
                elif ext in IMAGE_EXTENSIONS:
                    try:
                        text = await extract_text_from_image(file_path)
                    except: pass
                elif ext == "txt":
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            text = f.read()[:2500]
                    except: pass
        files_context.append({
            "filename": fname,
            "preview": text[:2500] if text else "Content could not be read."
        })

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = f"""You are an expert real estate, portfolio, and corporate document management assistant.
The user is uploading file(s). Your goal is to automatically organize all files into the correct client/organization, distinct portfolio folder, clean standardized English filenames, and rich tags with ZERO manual work required from the user.

EXISTING ORGANIZATIONS AND FOLDERS:
{json.dumps(existing_orgs, ensure_ascii=False, indent=2)}

UPLOADED FILES TEXT PREVIEWS ({len(filenames)} files):
{json.dumps(files_context, ensure_ascii=False, indent=2)}

ANALYSIS AND AUTOMATION RULES:
1. ORGANIZATION MATCHING:
   - Identify company titles, client names, letterheads, or signatories.
   - If matching an existing org, provide its "suggested_org_id".
   - If a new entity or individual, set "suggested_org_id": null and provide a clean English "suggested_org_name".

2. PORTFOLIO / FOLDER NAMING (PROPERTY / LOCATION SPECIFIC):
   - Each distinct land parcel, building, project, or location is a SEPARATE PORTFOLIO FOLDER.
   - If the uploaded files represent a new property/location, create a NEW English folder name (e.g. "Paris Real Estate Portfolio", "London Central Office", "Miami Residential Development").
   - Only reuse an existing folder if the files strictly belong to that exact property.

3. STANDARDIZED FILENAMES:
   - Eliminate meaningless names like "Screenshot 2026-...", "IMG_4021.PNG", "scan_1.pdf".
   - Create clear, numbered English filenames reflecting actual content (e.g. "1_Paris_Title_Deed.png", "2_Paris_Zoning_Plan.pdf", "3_Paris_Contract_Summary.pdf").

4. TAGS:
   - 2-4 clean English tags: ["deed", "zoning", "contract", "meeting_note", "commercial"].

5. BATCH SUMMARY:
   - "batch_summary": A concise, polite, professional 1-sentence English explanation summarizing what was detected and organized.

6. LANGUAGE:
   - ALL output, summary, filenames, folders, and tags MUST BE IN ENGLISH.

Respond strictly with this JSON schema:
{{
  "is_portfolio_batch": true/false,
  "suggested_org_id": "<matched org ID or null>",
  "suggested_org_name": "<clean English org name>",
  "suggested_folder": "<property/location specific English folder name>",
  "confidence": "high/medium/low",
  "batch_summary": "<1 sentence English explanation>",
  "file_renames": {{
    "original_filename.ext": "1_Clean_Filename.ext"
  }},
  "suggested_tags": ["tag1", "tag2", "tag3"]
}}
"""

    try:
        res = await llm.ainvoke([HumanMessage(content=prompt)])
        content = res.content.strip()
        if "```" in content:
            content = re.search(r'```(?:json)?\s*(.*?)```', content, re.DOTALL)
            content = content.group(1).strip() if content else "{}"
        parsed = json.loads(content)
        return parsed
    except Exception as e:
        print(f"[batch_analyze] Error: {e}")
        return {
            "is_portfolio_batch": len(filenames) > 1,
            "suggested_org_id": None,
            "suggested_org_name": None,
            "suggested_folder": "New Portfolio" if len(filenames) > 1 else "",
            "confidence": "low",
            "batch_summary": "Files prepared and categorized in batch.",
            "file_renames": {f: f for f in filenames},
            "suggested_tags": ["portfolio"]
        }


def rename_doc_internal(old_name: str, new_name_raw: str) -> str:
    """Rename a document on disk, update processed_documents, Chroma metadata, and organizations_db."""
    global processed_documents
    if not new_name_raw or not new_name_raw.strip():
        return old_name

    ext = old_name.rsplit(".", 1)[-1].lower() if "." in old_name else "txt"
    raw_base = new_name_raw.strip()
    if raw_base.lower().endswith(f".{ext}"):
        raw_base = raw_base[:-len(f".{ext}")]

    clean_base = re.sub(r'[^a-zA-Z0-9_\-çğıöşüÇĞİÖŞÜ\s]', '', raw_base).strip().replace(' ', '_')
    if not clean_base:
        return old_name

    new_filename = f"{clean_base}.{ext}"
    if new_filename == old_name:
        return old_name

    counter = 1
    new_path = UPLOAD_DIR / new_filename
    while new_path.exists() and new_filename != old_name:
        new_filename = f"{clean_base}_{counter}.{ext}"
        new_path = UPLOAD_DIR / new_filename
        counter += 1

    old_path = UPLOAD_DIR / old_name
    if old_path.exists():
        try:
            old_path.rename(new_path)
        except Exception as e:
            print(f"[rename_doc] File rename error: {e}")

    if old_name in processed_documents:
        doc_info = processed_documents.pop(old_name)
        processed_documents[new_filename] = doc_info

    if old_name in organizations_db["document_assignments"]:
        assignment = organizations_db["document_assignments"].pop(old_name)
        organizations_db["document_assignments"][new_filename] = assignment
        save_organizations()

    try:
        data = vector_store.get()
        ids_to_update = []
        updated_metadatas = []
        for doc_id, meta in zip(data.get("ids", []), data.get("metadatas", [])):
            if meta.get("source") == old_name:
                meta["source"] = new_filename
                ids_to_update.append(doc_id)
                updated_metadatas.append(meta)
        if ids_to_update:
            vector_store._collection.update(ids=ids_to_update, metadatas=updated_metadatas)
    except Exception as e:
        print(f"[rename_doc] Vector metadata update warning: {e}")

    return new_filename
