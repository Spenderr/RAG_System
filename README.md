# Comprehensive RAG System (Retrieval-Augmented Generation)

A complete, production-ready collection of modern Retrieval-Augmented Generation (RAG) architectures built with Python, LangChain, ChromaDB, OpenAI, Cohere, and Unstructured.

---

## 🚀 Features & Architecture Covered

### 1. Document Ingestion Pipeline (`ingestion_pipeline.py`)
- Automated document loading with `DirectoryLoader` and `TextLoader`.
- Preprocessing and cleaning (stripping Wikipedia references and citation noise).
- Chunking with `RecursiveCharacterTextSplitter`.
- Dense semantic vector embeddings using OpenAI (`text-embedding-3-small`).
- Persistent local vector store caching with ChromaDB.

### 2. Conversational RAG with Memory (`conversational_rag.py`)
- Full conversational memory tracking with `chat_history`.
- Contextual query rewriting (coreference resolution) to transform follow-up questions into standalone queries.
- Continuous multi-turn terminal chat interface.

### 3. Advanced Retrieval Strategies (`retrieval_methods.py`)
- **Basic Similarity Search:** Dense cosine similarity search.
- **Score Threshold Search:** Filters out low-confidence results to prevent AI hallucinations on out-of-domain queries.
- **Maximum Marginal Relevance (MMR):** Balances relevance and diversity to prevent redundant information.

### 4. Multi-Query Retrieval & Reciprocal Rank Fusion (`multi_query_retrieval.py`, `reciprocal_rank_fusion.py`)
- Automated query expansion generating multiple query perspectives using GPT-4o and Pydantic structured output.
- Multi-query parallel retrieval.
- **Reciprocal Rank Fusion (RRF):** Mathematical rank fusion algorithm (`1 / (60 + rank)`) boosting consensus documents.

### 5. Hybrid Search (`hybrid_search.ipynb`)
- **Dense Retrieval (Semantic):** ChromaDB vector store.
- **Sparse Retrieval (Keyword):** BM25 (`rank_bm25`).
- **EnsembleRetriever:** Weighted combination (70% Semantic, 30% Keyword).

### 6. Two-Stage Retrieval with Reranking (`reranker.ipynb`)
- Stage 1: Broad candidate collection via Hybrid Search (Vector + BM25).
- Stage 2: Precision scoring with **Cohere Rerank** (`rerank-english-v3.0`).
- Final synthesis with GPT-4o using top reranked chunks.

### 7. Multimodal RAG with PDFs, Tables, and Images (`multi_modal_rag.ipynb`)
- High-resolution PDF layout parsing using `unstructured` (`partition_pdf` with `hi_res`).
- Title-based chunking (`chunk_by_title`).
- Preservation of structured HTML tables (`<table>`) and embedded Base64 diagrams.
- **AI-Enhanced Searchable Summaries:** GPT-4o Vision analyzes mixed content (diagrams + tables) into searchable summaries for vector indexing.
- Multimodal final generation feeding both text and raw images to GPT-4o Vision.

---

## 🛠️ Setup & Installation

### 1. Clone the repository
```bash
git clone git@github.com:Spenderr/RAG_System.git
cd RAG_System
```

### 2. Create and activate a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
# For PDF parsing (macOS system dependencies):
brew install poppler tesseract libmagic
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```
In `.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
COHERE_API_KEY=your_cohere_api_key_here
```

---

## 💡 Quick Start

Run the end-to-end interactive conversational RAG chatbot:
```bash
python main.py
```
*(Or run individual modular scripts like `python retrieval_methods.py` or `python reciprocal_rank_fusion.py`)*
