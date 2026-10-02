import os
from dotenv import load_dotenv

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()


def load_vector_store(persist_directory="db/chroma_db"):
    """Load the existing Chroma vector store."""
    
    print("Loading vector store...")

    if not os.path.exists(persist_directory):
        raise FileNotFoundError(
            f"Vector store not found at '{persist_directory}'. "
            "Please run the ingestion pipeline first."
        )

    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small"
    )

    vectorstore = Chroma(
        persist_directory=persist_directory,
        embedding_function=embeddings,
        collection_metadata={"hnsw:space": "cosine"}
    )

    print(
        f"Vector store loaded with "
        f"{vectorstore._collection.count()} vectors."
    )

    return vectorstore


def retrieve_documents(vectorstore, query, k=4):
    """
    Retrieve the k most relevant document chunks
    for a given user query.
    """

    print(f"\nSearching for: {query}")

    results = vectorstore.similarity_search_with_score(
        query,
        k=k
    )

    if not results:
        print("No relevant documents found.")
        return []

    print(f"\nFound {len(results)} relevant chunks:")

    for i, (document, score) in enumerate(results, start=1):
        print(f"\n--- Result {i} ---")
        print(f"Similarity score: {score}")
        print(f"Source: {document.metadata.get('source', 'Unknown')}")
        print(f"Content:\n{document.page_content}")
        print("-" * 60)

    return results


def build_context(results):
    """
    Combine retrieved chunks into a single context string
    that can later be passed to an LLM.
    """

    context_parts = []

    for i, (document, score) in enumerate(results, start=1):
        source = document.metadata.get("source", "Unknown")

        context_parts.append(
            f"""
[Document {i}]
Source: {source}

{document.page_content}
"""
        )

    return "\n".join(context_parts)


def main():

    # 1. Load the existing vector store
    vectorstore = load_vector_store()

    # 2. Ask a question
    query = input("\nAsk a question: ")

    # 3. Retrieve relevant chunks
    results = retrieve_documents(
        vectorstore,
        query,
        k=4
    )

    # 4. Build context for the LLM
    context = build_context(results)

    # 5. Combine the query and the relevant document contents
    combined_input = f"""Based on the following documents, please answer this question: {query}

Documents:
{context}

Please provide a clear, helpful answer using only the information from these documents. If you can't find the answer in the context, just say: "I don't have enough information to answer the question."
"""

    # 6. Create a ChatOpenAI model
    model = ChatOpenAI(model="gpt-4o-mini")  # or "gpt-4o"

    # 7. Define the messages for the model
    messages = [
        SystemMessage(content="You are a helpful assistant."),
        HumanMessage(content=combined_input),
    ]

    # 8. Invoke the model with the combined input
    print("\nSending context to LLM...")
    result = model.invoke(messages)

    # 9. Display the full result and content only
    print("\n--- Generated Response ---")
    print("Content only:")
    print(result.content)


if __name__ == "__main__":
    main()
