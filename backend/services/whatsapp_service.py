import os
import re
import json
import uuid
import httpx
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from openai import AsyncOpenAI
from langchain_openai import ChatOpenAI

from config import UPLOAD_DIR, OPENAI_API_KEY
from database import (
    organizations_db,
    processed_documents,
    get_vector_store,
    save_organizations,
)
from services.text_service import chunk_by_sections_or_paragraphs
from services.org_service import ai_detect_organization

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


async def process_whatsapp_text_note(
    text_content: str,
    sender_phone: str = "",
    sender_name: str = "",
) -> Dict[str, Any]:
    """
    Ingests an incoming WhatsApp text note:
    1. Formats it nicely with AI into a structured real estate note.
    2. Detects the relevant organization/portfolio and suggested folder.
    3. Saves file, chunks text, and embeds into vector store.
    4. Persists the assignment in database.
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

    structure_prompt = (
        "You are a professional real estate and document management assistant. Analyze the incoming WhatsApp message/note.\n"
        "Message:\n"
        f"\"{text_content}\"\n\n"
        "Tasks:\n"
        "1. Generate a concise 3-5 word English title (e.g. 'Paris Property Price Update').\n"
        "2. Format the content into a clean, well-structured English '# Portfolio & Client Note' with bullet points (prices, location, contacts, terms).\n"
        "3. Suggest a clean English folder (e.g. 'Land Portfolios', 'Apartment Sales', 'Client Inquiries').\n\n"
        "Respond strictly in this JSON format:\n"
        "{\n"
        "  \"title\": \"Short English Title\",\n"
        "  \"formatted_content\": \"## Title\\n\\n- Bullet 1...\",\n"
        "  \"suggested_folder\": \"Folder Name\"\n"
        "}"
    )

    title = f"wa_note_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    formatted_content = text_content
    suggested_folder = "WhatsApp Notes"

    try:
        res = await llm.ainvoke(structure_prompt)
        raw = res.content.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()
        data = json.loads(raw)
        if data.get("title"):
            title = data["title"]
        if data.get("formatted_content"):
            formatted_content = data["formatted_content"]
        if data.get("suggested_folder"):
            suggested_folder = data["suggested_folder"]
    except Exception as e:
        print(f"[whatsapp_service] AI format warning: {e}")

    clean_title = re.sub(r'[^a-zA-Z0-9_\-\s]', '', title).strip().replace(' ', '_')
    if not clean_title:
        clean_title = f"wa_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    filename = f"WA_{clean_title}.txt"
    counter = 1
    file_path = UPLOAD_DIR / filename
    while file_path.exists():
        filename = f"WA_{clean_title}_{counter}.txt"
        file_path = UPLOAD_DIR / filename
        counter += 1

    full_doc_content = (
        f"{formatted_content}\n\n"
        f"---\n"
        f"📱 **Source:** WhatsApp ({sender_name or sender_phone or 'Client'})\n"
        f"⏱️ **Recorded At:** {datetime.now().strftime('%d.%m.%Y %H:%M')}\n"
        f"📝 **Raw Message:** {text_content}"
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(full_doc_content)

    chunks, chunk_details = chunk_by_sections_or_paragraphs([(1, full_doc_content)])
    vs = get_vector_store()

    all_metadatas = [
        {
            "source": filename,
            "chunk_index": d["index"],
            "total_chunks": len(chunks),
            "page": 1,
            "title": d.get("title", title),
        }
        for d in chunk_details
    ]
    vs.add_texts(texts=chunks, metadatas=all_metadatas)

    processed_documents[filename] = {
        "text": full_doc_content,
        "chunks": chunks,
        "chunk_details": chunk_details,
        "char_count": len(full_doc_content),
        "chunk_count": len(chunks),
        "file_type": "txt",
    }

    ai_org = await ai_detect_organization(filename, full_doc_content)
    org_id = ai_org.get("suggested_org_id") or "__unassigned__"
    org_name = ai_org.get("suggested_org_name") or "General"

    if org_id in organizations_db["organizations"]:
        org = organizations_db["organizations"][org_id]
        if "folders" not in org:
            org["folders"] = []
        if suggested_folder and suggested_folder not in org["folders"]:
            org["folders"].append(suggested_folder)

    organizations_db["document_assignments"][filename] = {
        "org_id": org_id,
        "folder": suggested_folder,
        "tags": ["note", "memo"],
        "doc_type": "note",
        "assigned_at": datetime.now().isoformat(),
        "auto_detected": True,
    }
    save_organizations()

    return {
        "filename": filename,
        "title": title,
        "org_id": org_id,
        "org_name": org_name,
        "folder": suggested_folder,
        "chunk_count": len(chunks),
        "summary": formatted_content[:200] + "...",
    }


async def transcribe_audio_file(audio_path: Path) -> str:
    """Transcribes an audio file (e.g. WhatsApp voice note) using Whisper API."""
    if not openai_client:
        raise ValueError("OpenAI client is not configured")

    with open(audio_path, "rb") as f:
        transcript = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="tr",
        )
    return transcript.text.strip()

