import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path so running from root (e.g. uvicorn backend.app:app)
# or from inside backend/ both work without ModuleNotFoundError
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS
from database import init_db
from routes import (
    organizations_router,
    documents_router,
    chat_router,
    stats_router,
    whatsapp_router,
)


# ── Lifespan (replaces deprecated @app.on_event) ─────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield
    # Add any cleanup logic here if needed in the future


# ── Application Factory ───────────────────────────────────────────────────────

app = FastAPI(
    title="MainChunk API",
    description="Intelligent Multimodal Document, Portfolio & RAG Knowledge Engine",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register Modular Routers ──────────────────────────────────────────────────

app.include_router(organizations_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(stats_router)
app.include_router(whatsapp_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
