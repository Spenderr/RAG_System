# ── Stage 1: Build React Vite Frontend ──────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python Backend Runtime ─────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (Tesseract OCR, libmagic, ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libmagic1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Create runtime directories for vector db and uploads
RUN mkdir -p /app/db /app/uploads

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create non-root user and grant full permissions to workspace and storage directories
RUN useradd -m -u 1000 user && \
    chown -R user:user /app

USER user
ENV PORT=8000
EXPOSE 8000

# Run FastAPI via Uvicorn with dynamic $PORT support
CMD ["sh", "-c", "python -m uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]

