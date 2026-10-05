from fastapi import APIRouter
from database import processed_documents, organizations_db, vector_store, chat_history

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("")
async def get_stats():
    """Return live system statistics: document counts, vector counts, organization counts, and token analytics."""
    try:
        total_vectors = vector_store._collection.count()
    except Exception:
        total_vectors = 0

    user_orgs_count = sum(
        1 for org in organizations_db["organizations"].values()
        if not org.get("is_system")
    )

    # Calculate token usage estimates
    total_chars = sum(
        doc.get("char_count", 0) for doc in processed_documents.values()
    )
    doc_count = len(processed_documents)
    # Estimate tokens: ~4 chars per token for documents, ~220 tokens per vector chunk, ~350 tokens per chat turn
    doc_tokens = total_chars // 4 if total_chars > 0 else (doc_count * 600)
    embedding_tokens = total_vectors * 220
    chat_tokens = len(chat_history) * 350
    total_tokens = doc_tokens + embedding_tokens + chat_tokens

    if total_tokens == 0 and doc_count > 0:
        total_tokens = doc_count * 1250
        embedding_tokens = int(total_tokens * 0.4)
        doc_tokens = total_tokens - embedding_tokens

    # OpenAI blended pricing (~$0.18 / 1M tokens)
    cost_usd = round((total_tokens / 1_000_000) * 0.18, 4)

    return {
        "total_documents": doc_count,
        "total_vectors": total_vectors,
        "total_organizations": user_orgs_count,
        "token_usage": {
            "total_tokens": total_tokens,
            "embedding_tokens": embedding_tokens,
            "llm_tokens": doc_tokens + chat_tokens,
            "estimated_cost_usd": cost_usd,
        },
    }

