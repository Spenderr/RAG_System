import os
import re
import json
import base64
import asyncio
import uuid
import urllib.parse
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from dotenv import load_dotenv
import pypdf

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

app = FastAPI(title="MainChunk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = PROJECT_ROOT / "uploads"
CHROMA_DIR = PROJECT_ROOT / "db" / "mainchunk_chroma"
ORG_DB_PATH = PROJECT_ROOT / "db" / "organizations.json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
(PROJECT_ROOT / "db").mkdir(parents=True, exist_ok=True)

# In-memory stores
processed_documents: Dict[str, Dict[str, Any]] = {}
chat_history: List[Any] = []

# Organization database (persisted to JSON)
organizations_db: Dict[str, Any] = {
    "organizations": {},  # org_id -> { name, description, color, tags, created_at }
    "document_assignments": {},  # filename -> { org_id, tags[], assigned_at, auto_detected }
}


# ──────────────────────────────────────────────────────────────────
# ORGANIZATION PERSISTENCE
# ──────────────────────────────────────────────────────────────────

def load_organizations():
    global organizations_db
    if ORG_DB_PATH.exists():
        try:
            with open(ORG_DB_PATH, "r", encoding="utf-8") as f:
                organizations_db = json.load(f)
            # Ensure structure
            if "organizations" not in organizations_db:
                organizations_db["organizations"] = {}
            if "document_assignments" not in organizations_db:
                organizations_db["document_assignments"] = {}
        except Exception as e:
            print(f"[org_db] Error loading organizations: {e}")


def save_organizations():
    try:
        with open(ORG_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(organizations_db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[org_db] Error saving organizations: {e}")


def ensure_unknown_org():
    """Make sure the 'Unassigned' organization always exists."""
    if "__unassigned__" not in organizations_db["organizations"]:
        organizations_db["organizations"]["__unassigned__"] = {
            "name": "Unassigned",
            "description": "Documents with no assigned organization",
            "color": "#6b7280",
            "tags": [],
            "created_at": datetime.now().isoformat(),
            "is_system": True,
        }
        save_organizations()


# Shared embedding model & vector store
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = Chroma(
    persist_directory=str(CHROMA_DIR),
    embedding_function=embedding_model,
    collection_metadata={"hnsw:space": "cosine"},
)


# ──────────────────────────────────────────────────────────────────
# STARTUP — rebuild processed_documents + load org db
# ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    global processed_documents
    load_organizations()
    ensure_unknown_org()

    try:
        data = vector_store.get()
        metadatas = data.get("metadatas", [])
        documents = data.get("documents", [])

        for doc_text, meta in zip(documents, metadatas):
            filename = meta.get("source")
            if not filename:
                continue
            if filename not in processed_documents:
                processed_documents[filename] = {
                    "text": "",
                    "chunks": [],
                    "char_count": 0,
                    "chunk_count": meta.get("total_chunks", 0),
                    "file_type": filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown",
                }
            processed_documents[filename]["chunks"].append(doc_text)
            processed_documents[filename]["char_count"] += len(doc_text)
    except Exception as e:
        print(f"[startup] Error loading existing documents: {e}")


# ──────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "gif"}


async def extract_text_from_image(file_path: Path) -> str:
    """
    Extract and transcribe text, numbers, tables, and content from images
    using GPT-4o-mini Vision (Multimodal OCR).
    """
    try:
        ext = file_path.suffix.lower().lstrip(".")
        mime_type = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

        with open(file_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": (
                        "Transcribe and extract all text, data, numbers, headers, and tables from this image accurately. "
                        "If there are tables, receipts, or invoices, format them cleanly using Markdown tables and bullet points. "
                        "Maintain the original language and phrasing. Return ONLY the transcribed content without introduction or commentary."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_image}",
                    },
                },
            ]
        )

        response = await llm.ainvoke([message])
        extracted = response.content.strip()
        return extracted if extracted else "No readable text detected in image."
    except Exception as e:
        print(f"[vision_ocr] Error processing image {file_path}: {e}")
        return f"Error extracting text from image: {str(e)}"


def clean_text(text: str) -> str:
    """Strip Wikipedia-style references, external links, citations."""
    stop_headers = [
        "\nReferences\n", "\nExternal links\n",
        "\nFurther reading\n", "\nSee also\n", "\nNotes\n",
    ]
    for stop in stop_headers:
        if stop in text:
            text = text.split(stop)[0]
    text = re.sub(r'\[(?:\d+|[a-z]|note\s*\d+)\]', '', text)
    return text


def normalize_text_to_paragraphs(raw_text: str) -> str:
    """
    Cleans and repairs PDF text:
    - Joins hyphenated words broken across lines (e.g. 'packag-\ning' -> 'packaging')
    - Merges soft newlines within sentences so sentences are not cut in half
    - Preserves true paragraph breaks and list items
    """
    text = clean_text(raw_text)

    # 1. Fix hyphenation at line breaks
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)

    # 2. Normalize carriage returns
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # 3. Merge soft line wraps: if a line does not end with sentence terminator, join with next line
    lines = text.split('\n')
    paragraphs = []
    current_para = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                paragraphs.append(' '.join(current_para))
                current_para = []
            continue

        # Check if line looks like a title heading or bullet
        is_heading = (
            bool(re.match(r'^(?:(?:\d{1,2}\.){1,3}|\d{1,2}\))\s+[A-ZÇĞİÖŞÜ0-9]', stripped)) or
            bool(re.match(r'^(?:ARTICLE|SECTION|MADDE|BÖLÜM|CLAUSE|RULE)\s+\d+', stripped, re.IGNORECASE)) or
            bool(re.match(r'^[A-Z0-9\s–—\-\(\)\/\:\.]{6,80}$', stripped) and len(stripped.split()) >= 2)
        )
        is_bullet = bool(re.match(r'^(?:[\-\*•]|\([a-zA-Z\d]+\))\s+', stripped))

        if (is_heading or is_bullet) and current_para:
            paragraphs.append(' '.join(current_para))
            current_para = []

        if is_heading:
            paragraphs.append(stripped)
        else:
            current_para.append(stripped)
            # If line ends with period/colon and has reasonable length, close paragraph
            if stripped.endswith(('.', ':', '!', '?')) and len(stripped) > 40:
                paragraphs.append(' '.join(current_para))
                current_para = []

    if current_para:
        paragraphs.append(' '.join(current_para))

    return '\n\n'.join(p for p in paragraphs if p.strip())


def is_section_heading(line: str) -> bool:
    """Detect if a line represents a section title, article, or numbered heading."""
    stripped = line.strip()
    if not stripped or len(stripped) > 130:
        return False

    # 1. Numbered headings: '1. ', '1.2 ', '1.2.3 ', '4. Irrevocable Corporate...'
    if re.match(r'^(?:(?:\d{1,2}\.){1,3}|\d{1,2}\))\s+[A-ZÇĞİÖŞÜ].+', stripped):
        return True

    # 2. Formal legal / procedure headings: 'ARTICLE 5', 'SECTION 2', 'MADDE 3', 'CLAUSE 4'
    if re.match(r'^(?:ARTICLE|SECTION|MADDE|BÖLÜM|CLAUSE|RULE)\s+\d+', stripped, re.IGNORECASE):
        return True

    # 3. All caps titles (between 6 and 90 chars, no terminal period/comma)
    if re.match(r'^[A-Z0-9\s–—\-\(\)\/\:\.]{6,90}$', stripped):
        # Don't treat address lines or short codes as headings
        if not re.search(r'\b(?:No\:\d+|Plaza|Avenue|Street|Tel|Email|www\.)', stripped, re.IGNORECASE):
            words = stripped.split()
            if len(words) >= 2:
                return True

    return False


def chunk_by_sections_or_paragraphs(full_text_with_pages: List[tuple], max_chunk_size=850, overlap=120):
    """
    Title/Section-aware chunking:
    - Automatically discovers document headings ('1. Title', 'ARTICLE 5', etc.)
    - Groups text by titles so every section stays together with its heading.
    - If a section exceeds max_chunk_size, splits smoothly at sentence boundaries while keeping the title header.
    - Preserves exact page numbers for each chunk.
    """
    raw_sections = []
    current_title = "Introduction"
    current_lines = []
    current_page = 1

    for page_num, page_text in full_text_with_pages:
        # Strip repeated letterheads/addresses
        cleaned_page = re.sub(r'BASSEL[\s\S]*?No:2, Şişli/İstanbul', '', page_text)
        cleaned_page = normalize_text_to_paragraphs(cleaned_page)

        for line in cleaned_page.split('\n'):
            line_s = line.strip()
            if not line_s:
                continue

            if is_section_heading(line_s):
                if current_lines:
                    raw_sections.append({
                        "title": current_title,
                        "text": '\n\n'.join(current_lines),
                        "page": current_page,
                    })
                    current_lines = []
                current_title = line_s
                current_page = page_num
            else:
                current_lines.append(line_s)
                current_page = page_num

    if current_lines:
        raw_sections.append({
            "title": current_title,
            "text": '\n\n'.join(current_lines),
            "page": current_page,
        })

    # If the document has clear sections (at least 2 headings)
    has_structure = len(raw_sections) >= 2 and any(s["title"] != "Introduction" for s in raw_sections)

    sentence_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chunk_size,
        chunk_overlap=overlap,
        keep_separator=True,
        separators=["\n\n", ".\n", ".\s+", ". ", "? ", "! ", "; ", "\n", " "],
    )

    final_chunks = []
    chunk_details = []

    if has_structure:
        chunk_idx = 0
        for sec in raw_sections:
            sec_title = sec["title"]
            sec_text = sec["text"].strip()
            sec_page = sec["page"]

            if not sec_text:
                continue

            # Full text with title
            titled_text = f"## {sec_title}\n{sec_text}"

            if len(titled_text) <= max_chunk_size + 150:
                final_chunks.append(titled_text)
                chunk_details.append({
                    "text": titled_text,
                    "title": sec_title,
                    "page": sec_page,
                    "index": chunk_idx,
                })
                chunk_idx += 1
            else:
                # Section is long: split into coherent sub-chunks with title context
                sub_parts = sentence_splitter.split_text(sec_text)
                for part_i, part in enumerate(sub_parts):
                    part_title = f"{sec_title} (Part {part_i + 1})" if len(sub_parts) > 1 else sec_title
                    sub_titled = f"## {part_title}\n{part.strip()}"
                    final_chunks.append(sub_titled)
                    chunk_details.append({
                        "text": sub_titled,
                        "title": part_title,
                        "page": sec_page,
                        "index": chunk_idx,
                    })
                    chunk_idx += 1
    else:
        # Standard fallback for unstructured docs
        all_text = '\n\n'.join(p[1] for p in full_text_with_pages)
        parts = sentence_splitter.split_text(normalize_text_to_paragraphs(all_text))
        for idx, p in enumerate(parts):
            final_chunks.append(p)
            chunk_details.append({
                "text": p,
                "title": f"Paragraph #{idx + 1}",
                "page": 1,
                "index": idx,
            })

    return final_chunks, chunk_details


# ──────────────────────────────────────────────────────────────────
# AI: AUTO-DETECT ORGANIZATION
# ──────────────────────────────────────────────────────────────────

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
    ]) if existing_orgs else "Henüz kayıtlı kurum yok."

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    prompt = f"""Sen akıllı bir gayrimenkul ve portföy arşiv uzmanısın.
Aşağıdaki dokümanı analiz et; ait olduğu kurumu, taşınmaz/lokasyon bazlı PORTFÖY KLASÖRÜNÜ ve etiketlerini belirle.

MEVCUT KURUMLAR VE KLASÖRLERİ:
{org_list_text}

DOKÜMAN ADI: {filename}
DOKÜMAN METNİ ÖZETİ:
{text_preview[:2500]}

KURALLAR:
1. KURUM:
   - Dokümanda geçen kişi/firma isimlerine göre mevcut kurumlardan birini seç ("suggested_org_id") veya yeni kurum adı ver ("suggested_org_name").
2. PORTFÖY / KLASÖR ADLANDIRMA (ÇOK ÖNEMLİ):
   - Her farklı arsa, daire, il/ilçe veya proje (örn. Silivri, Dikili, Kadıköy, Bodrum) AYRI BİR PORTFÖY KLASÖRÜDÜR.
   - Seçilen kurumda önceden bir klasör (örn: "İzmir Dikili") olsa dahi, eğer bu doküman farklı bir taşınmaza (örn. "Silivri Arsa") aitse ASLA eski klasöre ekleme! Mutlaka o yeni taşınmaza özel YENİ bir Klasör Adı öner (örn. "İstanbul Silivri Arsa").
   - Yalnızca bu doküman mevcut klasördeki taşınmazın aynısıysa o klasör adını ver.
3. ETİKETLER:
   - 2-4 adet net Türkçe etiket: ["tapu", "imar", "silivri", "arsa", "sozlesme"] gibi.

Yanıtı kesinlikle bu JSON formatında ver:
{{
  "suggested_org_id": "<eşleşen ID veya null>",
  "suggested_org_name": "<kurum adı>",
  "suggested_folder": "<taşınmaza/lokasyona özel klasör adı>",
  "confidence": "high/medium/low",
  "reasoning": "<kısa açıklama>",
  "suggested_tags": ["etiket1", "etiket2"],
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


# ──────────────────────────────────────────────────────────────────
# ENDPOINTS — ORGANIZATIONS
# ──────────────────────────────────────────────────────────────────

class CreateOrgRequest(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"
    tags: List[str] = []
    folders: List[str] = []


class AssignDocRequest(BaseModel):
    org_id: str
    folder: Optional[str] = None
    tags: List[str] = []
    doc_type: Optional[str] = None


class UpdateOrgRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None
    folders: Optional[List[str]] = None


class MoveFolderRequest(BaseModel):
    folder: str


class FolderCreateRequest(BaseModel):
    name: str


class FolderDeleteRequest(BaseModel):
    name: str


class CreateNoteRequest(BaseModel):
    title: str
    content: str
    org_id: Optional[str] = None
    folder: Optional[str] = None
    tags: Optional[List[str]] = []
    format_with_ai: Optional[bool] = False
    doc_type: Optional[str] = "whatsapp"


class RenameDocRequest(BaseModel):
    new_name: str


class BatchAnalyzeRequest(BaseModel):
    filenames: List[str]


class BatchCommitRequest(BaseModel):
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    folder: Optional[str] = None
    tags: Optional[List[str]] = []
    file_renames: Dict[str, str] = {}


class BatchDeleteRequest(BaseModel):
    filenames: List[str]


class BatchMoveRequest(BaseModel):
    filenames: List[str]
    target_org_id: Optional[str] = None
    target_folder: Optional[str] = None


@app.get("/api/organizations")
async def get_organizations():
    """List all organizations with their document counts and sub-folders."""
    result = []
    for org_id, org in organizations_db["organizations"].items():
        # Collect all folders
        folders_set = set(org.get("folders", []))
        for assignment in organizations_db["document_assignments"].values():
            if assignment.get("org_id") == org_id and assignment.get("folder"):
                folders_set.add(assignment["folder"])

        doc_count = sum(
            1 for assignment in organizations_db["document_assignments"].values()
            if assignment.get("org_id") == org_id
        )
        result.append({
            "id": org_id,
            "name": org["name"],
            "description": org.get("description", ""),
            "color": org.get("color", "#6366f1"),
            "tags": org.get("tags", []),
            "folders": sorted(list(folders_set)),
            "document_count": doc_count,
            "created_at": org.get("created_at", ""),
            "is_system": org.get("is_system", False),
        })
    return result


@app.post("/api/organizations")
async def create_organization(body: CreateOrgRequest):
    """Create a new organization."""
    org_id = re.sub(r'[^a-z0-9_]', '_', body.name.lower().strip())
    base_id = org_id
    counter = 1
    while org_id in organizations_db["organizations"]:
        org_id = f"{base_id}_{counter}"
        counter += 1

    organizations_db["organizations"][org_id] = {
        "name": body.name.strip(),
        "description": body.description.strip(),
        "color": body.color,
        "tags": body.tags,
        "folders": body.folders,
        "created_at": datetime.now().isoformat(),
        "is_system": False,
    }
    save_organizations()
    return {"id": org_id, "name": body.name.strip(), "status": "created"}


@app.put("/api/organizations/{org_id}")
async def update_organization(org_id: str, body: UpdateOrgRequest):
    """Update an organization."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")
    org = organizations_db["organizations"][org_id]
    if body.name is not None:
        org["name"] = body.name.strip()
    if body.description is not None:
        org["description"] = body.description.strip()
    if body.color is not None:
        org["color"] = body.color
    if body.tags is not None:
        org["tags"] = body.tags
    if body.folders is not None:
        org["folders"] = body.folders
    save_organizations()
    return {"status": "updated", "id": org_id}


@app.post("/api/organizations/{org_id}/folders")
async def create_org_folder(org_id: str, body: FolderCreateRequest):
    """Create a new folder/portfolio inside an organization."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")
    org = organizations_db["organizations"][org_id]
    if "folders" not in org:
        org["folders"] = []
    folder_name = body.name.strip()
    if folder_name and folder_name not in org["folders"]:
        org["folders"].append(folder_name)
        save_organizations()
    return {"status": "created", "folder": folder_name, "folders": org["folders"]}


@app.delete("/api/organizations/{org_id}/folders/{folder_name:path}")
async def delete_org_folder_path(org_id: str, folder_name: str):
    """Delete a folder/portfolio from an organization (unfolders its documents)."""
    return await _do_delete_folder(org_id, folder_name)


@app.post("/api/organizations/{org_id}/folders/delete")
async def delete_org_folder_post(org_id: str, body: FolderDeleteRequest):
    """Delete a folder/portfolio from an organization via POST body."""
    return await _do_delete_folder(org_id, body.name)


async def _do_delete_folder(org_id: str, raw_folder_name: str):
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    target_folder = urllib.parse.unquote(raw_folder_name).strip()
    org = organizations_db["organizations"][org_id]

    if "folders" in org:
        org["folders"] = [
            f for f in org["folders"]
            if f.strip() != target_folder and urllib.parse.unquote(f).strip() != target_folder
        ]

    # Clear folder from docs in this org
    for filename, assignment in organizations_db["document_assignments"].items():
        if assignment.get("org_id") == org_id:
            curr_folder = assignment.get("folder", "")
            if curr_folder and (curr_folder.strip() == target_folder or urllib.parse.unquote(curr_folder).strip() == target_folder):
                assignment["folder"] = ""

    save_organizations()
    return {"status": "deleted", "folder": target_folder}


@app.delete("/api/organizations/{org_id}")
async def delete_organization(org_id: str):
    """Delete an organization and reassign its docs to Unassigned."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org_id == "__unassigned__":
        raise HTTPException(status_code=400, detail="Cannot delete system organization")

    # Reassign documents to unassigned
    for filename, assignment in organizations_db["document_assignments"].items():
        if assignment.get("org_id") == org_id:
            assignment["org_id"] = "__unassigned__"
            assignment["folder"] = ""

    del organizations_db["organizations"][org_id]
    save_organizations()
    return {"status": "deleted"}


@app.get("/api/organizations/{org_id}/documents")
async def get_org_documents(org_id: str):
    """Get all documents in an organization with their folder/portfolio."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    docs = []
    for filename, assignment in organizations_db["document_assignments"].items():
        if assignment.get("org_id") == org_id:
            doc_info = processed_documents.get(filename, {})
            docs.append({
                "name": filename,
                "chunk_count": doc_info.get("chunk_count", 0),
                "char_count": doc_info.get("char_count", 0),
                "file_type": doc_info.get("file_type", filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"),
                "folder": assignment.get("folder", ""),
                "tags": assignment.get("tags", []),
                "doc_type": assignment.get("doc_type", "other"),
                "assigned_at": assignment.get("assigned_at", ""),
                "auto_detected": assignment.get("auto_detected", False),
            })
    return docs


@app.post("/api/documents/{filename}/assign")
async def assign_document(filename: str, body: AssignDocRequest):
    """Assign a document to an organization with folder/portfolio and tags."""
    if filename not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing_assignment = organizations_db["document_assignments"].get(filename, {})
    folder = body.folder.strip() if body.folder else existing_assignment.get("folder", "")

    organizations_db["document_assignments"][filename] = {
        "org_id": body.org_id,
        "folder": folder,
        "tags": body.tags,
        "doc_type": body.doc_type or existing_assignment.get("doc_type", "other"),
        "assigned_at": datetime.now().isoformat(),
        "auto_detected": False,
    }

    # Record folder in org's folder list if not empty
    if folder and body.org_id in organizations_db["organizations"]:
        org = organizations_db["organizations"][body.org_id]
        if "folders" not in org:
            org["folders"] = []
        if folder not in org["folders"]:
            org["folders"].append(folder)

    save_organizations()
    return {"status": "assigned", "org_id": body.org_id, "folder": folder}


@app.put("/api/documents/{filename}/folder")
async def move_document_folder(filename: str, body: MoveFolderRequest):
    """Move a document to a specific folder/portfolio."""
    if filename not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    folder = body.folder.strip()
    if filename not in organizations_db["document_assignments"]:
        organizations_db["document_assignments"][filename] = {
            "org_id": "__unassigned__",
            "folder": folder,
            "tags": [],
            "doc_type": "other",
            "assigned_at": datetime.now().isoformat(),
            "auto_detected": False,
        }
    else:
        assignment = organizations_db["document_assignments"][filename]
        assignment["folder"] = folder
        org_id = assignment.get("org_id")
        if org_id and org_id in organizations_db["organizations"] and folder:
            org = organizations_db["organizations"][org_id]
            if "folders" not in org:
                org["folders"] = []
            if folder not in org["folders"]:
                org["folders"].append(folder)

    save_organizations()
    return {"status": "success", "filename": filename, "folder": folder}


@app.post("/api/documents/{filename}/detect-org")
async def detect_document_organization(filename: str):
    """Use AI to detect which organization a document belongs to."""
    if filename not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    text = processed_documents[filename].get("text", "")
    if not text:
        # Try to extract
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            if ext == "pdf":
                reader = pypdf.PdfReader(file_path)
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
            elif ext in IMAGE_EXTENSIONS:
                text = await extract_text_from_image(file_path)
            else:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()

    result = await ai_detect_organization(filename, text)
    return result


@app.get("/api/documents/{filename}/assignment")
async def get_document_assignment(filename: str):
    """Get the organization assignment for a document."""
    assignment = organizations_db["document_assignments"].get(filename)
    if not assignment:
        return {"assigned": False, "org_id": None, "folder": "", "tags": []}

    org = organizations_db["organizations"].get(assignment["org_id"], {})
    return {
        "assigned": True,
        "org_id": assignment["org_id"],
        "org_name": org.get("name", "Unknown"),
        "org_color": org.get("color", "#6b7280"),
        "folder": assignment.get("folder", ""),
        "tags": assignment.get("tags", []),
        "doc_type": assignment.get("doc_type", "other"),
        "auto_detected": assignment.get("auto_detected", False),
    }


@app.post("/api/documents/note")
async def create_note_document(req: CreateNoteRequest):
    """
    Creates a new text/WhatsApp note document directly, vectorizes it, 
    and assigns it to an organization & folder.
    """
    if not req.title.strip() or not req.content.strip():
        raise HTTPException(status_code=400, detail="Başlık ve içerik gereklidir")

    clean_title = re.sub(r'[^a-zA-Z0-9_\-çğıöşüÇĞİÖŞÜ\s]', '', req.title.strip()).replace(' ', '_')
    if not clean_title:
        clean_title = f"not_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    filename = f"{clean_title}.txt"
    counter = 1
    file_path = UPLOAD_DIR / filename
    while file_path.exists():
        filename = f"{clean_title}_{counter}.txt"
        file_path = UPLOAD_DIR / filename
        counter += 1

    final_content = req.content
    if req.format_with_ai:
        try:
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
            prompt = (
                "Aşağıda bir WhatsApp mesajlaşması, ses dökümü veya hızlı tutulmuş bir portföy notu bulunmaktadır.\n"
                "Bu metni RAG yapay zeka sistemi ve kullanıcı için son derece anlaşılır, madde madde düzenlenmiş bir Portföy Notu haline getir.\n\n"
                "Kurallar:\n"
                "1. En üste açıklayıcı bir '# Portföy / Görüşme Özeti' başlığı koy.\n"
                "2. İrtibat kişileri, telefonlar, fiyatlar, tarihler, adres/lokasyon, şartlar ve talepleri madde madde (bullet points) ve net başlıklarla listele.\n"
                "3. En alta '---\\n### Orijinal Metin / Mesaj Dökümü\\n' başlığı altında orijinal metni de ekle.\n"
                "4. Yanıtı yalnızca Türkçe ver.\n\n"
                f"Metin:\n{req.content}"
            )
            ai_res = await llm.ainvoke(prompt)
            if ai_res.content and ai_res.content.strip():
                final_content = ai_res.content.strip()
        except Exception as e:
            print(f"[create_note] AI format warning: {e}")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(final_content)

    pages_data = [(1, final_content)]
    chunks, chunk_details = chunk_by_sections_or_paragraphs(pages_data)

    all_metadatas = [
        {
            "source": filename,
            "chunk_index": d["index"],
            "total_chunks": len(chunks),
            "page": 1,
            "title": d.get("title", req.title)
        }
        for d in chunk_details
    ]

    vector_store.add_texts(texts=chunks, metadatas=all_metadatas)

    processed_documents[filename] = {
        "text": final_content,
        "chunks": chunks,
        "chunk_details": chunk_details,
        "char_count": len(final_content),
        "chunk_count": len(chunks),
        "file_type": "txt",
    }

    org_id = req.org_id if req.org_id and req.org_id in organizations_db["organizations"] else None
    if not org_id and req.org_id != "__unassigned__":
        ai_result = await ai_detect_organization(filename, final_content)
        if ai_result.get("confidence") == "high" and ai_result.get("suggested_org_id"):
            org_id = ai_result["suggested_org_id"]

    tags = req.tags if req.tags else ([req.doc_type] if req.doc_type else ["whatsapp"])
    organizations_db["document_assignments"][filename] = {
        "org_id": org_id or "__unassigned__",
        "folder": req.folder.strip() if req.folder else "",
        "tags": tags,
        "doc_type": req.doc_type or "whatsapp",
        "assigned_at": datetime.now().isoformat(),
        "auto_detected": False,
    }
    save_organizations()

    return {
        "filename": filename,
        "char_count": len(final_content),
        "chunk_count": len(chunks),
        "org_id": org_id or "__unassigned__",
        "folder": req.folder.strip() if req.folder else "",
        "doc_type": req.doc_type or "whatsapp",
    }


def rename_doc_internal(old_name: str, new_name_raw: str) -> str:
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


@app.post("/api/documents/{filename}/rename")
async def rename_document_endpoint(filename: str, req: RenameDocRequest):
    new_name = rename_doc_internal(filename, req.new_name)
    return {"status": "success", "old_name": filename, "new_name": new_name}


@app.post("/api/batch-analyze")
async def batch_analyze_documents(req: BatchAnalyzeRequest):
    if not req.filenames:
        raise HTTPException(status_code=400, detail="Filenames required")

    existing_orgs = [
        {"id": oid, "name": org["name"], "description": org.get("description", ""), "folders": org.get("folders", [])}
        for oid, org in organizations_db["organizations"].items()
        if not org.get("is_system", False)
    ]

    files_context = []
    for fname in req.filenames:
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
            "preview": text[:2500] if text else "İçerik okunamadı."
        })

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = f"""Sen üst düzey bir gayrimenkul, portföy ve kurumsal doküman arşiv uzmanısın.
Kullanıcı sisteme dosya(lar) yüklüyor. Amacın KULLANICIYA HİÇBİR MANUEL İŞ BIRAKMADAN tüm dosyaları doğru kuruma, doğru portföy klasörüne, temiz Türkçe dosya isimlerine ve zengin etiketlere otomatik bağlamaktır.

MEVCUT KURUMLAR VE MEVCUT KLASÖRLERİ:
{json.dumps(existing_orgs, ensure_ascii=False, indent=2)}

YÜKLENEN DOSYALARIN METİN ÖZETLERİ ({len(req.filenames)} adet):
{json.dumps(files_context, ensure_ascii=False, indent=2)}

ANALİZ VE OTOMATİK DÜZENLEME KURALLARI:
1. KURUM EŞLEŞTİRMESİ (ÇOK ÖNEMLİ):
   - Dosya içeriklerindeki kişi isimleri, şirket unvanları, antetler, WhatsApp konuşmacı adları veya imzalara bak.
   - Eğer içerik Mevcut Kurumlar listesindeki bir kurumla (örneğin "Nuran Hanım", "Bassel Group" vb.) uyuşuyorsa veya kısmen geçiyorsa ("Nuran", "Bassel", vb.), "suggested_org_id" alanına o kurumun ID'sini mutlaka yaz.
   - Eğer tamamen yeni bir kurum veya şahıs ise "suggested_org_id": null yap ve "suggested_org_name" alanına temiz kurum adını yaz.

2. PORTFÖY / KLASÖR ADLANDIRMA (ÇOK KRİTİK - TAŞINMAZ / LOKASYON AYRIMI):
   - Her farklı arsa, daire, il/ilçe, mahalle, proje veya ada-parsel AYRI BİR PORTFÖY KLASÖRÜDÜR.
   - DİKKAT: Kurum aynı olsa bile (örneğin "Nuran Hanım"), eğer o kurumun mevcut klasörleri (örn: "İzmir Dikili") ile yüklenen yeni dosyaların lokasyonu/konusu (örn: "Silivri Arsa", "Kadıköy Daire", "Bodrum Villa") FARKLı ise, ASLA eski klasörün adını verme! Mutlaka o yeni taşınmaza özel YENİ BİR KLASÖR ADI OLUŞTUR (örn: "İstanbul Silivri Arsa" veya "Silivri Selimpaşa Portföyü").
   - Yalnızca ve yalnızca yüklenen evraklar mevcut bir klasördeki taşınmazın aynısına (örneğin yine Dikili arsasının yeni bir tapusu/yazışması) aitse o mevcut klasör adını ver.
   - Eğer yeni bir taşınmaz ise, dosyalarda geçen İl / İlçe / Mahalle / Proje ve Gayrimenkul tipini içeren net, şık bir portföy klasör adı üret (örn: "Silivri Arsa Portföyü", "Kadıköy 3+1 Daire").

3. DOSYA İSİMLERİNİ TEMİZLEME:
   - "Ekran Resmi 2026-...", "IMG_4021.PNG", "scan_1.pdf" gibi anlamsız isimleri YASAKLA.
   - Her dosyanın içeriğini tam yansıtan Türkçe, net ve alt çizgili dosya adı üret (örn: "1_Silivri_Tapu_Senedi.png", "2_Silivri_Imar_Krokisi.pdf", "3_Silivri_WhatsApp_Notu.png").

4. ZENGİN OTOMATİK ETİKETLER (Kullanıcı etiketle uğraşmasın):
   - İçeriğe göre 2-4 adet net Türkçe etiket üret: ["tapu", "imar", "silivri", "arsa", "sozlesme", "whatsapp_notu"] gibi.

5. ÖZET:
   - "batch_summary": Yapay zekanın ne tespit ettiğini kullanıcıya 1 cümlede bildiren kibar ve net Türkçe açıklama.

Yanıtı kesinlikle bu JSON şemasında ver:
{{
  "is_portfolio_batch": true/false,
  "suggested_org_id": "<eşleşen kurum ID veya null>",
  "suggested_org_name": "<kurum adı>",
  "suggested_folder": "<taşınmaza/lokasyona özel net portföy/klasör adı>",
  "confidence": "high/medium/low",
  "batch_summary": "<1 cümlelik açıklama>",
  "file_renames": {{
    "orijinal_adi.ext": "1_Temiz_Dosya_Adi.ext"
  }},
  "suggested_tags": ["etiket1", "etiket2", "etiket3"]
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
            "is_portfolio_batch": len(req.filenames) > 1,
            "suggested_org_id": None,
            "suggested_org_name": None,
            "suggested_folder": "Yeni Portföy" if len(req.filenames) > 1 else "",
            "confidence": "low",
            "batch_summary": "Dosyalar toplu olarak hazırlandı.",
            "file_renames": {f: f for f in req.filenames},
            "suggested_tags": ["portföy"]
        }


@app.post("/api/batch-commit")
async def batch_commit_assignment(req: BatchCommitRequest):
    """
    Atomically renames files to their clean descriptive names,
    creates the target folder in the organization (if not existing),
    and assigns all files to that organization & folder.
    """
    target_org_id = req.org_id

    # If new org name provided and no existing org_id
    if not target_org_id and req.org_name:
        new_org_id = str(uuid.uuid4())[:8]
        organizations_db["organizations"][new_org_id] = {
            "id": new_org_id,
            "name": req.org_name.strip(),
            "description": "",
            "color": "#6366f1",
            "tags": req.tags or [],
            "folders": [req.folder.strip()] if req.folder and req.folder.strip() else [],
            "created_at": datetime.now().isoformat(),
            "is_system": False,
        }
        target_org_id = new_org_id
    elif target_org_id and target_org_id in organizations_db["organizations"]:
        org = organizations_db["organizations"][target_org_id]
        if req.folder and req.folder.strip():
            if "folders" not in org:
                org["folders"] = []
            if req.folder.strip() not in org["folders"]:
                org["folders"].append(req.folder.strip())

    save_organizations()

    results = []
    for old_name, new_name in req.file_renames.items():
        actual_name = rename_doc_internal(old_name, new_name)
        organizations_db["document_assignments"][actual_name] = {
            "org_id": target_org_id or "__unassigned__",
            "folder": req.folder.strip() if req.folder else "",
            "tags": req.tags or [],
            "doc_type": "portfolio" if len(req.file_renames) > 1 else "document",
            "assigned_at": datetime.now().isoformat(),
            "auto_detected": False,
        }
        results.append({
            "old_name": old_name,
            "new_name": actual_name,
            "org_id": target_org_id,
            "folder": req.folder.strip() if req.folder else "",
        })

    save_organizations()
    return {"status": "success", "results": results, "org_id": target_org_id}


@app.post("/api/upload")

async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    file_path = UPLOAD_DIR / file.filename
    content = await file.read()

    with open(file_path, "wb") as f:
        f.write(content)

    file_type = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "unknown"
    return {"filename": file.filename, "size": len(content), "file_type": file_type}


# ── Process document (SSE stream) ────────────────────────────────

async def process_document_generator(filename: str):
    """Async generator that yields SSE events for each pipeline step."""

    def make_event(step: str, status: str, message: str, progress: int, extra: dict = None):
        payload = {"step": step, "status": status, "message": message, "progress": progress}
        if extra:
            payload.update(extra)
        return {"data": json.dumps(payload)}

    # Step 1: upload received
    yield make_event("upload_received", "done", "File received", 10)
    await asyncio.sleep(0.2)

    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        yield make_event("upload_received", "error", f"File {filename} not found", 10)
        return

    file_type = filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"

    # Step 2: queued
    yield make_event("queued", "done", "Queued for processing", 20)
    await asyncio.sleep(0.2)

    try:
        # Step 3: cleaning / partitioning
        yield make_event("cleaning", "in_progress", "Cleaning & extracting text...", 35)

        # Extract raw page contents
        pages_data = []
        if file_type == "pdf":
            reader = pypdf.PdfReader(file_path)
            for page_idx, page in enumerate(reader.pages):
                pages_data.append((page_idx + 1, page.extract_text() or ""))
        elif file_type == "txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                pages_data.append((1, f.read()))
        elif file_type in IMAGE_EXTENSIONS:
            yield make_event("cleaning", "in_progress", "Transcribing image using AI Vision (OCR)...", 35)
            extracted_text = await extract_text_from_image(file_path)
            pages_data.append((1, extracted_text))
        else:
            yield make_event("cleaning", "error", f"Unsupported file type: {file_type}", 35)
            return

        yield make_event("cleaning", "done", f"Extracted {len(pages_data)} pages", 40)
        await asyncio.sleep(0.2)

        # Step 4: title-aware and sentence-preserving chunking
        yield make_event("chunking", "in_progress", "Splitting by sections & titles...", 55)
        chunks, chunk_details = chunk_by_sections_or_paragraphs(pages_data)
        text = '\n\n'.join(p[1] for p in pages_data)

        all_metadatas = [
            {
                "source": filename,
                "chunk_index": d["index"],
                "total_chunks": len(chunks),
                "page": d.get("page", 1),
                "title": d.get("title", "")
            }
            for d in chunk_details
        ]

        yield make_event("cleaning", "done", f"Cleaned — {len(text):,} chars", 40)
        await asyncio.sleep(0.2)

        # Step 4: chunking
        yield make_event("chunking", "done", f"Created {len(chunks)} chunks", 65)
        await asyncio.sleep(0.2)

        # Step 5: vectorization
        yield make_event("vectorization", "in_progress", f"Embedding {len(chunks)} chunks...", 75)
        total_chunks = len(chunks)
        for m in all_metadatas:
            m["total_chunks"] = total_chunks

        vector_store.add_texts(texts=chunks, metadatas=all_metadatas)

        processed_documents[filename] = {
            "text": text,
            "chunks": chunks,
            "chunk_details": chunk_details,
            "char_count": len(text),
            "chunk_count": total_chunks,
            "file_type": file_type,
        }

        yield make_event("vectorization", "done", f"Stored {total_chunks} vectors", 90)
        await asyncio.sleep(0.1)

        # Step 6: AI organization detection
        yield make_event("organizing", "in_progress", "AI detecting organization...", 93)
        ai_result = await ai_detect_organization(filename, text)

        org_detection = {
            "suggested_org_id": ai_result.get("suggested_org_id"),
            "suggested_org_name": ai_result.get("suggested_org_name"),
            "confidence": ai_result.get("confidence", "low"),
            "reasoning": ai_result.get("reasoning", ""),
            "suggested_tags": ai_result.get("suggested_tags", []),
            "doc_type": ai_result.get("doc_type", "other"),
        }

        # If high confidence and org exists, auto-assign
        if ai_result.get("confidence") == "high" and ai_result.get("suggested_org_id"):
            org_id = ai_result["suggested_org_id"]
            if org_id in organizations_db["organizations"]:
                organizations_db["document_assignments"][filename] = {
                    "org_id": org_id,
                    "tags": ai_result.get("suggested_tags", []),
                    "doc_type": ai_result.get("doc_type", "other"),
                    "assigned_at": datetime.now().isoformat(),
                    "auto_detected": True,
                }
                save_organizations()
                org_detection["auto_assigned"] = True
                org_detection["assigned_org_name"] = organizations_db["organizations"][org_id]["name"]

        yield make_event("organizing", "done", "Organization detected", 96, {"org_detection": org_detection})
        await asyncio.sleep(0.1)

        # Done
        yield make_event("done", "success", f"Pipeline complete — {total_chunks} chunks", 100, {"org_detection": org_detection})

    except Exception as e:
        yield make_event("error", "error", f"Error: {str(e)}", 100)


@app.get("/api/process/{filename}")
@app.post("/api/process/{filename}")
async def process_file(filename: str):
    return EventSourceResponse(process_document_generator(filename))


# ── Documents ────────────────────────────────────────────────────

@app.get("/api/documents")
async def get_documents():
    result = []
    for name, info in processed_documents.items():
        assignment = organizations_db["document_assignments"].get(name, {})
        org_id = assignment.get("org_id")
        org = organizations_db["organizations"].get(org_id, {}) if org_id else {}

        result.append({
            "name": name,
            "chunk_count": info.get("chunk_count", 0),
            "char_count": info.get("char_count", 0),
            "file_type": info.get("file_type", "unknown"),
            "org_id": org_id,
            "org_name": org.get("name", ""),
            "org_color": org.get("color", "#6b7280"),
            "folder": assignment.get("folder", ""),
            "tags": assignment.get("tags", []),
            "doc_type": assignment.get("doc_type", ""),
        })
    return result


def get_accurate_page_for_chunk(chunk_text: str, page_texts: List[tuple]) -> int:
    """
    Given a chunk text, finds the exact page number (1-indexed) in page_texts [(1, '...'), (2, '...'), ...]
    where this chunk content appears.
    """
    clean_chunk = re.sub(r'^##\s+[^\n]+\n*', '', chunk_text).strip()
    if not clean_chunk:
        clean_chunk = chunk_text.strip()

    clean_chunk_lower = clean_text(clean_chunk).lower()
    norm_chunk = ' '.join(clean_chunk_lower.split())

    snippets = [
        norm_chunk[:60] if len(norm_chunk) >= 60 else norm_chunk,
        norm_chunk[len(norm_chunk)//2 : len(norm_chunk)//2 + 60] if len(norm_chunk) >= 120 else '',
        norm_chunk[-60:] if len(norm_chunk) >= 60 else '',
    ]

    for snippet in snippets:
        if not snippet or len(snippet) < 15:
            continue
        for page_num, p_text in page_texts:
            norm_p_text = ' '.join(clean_text(p_text).lower().split())
            if snippet in norm_p_text:
                return page_num

    words = [w for w in norm_chunk.split() if len(w) > 4]
    if words:
        best_page = 1
        max_hits = 0
        for page_num, p_text in page_texts:
            norm_p_text = clean_text(p_text).lower()
            hits = sum(1 for w in words if w in norm_p_text)
            if hits > max_hits:
                max_hits = hits
                best_page = page_num
        if max_hits >= 2:
            return best_page

    return 1


@app.get("/api/documents/{filename}/chunks")
async def get_document_chunks(filename: str, search: Optional[str] = None):
    if filename not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    raw_chunks = processed_documents[filename].get("chunks", [])
    raw_details = processed_documents[filename].get("chunk_details", [])

    file_path = UPLOAD_DIR / filename
    is_pdf = filename.lower().endswith(".pdf")

    # If it is a PDF, ensure exact page numbers for every single chunk
    if is_pdf and file_path.exists():
        try:
            reader = pypdf.PdfReader(file_path)
            page_texts = [
                (idx + 1, page.extract_text() or "")
                for idx, page in enumerate(reader.pages)
            ]

            enriched_details = []
            for i, chunk in enumerate(raw_chunks):
                title = raw_details[i].get("title", f"Chunk #{i}") if i < len(raw_details) else f"Chunk #{i}"
                detected_page = get_accurate_page_for_chunk(chunk, page_texts)
                enriched_details.append({
                    "text": chunk,
                    "title": title,
                    "page": detected_page,
                    "index": i
                })

            raw_details = enriched_details
            processed_documents[filename]["chunk_details"] = enriched_details
        except Exception as e:
            print(f"[page_detector] Error scanning PDF pages: {e}")

    if not raw_details:
        raw_details = [{"text": c, "page": 1, "index": i} for i, c in enumerate(raw_chunks)]

    if search:
        kw = search.lower()
        filtered_chunks = []
        filtered_details = []
        for c, d in zip(raw_chunks, raw_details):
            if kw in c.lower():
                filtered_chunks.append(c)
                filtered_details.append(d)
        return {"chunks": filtered_chunks, "details": filtered_details}

    return {"chunks": raw_chunks, "details": raw_details}


@app.get("/api/documents/{filename}/file")
async def get_document_file(filename: str):
    """Serve the raw file directly (PDF/TXT/Images) for in-browser viewer."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        media_type = "application/pdf"
    elif ext in IMAGE_EXTENSIONS:
        media_type = f"image/{'jpeg' if ext == 'jpg' else ext}"
    else:
        media_type = "text/plain"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=filename,
        content_disposition_type="inline"
    )


@app.get("/api/documents/{filename}/content")
async def get_document_content(filename: str):
    """Return full extracted document text and page-by-page content for high-precision viewing and highlighting."""
    file_path = UPLOAD_DIR / filename
    full_text = ""
    pages_list = []

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"

    if file_path.exists():
        if ext == "pdf":
            try:
                reader = pypdf.PdfReader(file_path)
                for idx, page in enumerate(reader.pages):
                    p_text = page.extract_text() or ""
                    pages_list.append({
                        "page": idx + 1,
                        "text": p_text
                    })
                full_text = "\n\n--- Page Break ---\n\n".join(p["text"] for p in pages_list)
            except Exception as e:
                full_text = f"Error reading PDF: {e}"
                pages_list = [{"page": 1, "text": full_text}]
        elif ext in IMAGE_EXTENSIONS:
            try:
                full_text = await extract_text_from_image(file_path)
                pages_list = [{"page": 1, "text": full_text}]
            except Exception as e:
                full_text = f"Error reading image: {e}"
                pages_list = [{"page": 1, "text": full_text}]
        else:
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    full_text = f.read()
                pages_list = [{"page": 1, "text": full_text}]
            except Exception as e:
                full_text = f"Error reading file: {e}"
                pages_list = [{"page": 1, "text": full_text}]
    elif filename in processed_documents and processed_documents[filename].get("text"):
        full_text = processed_documents[filename]["text"]
        pages_list = [{"page": 1, "text": full_text}]

    if not full_text and filename not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "name": filename,
        "content": full_text,
        "pages": pages_list,
        "total_pages": len(pages_list),
        "file_type": ext
    }


@app.delete("/api/documents/{filename}")
async def delete_document(filename: str):
    """Delete document from in-memory state and chroma database."""
    global processed_documents
    try:
        data = vector_store.get()
        ids_to_delete = []
        for doc_id, meta in zip(data.get("ids", []), data.get("metadatas", [])):
            if meta.get("source") == filename:
                ids_to_delete.append(doc_id)
        if ids_to_delete:
            vector_store.delete(ids=ids_to_delete)

        if filename in processed_documents:
            del processed_documents[filename]

        # Remove from org assignments
        if filename in organizations_db["document_assignments"]:
            del organizations_db["document_assignments"][filename]
            save_organizations()

        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()

        return {"status": "success", "deleted_vectors": len(ids_to_delete)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/batch-delete")
async def batch_delete_documents(req: BatchDeleteRequest):
    """Atomically delete multiple documents from vector store, metadata, and disk."""
    global processed_documents
    try:
        data = vector_store.get()
        files_set = set(req.filenames)
        ids_to_delete = [
            doc_id for doc_id, meta in zip(data.get("ids", []), data.get("metadatas", []))
            if meta.get("source") in files_set
        ]
        if ids_to_delete:
            vector_store.delete(ids=ids_to_delete)

        deleted = []
        for filename in req.filenames:
            if filename in processed_documents:
                del processed_documents[filename]
            if filename in organizations_db["document_assignments"]:
                del organizations_db["document_assignments"][filename]
            file_path = UPLOAD_DIR / filename
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception as ex:
                    print(f"[batch_delete] File unlink error: {ex}")
            deleted.append(filename)

        save_organizations()
        return {"status": "success", "deleted_count": len(deleted), "deleted_files": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/batch-move")
async def batch_move_documents(req: BatchMoveRequest):
    """Atomically move multiple documents to a target organization and/or folder."""
    try:
        updated = []
        for filename in req.filenames:
            if filename in organizations_db["document_assignments"]:
                assignment = organizations_db["document_assignments"][filename]
                if req.target_org_id is not None:
                    assignment["org_id"] = req.target_org_id
                if req.target_folder is not None:
                    assignment["folder"] = req.target_folder.strip()
                updated.append(filename)
            else:
                organizations_db["document_assignments"][filename] = {
                    "org_id": req.target_org_id or "__unassigned__",
                    "folder": req.target_folder.strip() if req.target_folder else "",
                    "tags": [],
                    "doc_type": "document",
                    "assigned_at": datetime.now().isoformat(),
                    "auto_detected": False,
                }
                updated.append(filename)

        # Add folder to target org if needed
        if req.target_org_id and req.target_org_id in organizations_db["organizations"] and req.target_folder and req.target_folder.strip():
            org = organizations_db["organizations"][req.target_org_id]
            if "folders" not in org:
                org["folders"] = []
            if req.target_folder.strip() not in org["folders"]:
                org["folders"].append(req.target_folder.strip())

        save_organizations()
        return {"status": "success", "updated_count": len(updated), "updated_files": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/{filename}/reprocess")
async def reprocess_document(filename: str):
    """Re-chunk an existing document using smart paragraph- and sentence-preserving rules."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_type = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    pages_data = []
    if file_type == "pdf":
        reader = pypdf.PdfReader(file_path)
        for page_idx, page in enumerate(reader.pages):
            pages_data.append((page_idx + 1, page.extract_text() or ""))
    elif file_type == "txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            pages_data.append((1, f.read()))
    elif file_type in IMAGE_EXTENSIONS:
        extracted = await extract_text_from_image(file_path)
        pages_data.append((1, extracted))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    chunks, chunk_details = chunk_by_sections_or_paragraphs(pages_data)
    text = '\n\n'.join(p[1] for p in pages_data)

    total_chunks = len(chunks)
    all_metadatas = [
        {
            "source": filename,
            "chunk_index": d["index"],
            "total_chunks": total_chunks,
            "page": d.get("page", 1),
            "title": d.get("title", "")
        }
        for d in chunk_details
    ]

    # Delete previous vectors from Chroma
    data = vector_store.get()
    ids_to_delete = [
        doc_id for doc_id, meta in zip(data.get("ids", []), data.get("metadatas", []))
        if meta.get("source") == filename
    ]
    if ids_to_delete:
        vector_store.delete(ids=ids_to_delete)

    # Insert new vectors
    vector_store.add_texts(texts=chunks, metadatas=all_metadatas)

    processed_documents[filename] = {
        "text": text,
        "chunks": chunks,
        "chunk_details": chunk_details,
        "char_count": len(text),
        "chunk_count": total_chunks,
        "file_type": file_type,
    }

    return {"status": "success", "chunk_count": total_chunks}


# ── Chat ─────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str


@app.post("/api/chat")
async def chat_endpoint(body: ChatMessage):
    global chat_history
    query = body.message
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    # Rewrite query if there's history
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
        rw = llm.invoke(rewrite_msgs)
        search_query = rw.content.strip()

    # Retrieve
    docs = vector_store.similarity_search(search_query, k=6)

    # Build context with organization info
    ctx_parts = []
    for d in docs:
        source = d.metadata.get("source", "unknown")
        assignment = organizations_db["document_assignments"].get(source, {})
        org_id = assignment.get("org_id")
        org_name = organizations_db["organizations"].get(org_id, {}).get("name", "Unassigned") if org_id else "Unassigned"
        page = d.metadata.get("page", "?")
        chunk_idx = d.metadata.get("chunk_index", "?")
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

    result = llm.invoke(messages)
    answer = result.content

    # Update history
    chat_history.append(HumanMessage(content=query))
    chat_history.append(AIMessage(content=answer))

    # Collect enriched sources
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

    return {"answer": answer, "sources": sources}


@app.get("/api/chat/history")
async def get_chat_history():
    formatted = []
    for msg in chat_history:
        if isinstance(msg, HumanMessage):
            formatted.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            formatted.append({"role": "assistant", "content": msg.content})
    return {"history": formatted}


@app.delete("/api/chat/history")
async def clear_chat():
    global chat_history
    chat_history.clear()
    return {"status": "success"}


# ── Stats ────────────────────────────────────────────────────────

@app.get("/api/stats")
async def get_stats():
    try:
        total_vectors = vector_store._collection.count()
    except Exception:
        total_vectors = 0

    return {
        "total_documents": len(processed_documents),
        "total_vectors": total_vectors,
        "total_organizations": len(organizations_db["organizations"]),
    }
