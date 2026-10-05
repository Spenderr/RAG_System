from fastapi import APIRouter
from database import processed_documents, organizations_db, vector_store

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("")
async def get_stats():
    """Return live system statistics: document counts, vector counts, and organization counts."""
    try:
        total_vectors = vector_store._collection.count()
    except Exception:
        total_vectors = 0

    user_orgs_count = sum(
        1 for org in organizations_db["organizations"].values()
        if not org.get("is_system")
    )

    return {
        "total_documents": len(processed_documents),
        "total_vectors": total_vectors,
        "total_organizations": user_orgs_count,
    }
