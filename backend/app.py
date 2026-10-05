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


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ── Register Modular Routers ──────────────────────────────────────────────────

app.include_router(organizations_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(stats_router)
app.include_router(whatsapp_router)


# ── Static Frontend SPA Serving (for Production & Docker) ─────────────────────

DIST_DIR = BACKEND_DIR.parent / "frontend" / "dist"

if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        index_path = DIST_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return {"message": "MainChunk API running. Build frontend to access web interface."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
