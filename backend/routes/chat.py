import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage

from database import chat_history
import database
from models.chat import ChatMessage, ExecuteActionRequest
from services.chat_service import (
    CONFIRMATION_PATTERN,
    CANCEL_PATTERN,
    detect_deletion_action,
    do_execute_chat_action,
    generate_rag_chat_response,
)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/action/execute")
async def execute_chat_action_endpoint(body: ExecuteActionRequest):
    """Execute an action confirmed by the user in chat."""
    try:
        result = await do_execute_chat_action(body)
        database.last_pending_action = None
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def chat_endpoint(body: ChatMessage):
    query = body.message.strip()

    # 1. Check if user is confirming or cancelling an active pending action
    if database.last_pending_action:
        if CONFIRMATION_PATTERN.match(query):
            exec_req = ExecuteActionRequest(
                action_type=database.last_pending_action.get("type", "delete_confirmation"),
                action_id=database.last_pending_action.get("action_id"),
                target_org_id=database.last_pending_action.get("target_org_id"),
                target_folder=database.last_pending_action.get("target_folder"),
                target_filenames=database.last_pending_action.get("target_filenames", []),
                delete_folder=True
            )
            result = await do_execute_chat_action(exec_req)
            completed_action = dict(database.last_pending_action)
            completed_action["status"] = "completed"
            completed_action["resultMessage"] = result.get("message")
            database.last_pending_action = None

            answer = f"✓ Onayınız alındı. {result.get('message', 'Silme işlemi başarıyla tamamlandı.')}"
            chat_history.append(HumanMessage(content=query))
            chat_history.append(AIMessage(content=answer))
            return {
                "answer": answer,
                "sources": [],
                "action": completed_action
            }

        if CANCEL_PATTERN.match(query):
            cancelled_action = dict(database.last_pending_action)
            cancelled_action["status"] = "cancelled"
            database.last_pending_action = None

            answer = "Silme işlemi iptal edildi. Hiçbir dosya veya kayıt silinmedi."
            chat_history.append(HumanMessage(content=query))
            chat_history.append(AIMessage(content=answer))
            return {
                "answer": answer,
                "sources": [],
                "action": cancelled_action
            }

    # 2. Check for action / deletion intent
    action_intent = await detect_deletion_action(query, chat_history)
    if action_intent and action_intent.get("is_delete_request"):
        if action_intent.get("found"):
            action_payload = {
                "action_id": str(uuid.uuid4())[:8],
                "type": "delete_confirmation",
                "status": "pending",
                "title": action_intent.get("confirmation_title") or "Silme İşlemi Onayı",
                "target_org_id": action_intent.get("target_org_id"),
                "target_org_name": action_intent.get("target_org_name"),
                "target_folder": action_intent.get("target_folder"),
                "target_filenames": action_intent.get("target_filenames", []),
                "requires_confirmation": True
            }
            database.last_pending_action = action_payload
            answer = action_intent.get("user_explanation") or (
                "Silme işlemini gerçekleştirmeden önce onayınız gerekmektedir. "
                "Aşağıdaki butonu kullanarak işlemi onaylayabilirsiniz:"
            )
            chat_history.append(HumanMessage(content=query))
            chat_history.append(AIMessage(content=answer))
            return {
                "answer": answer,
                "sources": [],
                "action": action_payload
            }
        else:
            answer = action_intent.get("user_explanation") or (
                "Belirttiğiniz isim veya kriterlere uygun silinecek bir portföy ya da doküman bulunamadı. "
                "Lütfen portföy veya dosya adını kontrol ediniz."
            )
            chat_history.append(HumanMessage(content=query))
            chat_history.append(AIMessage(content=answer))
            return {
                "answer": answer,
                "sources": [],
                "action": None
            }

    # 3. Standard RAG Q&A
    return await generate_rag_chat_response(query)


@router.get("/history")
async def get_chat_history():
    formatted = []
    for msg in chat_history:
        if isinstance(msg, HumanMessage):
            formatted.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            formatted.append({"role": "assistant", "content": msg.content})
    return {"history": formatted}


@router.delete("/history")
async def clear_chat():
    chat_history.clear()
    database.last_pending_action = None
    return {"status": "success"}
