import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from config import CHROMA_DIR, ORG_DB_PATH, UPLOAD_DIR

# In-memory stores
processed_documents: Dict[str, Dict[str, Any]] = {}
chat_history: List[Any] = []
last_pending_action: Optional[Dict[str, Any]] = None

# Organization database (persisted to JSON)
organizations_db: Dict[str, Any] = {
    "organizations": {},  # org_id -> { name, description, color, tags, folders, created_at, is_system }
    "document_assignments": {},  # filename -> { org_id, folder, tags, doc_type, assigned_at, auto_detected }
}

# ── Lazy-initialized vector store ────────────────────────────────────────────
# Defer OpenAI client creation until first use so the app can import cleanly
# even when OPENAI_API_KEY is not yet set (e.g. during testing or CI).
_vector_store: Optional[Chroma] = None


def get_vector_store() -> Chroma:
    """Return the shared Chroma vector store, initializing it on first call."""
    global _vector_store
    if _vector_store is None:
        embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
        _vector_store = Chroma(
            persist_directory=str(CHROMA_DIR),
            embedding_function=embedding_model,
            collection_metadata={"hnsw:space": "cosine"},
        )
    return _vector_store


class VectorStoreProxy:
    """Dynamic proxy that delegates attribute access to the initialized Chroma vector store."""
    def __getattr__(self, name):
        return getattr(get_vector_store(), name)


vector_store = VectorStoreProxy()



def load_organizations():
    """Load organizations and document assignments from JSON file into the shared dictionary in-place."""
    if ORG_DB_PATH.exists():
        try:
            with open(ORG_DB_PATH, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            organizations_db.clear()
            organizations_db.update(loaded)
            if "organizations" not in organizations_db:
                organizations_db["organizations"] = {}
            if "document_assignments" not in organizations_db:
                organizations_db["document_assignments"] = {}
        except Exception as e:
            print(f"[database] Error loading organizations: {e}")


def save_organizations():
    """Persist organizations and document assignments to JSON file."""
    try:
        with open(ORG_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(organizations_db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[database] Error saving organizations: {e}")


def ensure_unknown_org():
    """Ensure the system 'General / Unassigned' organization always exists."""
    if "__unassigned__" not in organizations_db["organizations"]:
        organizations_db["organizations"]["__unassigned__"] = {
            "name": "General / Unassigned",
            "description": "General documents not yet assigned to a specific client portfolio or folder",
            "color": "#6b7280",
            "tags": [],
            "created_at": datetime.now().isoformat(),
            "is_system": True,
        }
        save_organizations()
    else:
        organizations_db["organizations"]["__unassigned__"]["name"] = "General / Unassigned"
        organizations_db["organizations"]["__unassigned__"]["description"] = "General documents not yet assigned to a specific client portfolio or folder"
        save_organizations()


def init_db():
    """Initialize database and rebuild processed_documents in-memory index from Chroma and assignments."""
    global processed_documents, vector_store
    load_organizations()
    ensure_unknown_org()

    # Initialize the vector store (lazy) and expose it as the module-level alias
    vs = get_vector_store()
    vector_store = vs

    try:
        data = vs.get()
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
        print(f"[database] Error initializing documents from Chroma: {e}")

    # Also ensure any document in document_assignments is indexed
    for filename in list(organizations_db.get("document_assignments", {}).keys()):
        if filename not in processed_documents:
            file_path = UPLOAD_DIR / filename
            size = file_path.stat().st_size if file_path.exists() else 0
            processed_documents[filename] = {
                "text": "",
                "chunks": [],
                "char_count": size,
                "chunk_count": 1,
                "file_type": filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown",
            }
