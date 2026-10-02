import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# Load environment variables
load_dotenv()

# Setup paths and models
persistent_directory = "db/chroma_db"

if not os.path.exists(persistent_directory):
    raise FileNotFoundError(
        f"Vector store not found at '{persistent_directory}'. "
        "Please run 'python ingestion_pipeline.py' first."
    )

embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)  # You can also use "gpt-4o"

db = Chroma(
    persist_directory=persistent_directory,
    embedding_function=embedding_model,
    collection_metadata={"hnsw:space": "cosine"}
)

# Pydantic model for structured output
class QueryVariations(BaseModel):
    queries: List[str]

# ──────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ──────────────────────────────────────────────────────────────────

default_query = "How does Tesla make money?"
print("\n" + "=" * 70)
print("MULTI-QUERY RETRIEVAL")
print("=" * 70)

user_query = input(f"Enter query (Press Enter for '{default_query}'): ").strip()
original_query = user_query if user_query else default_query
print(f"\nOriginal Query: {original_query}\n")

# ──────────────────────────────────────────────────────────────────
# Step 1: Generate Multiple Query Variations
# ──────────────────────────────────────────────────────────────────
print("Generating query variations with LLM...")
llm_with_tools = llm.with_structured_output(QueryVariations)

prompt = f"""Generate 3 different variations of this query that would help retrieve relevant documents:

Original query: {original_query}

Return 3 alternative queries that rephrase or approach the same question from different angles."""

response = llm_with_tools.invoke(prompt)
query_variations = response.queries

print("\nGenerated Query Variations:")
for i, variation in enumerate(query_variations, 1):
    print(f"  {i}. {variation}")

print("\n" + "=" * 70)

# ──────────────────────────────────────────────────────────────────
# Step 2: Search with Each Query Variation & Store Results
# ──────────────────────────────────────────────────────────────────
retriever = db.as_retriever(search_kwargs={"k": 5})  # Top 5 docs per variation
all_retrieval_results = []  # Stores results for Reciprocal Rank Fusion (RRF)

for i, query in enumerate(query_variations, 1):
    print(f"\n=== RESULTS FOR QUERY {i}: '{query}' ===")
    
    docs = retriever.invoke(query)
    all_retrieval_results.append(docs)
    
    print(f"Retrieved {len(docs)} documents:\n")
    
    for j, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "Unknown")
        print(f"  [Doc {j}] ({source}):")
        print(f"  {doc.page_content[:160]}...\n")
    
    print("-" * 60)

print("\n" + "=" * 70)
print("Multi-Query Retrieval Complete!")
print(f"Collected {len(all_retrieval_results)} sets of document lists ready for ranking/fusion.")
print("=" * 70)
