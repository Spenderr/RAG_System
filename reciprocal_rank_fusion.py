import os
from collections import defaultdict
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel

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
print("MULTI-QUERY WITH RECIPROCAL RANK FUSION (RRF)")
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

retriever = db.as_retriever(search_kwargs={"k": 5})  # 5 docs per variation
all_retrieval_results = []

for i, query in enumerate(query_variations, 1):
    print(f"\n=== RESULTS FOR QUERY {i}: '{query}' ===")
    
    docs = retriever.invoke(query)
    all_retrieval_results.append(docs)
    
    print(f"Retrieved {len(docs)} documents:")
    for j, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "Unknown")
        print(f"  [Doc {j}] ({source}): {doc.page_content[:100]}...")
    
    print("-" * 60)

# ──────────────────────────────────────────────────────────────────
# Step 3: Apply Reciprocal Rank Fusion (RRF)
# ──────────────────────────────────────────────────────────────────

def reciprocal_rank_fusion(chunk_lists, k=60, verbose=True):
    """
    Combines multiple ranked lists using the RRF algorithm.
    Formula for each document: Score = sum(1 / (k + rank))
    """
    if verbose:
        print("\n" + "=" * 70)
        print("APPLYING RECIPROCAL RANK FUSION (RRF)")
        print("=" * 70)
        print(f"Using smoothing constant k={k}\n")
    
    rrf_scores = defaultdict(float)
    all_unique_chunks = {}
    chunk_id_map = {}
    chunk_counter = 1
    
    # Process each query's results
    for query_idx, chunks in enumerate(chunk_lists, 1):
        if verbose:
            print(f"Processing Query {query_idx} results:")
        
        for position, chunk in enumerate(chunks, 1):  # 1-indexed position
            chunk_content = chunk.page_content
            
            # Assign readable ID to track duplicates across lists
            if chunk_content not in chunk_id_map:
                chunk_id_map[chunk_content] = f"Chunk_{chunk_counter}"
                chunk_counter += 1
            
            chunk_id = chunk_id_map[chunk_content]
            all_unique_chunks[chunk_content] = chunk
            
            # Position score: 1 / (k + position)
            position_score = 1.0 / (k + position)
            rrf_scores[chunk_content] += position_score
            
            if verbose:
                print(f"  Position {position}: {chunk_id} (+{position_score:.4f} -> Total: {rrf_scores[chunk_content]:.4f})")
                print(f"    Preview: {chunk_content[:70]}...")
        
        if verbose:
            print()
    
    # Sort chunks by final RRF score (highest first)
    sorted_chunks = sorted(
        [(all_unique_chunks[content], score) for content, score in rrf_scores.items()],
        key=lambda x: x[1],
        reverse=True
    )
    
    if verbose:
        print(f"✅ RRF Complete! Processed {len(sorted_chunks)} unique chunks from {len(chunk_lists)} query lists.")
    
    return sorted_chunks


# Apply RRF
fused_results = reciprocal_rank_fusion(all_retrieval_results, k=60, verbose=True)

# ──────────────────────────────────────────────────────────────────
# Step 4: Display Final Fused Results (The Champions)
# ──────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("FINAL RRF RANKING (Top Documents)")
print("=" * 70)

top_k = min(5, len(fused_results))
for rank, (doc, rrf_score) in enumerate(fused_results[:top_k], 1):
    source = doc.metadata.get("source", "Unknown")
    print(f"\n🏆 RANK {rank} (RRF Score: {rrf_score:.4f}) | Source: {source}")
    print(f"{doc.page_content[:250]}...")
    print("-" * 60)

print(f"\n💡 Summary:")
print(f"  • Successfully merged {len(fused_results)} unique documents across 3 queries.")
print(f"  • Documents appearing in multiple query variations received boosted scores and rose to the top.")
print("=" * 70)
