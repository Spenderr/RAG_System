import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ── Project Paths ─────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

UPLOAD_DIR = PROJECT_ROOT / "uploads"
CHROMA_DIR = PROJECT_ROOT / "db" / "mainchunk_chroma"
ORG_DB_PATH = PROJECT_ROOT / "db" / "organizations.json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
(PROJECT_ROOT / "db").mkdir(parents=True, exist_ok=True)

# ── Allowed File Types ────────────────────────────────────────────────────────

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "gif"}
VALID_EXTENSIONS = {"pdf", "txt"} | IMAGE_EXTENSIONS

# ── OpenAI API Key Validation ─────────────────────────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print(
        "[config] CRITICAL: OPENAI_API_KEY is not set. "
        "Create a .env file with OPENAI_API_KEY=sk-... or set it as an environment variable.",
        file=sys.stderr,
    )
    # Don't hard-exit here so tests / imports still work, but API calls will fail.

# ── CORS Origins ──────────────────────────────────────────────────────────────
# In production set ALLOWED_ORIGINS="https://yourdomain.com" in environment.
# Defaults to localhost dev origins only.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS: list[str] = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]
)
