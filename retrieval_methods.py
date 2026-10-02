import os
from dotenv import load_dotenv

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

# Load environment variables
load_dotenv()

# Setup
persistent_directory = "db/chroma_db"

if not os.path.exists(persistent_directory):
    raise FileNotFoundError(
        f"Vector store not found at '{persistent_directory}'. "
        "Please run 'python ingestion_pipeline.py' first."
    )

embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

db = Chroma(
    persist_directory=persistent_directory,
    embedding_function=embedding_model,
    collection_metadata={"hnsw:space": "cosine"}
)

# ──────────────────────────────────────────────────────────────────
# Choose or Input Query
# ──────────────────────────────────────────────────────────────────
default_query = "How much did Microsoft pay to acquire GitHub?"
print("\n" + "=" * 70)
print("RETRIEVAL METHODS COMPARISON")
print("=" * 70)
user_query = input(f"Enter query (Press Enter for '{default_query}'): ").strip()
query = user_query if user_query else default_query
print(f"\nTarget Query: {query}\n")

# ──────────────────────────────────────────────────────────────────
# METHOD 1: Basic Similarity Search
# Returns top k most similar documents
# ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("=== METHOD 1: Similarity Search (k=3) ===")
print("=" * 70)
retriever_basic = db.as_retriever(search_kwargs={"k": 3})
docs_basic = retriever_basic.invoke(query)
print(f"Retrieved {len(docs_basic)} documents:\n")

for i, doc in enumerate(docs_basic, 1):
    source = doc.metadata.get("source", "Unknown")
    print(f"[Document {i}] (Source: {source})")
    print(doc.page_content[:300] + "...\n")


# ──────────────────────────────────────────────────────────────────
# METHOD 2: Similarity with Score Threshold
# Only returns documents meeting the cosine similarity threshold
# ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("=== METHOD 2: Similarity with Score Threshold (score_threshold=0.3) ===")
print("=" * 70)
try:
    retriever_threshold = db.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={
            "k": 3,
            "score_threshold": 0.3  # Returns only docs with score >= 0.3
        }
    )
    docs_threshold = retriever_threshold.invoke(query)
    print(f"Retrieved {len(docs_threshold)} documents:\n")

    if not docs_threshold:
        print("ℹ️ No documents passed the score threshold. (Useful to prevent hallucination!)")
    else:
        for i, doc in enumerate(docs_threshold, 1):
            source = doc.metadata.get("source", "Unknown")
            print(f"[Document {i}] (Source: {source})")
            print(doc.page_content[:300] + "...\n")
except Exception as e:
    print(f"Note on threshold search: {e}")


# ──────────────────────────────────────────────────────────────────
# METHOD 3: Maximum Marginal Relevance (MMR)
# Balances relevance and diversity - avoids redundant results
# ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("=== METHOD 3: Maximum Marginal Relevance (MMR) (k=3, λ=0.5) ===")
print("=" * 70)
retriever_mmr = db.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 3,           # Final number of docs to return
        "fetch_k": 10,    # Initial pool of candidates
        "lambda_mult": 0.5  # 0.0 = max diversity, 1.0 = max similarity
    }
)
docs_mmr = retriever_mmr.invoke(query)
print(f"Retrieved {len(docs_mmr)} documents:\n")

for i, doc in enumerate(docs_mmr, 1):
    source = doc.metadata.get("source", "Unknown")
    print(f"[Document {i}] (Source: {source})")
    print(doc.page_content[:300] + "...\n")

print("=" * 70)
print("Done! Try different queries (e.g. out-of-domain queries) to observe differences.")
print("=" * 70)
