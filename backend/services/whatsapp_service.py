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
from langchain_core.messages import HumanMessage, SystemMessage

from config import UPLOAD_DIR, OPENAI_API_KEY
from database import (
    organizations_db,
    processed_documents,
    get_vector_store,
    save_organizations,
)
from services.ocr_service import extract_text_from_image
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

    # 1. Structure the note with AI
    structure_prompt = (
        "Sen profesyonel bir gayrimenkul / emlak asistanısın. Danışmandan gelen ham WhatsApp mesajını analiz et.\n"
        "Mesaj:\n"
        f"\"{text_content}\"\n\n"
        "Görevlerin:\n"
        "1. Bu not için 3-5 kelimelik kısa ve net bir başlık üret (örn: 'Silivri Arsa Fiyat Güncellemesi').\n"
        "2. İçeriği madde madde, temiz ve anlaşılır bir '# Portföy / Görüşme Notu' haline getir (fiyat, lokasyon, kişi, şartlar).\n"
        "3. Klasör önerisi yap (örn: 'Arsa Portföyü', 'Satılık Daireler', 'Müşteri Görüşmeleri').\n\n"
        "Lütfen aşağıdaki JSON formatında yanıt ver:\n"
        "{\n"
        "  \"title\": \"Kısa Başlık\",\n"
        "  \"formatted_content\": \"## Başlık\\n\\n- Madde 1...\",\n"
        "  \"suggested_folder\": \"Klasör Adı\"\n"
        "}"
    )

    title = f"wa_not_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    formatted_content = text_content
    suggested_folder = "WhatsApp Notları"

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
        print(f"[whatsapp_service] AI format error: {e}")

    # 2. Generate clean filename
    clean_title = re.sub(r'[^a-zA-Z0-9_\-çğıöşüÇĞİÖŞÜ\s]', '', title).strip().replace(' ', '_')
    if not clean_title:
        clean_title = f"wa_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    filename = f"WA_{clean_title}.txt"
    counter = 1
    file_path = UPLOAD_DIR / filename
    while file_path.exists():
        filename = f"WA_{clean_title}_{counter}.txt"
        file_path = UPLOAD_DIR / filename
        counter += 1

    # Add metadata footer to document
    full_doc_content = (
        f"{formatted_content}\n\n"
        f"---\n"
        f"📱 **Kaynak:** WhatsApp ({sender_name or sender_phone or 'Danışman'})\n"
        f"⏱️ **Kayıt Tarihi:** {datetime.now().strftime('%d.%m.%Y %H:%M')}\n"
        f"📝 **Ham Mesaj:** {text_content}"
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(full_doc_content)

    # 3. Chunk and Embed into Vector Store
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

    # 4. Auto-detect organization
    ai_org = await ai_detect_organization(filename, full_doc_content)
    org_id = ai_org.get("suggested_org_id") or "__unassigned__"
    org_name = ai_org.get("suggested_org_name") or "Genel"

    # Add folder to organization if not present
    if org_id in organizations_db["organizations"]:
        org = organizations_db["organizations"][org_id]
        if "folders" not in org:
            org["folders"] = []
        if suggested_folder and suggested_folder not in org["folders"]:
            org["folders"].append(suggested_folder)

    organizations_db["document_assignments"][filename] = {
        "org_id": org_id,
        "folder": suggested_folder,
        "tags": ["whatsapp", "not", "mobil"],
        "doc_type": "whatsapp",
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
    """Transcribes an audio file (e.g. WhatsApp voice note / ogg / mp3 / m4a) using Whisper API."""
    if not openai_client:
        raise ValueError("OpenAI client is not configured")

    with open(audio_path, "rb") as f:
        transcript = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="tr",
        )
    return transcript.text.strip()
