from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# Load environment variables
load_dotenv()

persistent_directory = "db/chroma_db"

# Load embeddings and vector store
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

db = Chroma(
    persist_directory=persistent_directory,
    embedding_function=embedding_model,
    collection_metadata={"hnsw:space": "cosine"}
)

# Define query (interactive or default)
user_input = input("\nAsk a question (Press Enter for default: 'How much did Microsoft pay to acquire GitHub?'): ").strip()
query = user_input if user_input else "How much did Microsoft pay to acquire GitHub?"

retriever = db.as_retriever(search_kwargs={"k": 5})

# Optional similarity threshold search:
# retriever = db.as_retriever(
#     search_type="similarity_score_threshold",
#     search_kwargs={
#         "k": 5,
#         "score_threshold": 0.3  # Only return chunks with cosine similarity >= 0.3
#     }
# )

relevant_docs = retriever.invoke(query)

print(f"\nUser Query: {query}")
print("\n--- Context ---")
for i, doc in enumerate(relevant_docs, 1):
    source = doc.metadata.get("source", "Unknown")
    print(f"Document {i} ({source}):\n{doc.page_content}\n")

# Combine the query and the relevant document contents
combined_input = f"""Based on the following documents, please answer this question: {query}

Documents:
{chr(10).join([f"- {doc.page_content}" for doc in relevant_docs])}

Please provide a clear, helpful answer using only the information from these documents. If you can't find the answer in the documents, say "I don't have enough information to answer that question based on the provided documents."
"""

# Create a ChatOpenAI model (you can use "gpt-4o-mini" or "gpt-4o")
model = ChatOpenAI(model="gpt-4o-mini")

# Define the messages for the model
messages = [
    SystemMessage(content="You are a helpful assistant."),
    HumanMessage(content=combined_input),
]

# Invoke the model with the combined input
print("Generating response...")
result = model.invoke(messages)

# Display the full result and content only
print("\n--- Generated Response ---")
print("Content only:")
print(result.content)
