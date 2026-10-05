import re
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional, List
from pathlib import Path
import pypdf

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse
from langchain_openai import ChatOpenAI

from config import UPLOAD_DIR, IMAGE_EXTENSIONS
from database import (
    organizations_db,
    processed_documents,
    vector_store,
    save_organizations,
)
from models.documents import (
    AssignDocRequest,
    MoveFolderRequest,
    RenameDocRequest,
    CreateNoteRequest,
    BatchAnalyzeRequest,
    BatchCommitRequest,
    BatchDeleteRequest,
    BatchMoveRequest,
)
from services.ocr_service import extract_text_from_image
from services.text_service import (
    clean_text,
    chunk_by_sections_or_paragraphs,
    get_accurate_page_for_chunk,
)
from services.org_service import (
    ai_detect_organization,
    analyze_batch_for_smart_organization,
    rename_doc_internal,
)

router = APIRouter(tags=["Documents"])


# ── Ingestion & Upload ───────────────────────────────────────────

@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_path = UPLOAD_DIR / file.filename
    content = await file.read()

    with open(file_path, "wb") as f:
        f.write(content)

    file_type = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "unknown"
    return {"filename": file.filename, "size": len(content), "file_type": file_type}


async def process_document_generator(filename: str):
    """Async generator that yields SSE events for each pipeline step."""
    def make_event(step: str, status: str, message: str, progress: int, extra: dict = None):
        payload = {"step": step, "status": status, "message": message, "progress": progress}
        if extra:
            payload.update(extra)
        return {"data": json.dumps(payload)}

    yield make_event("upload_received", "done", "File received", 10)
    await asyncio.sleep(0.2)

    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        yield make_event("upload_received", "error", f"File {filename} not found", 10)
        return

    file_type = filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"

    yield make_event("queued", "done", "Queued for processing", 20)
    await asyncio.sleep(0.2)

    try:
        yield make_event("cleaning", "in_progress", "Cleaning & extracting text...", 35)

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

        yield make_event("chunking", "done", f"Created {len(chunks)} chunks", 65)
        await asyncio.sleep(0.2)

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

        yield make_event("done", "success", f"Pipeline complete — {total_chunks} chunks", 100, {"org_detection": org_detection})

    except Exception as e:
        yield make_event("error", "error", f"Error: {str(e)}", 100)


@router.get("/api/process/{filename}")
@router.post("/api/process/{filename}")
async def process_file(filename: str):
    return EventSourceResponse(process_document_generator(filename))


# ── Document Queries & Details ───────────────────────────────────

@router.get("/api/documents")
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
            "assigned_at": assignment.get("assigned_at", ""),
        })
    return result


@router.get("/api/documents/{filename}/chunks")
async def get_document_chunks(filename: str, search: Optional[str] = None):
    if filename not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    raw_chunks = processed_documents[filename].get("chunks", [])
    raw_details = processed_documents[filename].get("chunk_details", [])

    file_path = UPLOAD_DIR / filename
    is_pdf = filename.lower().endswith(".pdf")

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


@router.get("/api/documents/{filename}/file")
async def get_document_file(filename: str):
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


@router.get("/api/documents/{filename}/content")
async def get_document_content(filename: str):
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


# ── Document Assignments & Organization ──────────────────────────

@router.post("/api/documents/{filename}/assign")
async def assign_document(filename: str, body: AssignDocRequest):
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

    if folder and body.org_id in organizations_db["organizations"]:
        org = organizations_db["organizations"][body.org_id]
        if "folders" not in org:
            org["folders"] = []
        if folder not in org["folders"]:
            org["folders"].append(folder)

    save_organizations()
    return {"status": "assigned", "org_id": body.org_id, "folder": folder}


@router.put("/api/documents/{filename}/folder")
async def move_document_folder(filename: str, body: MoveFolderRequest):
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


@router.post("/api/documents/{filename}/detect-org")
async def detect_document_organization(filename: str):
    if filename not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    text = processed_documents[filename].get("text", "")
    if not text:
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


@router.get("/api/documents/{filename}/assignment")
async def get_document_assignment(filename: str):
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


@router.post("/api/documents/{filename}/rename")
async def rename_document_endpoint(filename: str, req: RenameDocRequest):
    new_name = rename_doc_internal(filename, req.new_name)
    return {"status": "success", "old_name": filename, "new_name": new_name}


# ── Quick Notes & WhatsApp Notes ─────────────────────────────────

@router.post("/api/documents/note")
async def create_note_document(req: CreateNoteRequest):
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
                "Below is a WhatsApp transcript, audio memo, or quick client/portfolio note.\n"
                "Format this text into a clean, well-structured, professional Document & Portfolio Note for the digital warehouse repository.\n\n"
                "Rules:\n"
                "1. Place a descriptive top header (e.g. '# Portfolio & Meeting Summary').\n"
                "2. List contacts, phones, prices, dates, location/address, contract terms, and client requests in organized bullet points with bold highlights.\n"
                "3. Append '---\\n### Original Text / Message Log\\n' at the bottom followed by the raw input.\n"
                "4. All formatted output must be in English.\n\n"
                f"Text:\n{req.content}"
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

    tags = req.tags if req.tags else ([req.doc_type] if req.doc_type else ["note"])
    organizations_db["document_assignments"][filename] = {
        "org_id": org_id or "__unassigned__",
        "folder": req.folder.strip() if req.folder else "",
        "tags": tags,
        "doc_type": req.doc_type or "note",
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
        "doc_type": req.doc_type or "note",
    }


# ── Batch Operations ─────────────────────────────────────────────

@router.post("/api/batch-analyze")
async def batch_analyze_endpoint(req: BatchAnalyzeRequest):
    if not req.filenames:
        raise HTTPException(status_code=400, detail="Filenames required")
    return await analyze_batch_for_smart_organization(req.filenames)


@router.post("/api/batch-commit")
async def batch_commit_assignment(req: BatchCommitRequest):
    target_org_id = req.org_id

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


@router.post("/api/documents/batch-delete")
async def batch_delete_documents(req: BatchDeleteRequest):
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


@router.post("/api/documents/batch-move")
async def batch_move_documents(req: BatchMoveRequest):
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


@router.delete("/api/documents/{filename}")
async def delete_document(filename: str):
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

        if filename in organizations_db["document_assignments"]:
            del organizations_db["document_assignments"][filename]
            save_organizations()

        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()

        return {"status": "success", "deleted_vectors": len(ids_to_delete)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/documents/{filename}/reprocess")
async def reprocess_document(filename: str):
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

    data = vector_store.get()
    ids_to_delete = [
        doc_id for doc_id, meta in zip(data.get("ids", []), data.get("metadatas", []))
        if meta.get("source") == filename
    ]
    if ids_to_delete:
        vector_store.delete(ids=ids_to_delete)

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
