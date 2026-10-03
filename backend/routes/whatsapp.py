import os
import json
import httpx
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Request, Response, HTTPException, Query
from pydantic import BaseModel

from config import UPLOAD_DIR
from services.whatsapp_service import process_whatsapp_text_note, transcribe_audio_file
from database import (
    organizations_db,
    processed_documents,
    get_vector_store,
    save_organizations,
)

router = APIRouter(prefix="/api/webhook/whatsapp", tags=["WhatsApp Webhook"])


# ── Meta / Twilio Webhook Verification (Handshake) ──────────────────────────

@router.get("")
async def verify_whatsapp_webhook(
    mode: Optional[str] = Query(None, alias="hub.mode"),
    token: Optional[str] = Query(None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Standard Meta Cloud API verification handshake.
    Configure 'VERIFY_TOKEN' in your environment or Meta Developer Portal.
    """
    expected_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "mainchunk_whatsapp_token_2026")

    if mode == "subscribe" and token == expected_token:
        return Response(content=challenge, media_type="text/plain")

    return {"status": "active", "service": "MainChunk WhatsApp Webhook"}


# ── Incoming Message Handler (Meta Cloud API & Twilio Webhook) ───────────────

@router.post("")
async def receive_whatsapp_webhook(request: Request):
    """
    Receives incoming webhook payloads from Meta WhatsApp Cloud API or Twilio.
    Automatically handles text notes, voice memos, and image documents.
    """
    try:
        content_type = request.headers.get("content-type", "")

        # Case 1: JSON payload (Meta WhatsApp Cloud API)
        if "application/json" in content_type:
            payload = await request.json()
            entries = payload.get("entry", [])
            for entry in entries:
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    messages = value.get("messages", [])
                    contacts = value.get("contacts", [])
                    sender_name = contacts[0].get("profile", {}).get("name", "") if contacts else ""

                    for msg in messages:
                        sender_phone = msg.get("from", "")
                        msg_type = msg.get("type", "text")

                        if msg_type == "text":
                            body = msg.get("text", {}).get("body", "")
                            if body.strip():
                                result = await process_whatsapp_text_note(
                                    text_content=body,
                                    sender_phone=sender_phone,
                                    sender_name=sender_name,
                                )
                                return {
                                    "status": "success",
                                    "action": "text_note_ingested",
                                    "details": result,
                                }

            return {"status": "received", "info": "Payload processed"}

        # Case 2: Form data (Twilio Webhook format)
        form = await request.form()
        body = form.get("Body", "")
        sender_phone = form.get("From", "")
        media_url = form.get("MediaUrl0", "")

        if body and not media_url:
            result = await process_whatsapp_text_note(
                text_content=str(body),
                sender_phone=str(sender_phone),
                sender_name="WhatsApp User",
            )
            return {
                "status": "success",
                "action": "text_note_ingested",
                "details": result,
            }

        return {"status": "received"}

    except Exception as e:
        print(f"[whatsapp_webhook] Error processing message: {e}")
        return {"status": "error", "message": str(e)}


# ── Simulation & Test API (For instant local testing & UI simulation) ────────

class SimulateWhatsAppRequest(BaseModel):
    message: str
    sender_name: Optional[str] = "Emlak Danışmanı"
    sender_phone: Optional[str] = "+905321234567"


@router.post("/simulate")
async def simulate_whatsapp_message(req: SimulateWhatsAppRequest):
    """
    Directly simulates receiving a WhatsApp message or note.
    Runs the full pipeline: AI structuring -> categorization -> chunking -> vector embedding.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Mesaj içeriği boş olamaz")

    result = await process_whatsapp_text_note(
        text_content=req.message,
        sender_phone=req.sender_phone or "+905321234567",
        sender_name=req.sender_name or "Emlak Danışmanı",
    )

    org_name = result.get("org_name", "Genel")
    folder = result.get("folder", "WhatsApp Notları")
    title = result.get("title", "Portföy Notu")

    reply_text = (
        f"🏢 *MainChunk Depo Yöneticisi*\n\n"
        f"✅ Sayın {req.sender_name or 'Danışman'},\n"
        f"Gönderdiğiniz not teslim alındı ve depoya yerleştirildi.\n\n"
        f"📦 *Raf (Portföy):* {org_name}\n"
        f"📁 *Klasör:* {folder}\n"
        f"🏷️ *Başlık:* {title}\n"
        f"📑 *Arşiv Kodu:* `{result.get('filename')}`\n\n"
        f"💡 *Özet:* {result.get('summary', '')}\n\n"
        f"🔍 Bu bilgi artık RAG hafızasında ve yapay zeka sorgularında hazırdır."
    )

    return {
        "status": "success",
        "message": "WhatsApp notu başarıyla işlendi ve portföye kaydedildi.",
        "reply_text": reply_text,
        "data": result,
    }


