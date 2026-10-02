import os
import re
from dotenv import load_dotenv

from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# Load environment variables
load_dotenv()

# ==============================================================================
# 1. INGESTION PIPELINE FUNCTIONS
# ==============================================================================

def clean_documents(documents):
    """Clean Wikipedia references, external links, and citation numbers from documents"""
    print("Cleaning document text (removing references and footnotes)...")
    stop_headers = [
        "\nReferences\n",
        "\nExternal links\n",
        "\nFurther reading\n",
        "\nSee also\n",
        "\nNotes\n",
    ]
    
    for doc in documents:
        # Cut off trailing sections starting from References, External links, etc.
        for stop in stop_headers:
            if stop in doc.page_content:
                doc.page_content = doc.page_content.split(stop)[0]
        
        # Remove citation brackets like [1], [118], [a], etc.
        doc.page_content = re.sub(r'\[(?:\d+|[a-z]|note\s*\d+)\]', '', doc.page_content)
        
    return documents


def load_documents(docs_path="docs"): 
    """Load all text files from the docs directory""" 
    print(f"Loading documents from '{docs_path}'...")
    
    if not os.path.exists(docs_path):
        raise FileNotFoundError(f"The directory '{docs_path}' does not exist. Please create it and add your text files.")
    
    loader = DirectoryLoader(docs_path, glob="*.txt", loader_cls=TextLoader)
    documents = loader.load()

    if len(documents) == 0:
        raise ValueError(f"No text files found in the directory '{docs_path}'.")

    print(f"Successfully loaded {len(documents)} documents.")
    return documents


def split_documents(documents, chunk_size=800, chunk_overlap=150):
    """Split documents into smaller chunks with overlap"""
    print(f"Splitting documents into chunks (size={chunk_size}, overlap={chunk_overlap})...")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks.")
    return chunks


def get_or_create_vector_store(persist_directory="db/chroma_db", docs_path="docs", force_rebuild=False): 
    """
    Check if a vector store exists on disk.
    If it exists, load it directly to avoid re-paying for embeddings.
    If not (or if force_rebuild=True), run the full ingestion pipeline.
    """
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    # If already built on disk, load it without re-embedding
    if os.path.exists(persist_directory) and not force_rebuild:
        vectorstore = Chroma(
            persist_directory=persist_directory,
            embedding_function=embeddings,
            collection_metadata={"hnsw:space": "cosine"}
        )
        count = vectorstore._collection.count()
        if count > 0:
            print(f"Existing vector store found with {count} vectors. Skipping ingestion.")
            return vectorstore

    print("No existing vector store found (or rebuild requested). Starting ingestion...")
    documents = load_documents(docs_path)
    documents = clean_documents(documents)
    chunks = split_documents(documents)

    print("Creating vector store with OpenAI Embeddings...")
    vectorstore = Chroma.from_documents(
        chunks,
        embeddings,
        persist_directory=persist_directory,
        collection_metadata={"hnsw:space": "cosine"}
    )
    
    print(f"Vector store created with {vectorstore._collection.count()} vectors.")
    return vectorstore


# ==============================================================================
# 2. CONVERSATIONAL RAG FUNCTIONS (CHAT & MEMORY)
# ==============================================================================

def ask_question(vectorstore, model, user_question, chat_history):
    print(f"\n--- Question: {user_question} ---")
    
    # Step 1: Make question standalone using chat history
    if chat_history:
        messages = [
            SystemMessage(content="Given the chat history, rewrite the new question to be standalone and searchable. Return ONLY the rewritten question."),
        ] + chat_history + [
            HumanMessage(content=f"New question: {user_question}")
        ]
        
        rewrite_result = model.invoke(messages)
        search_question = rewrite_result.content.strip()
        print(f"Standalone Query: {search_question}")
    else:
        search_question = user_question
    
    # Step 2: Retrieve relevant chunks
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    docs = retriever.invoke(search_question)
    
    print(f"Retrieved {len(docs)} relevant document chunks:")
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "Unknown")
        preview = doc.page_content.split("\n")[0][:80]
        print(f"  [{i}] ({source}): {preview}...")
    
    # Step 3: Combine query and documents into the prompt
    docs_text = "\n\n".join([f"- {doc.page_content}" for doc in docs])
    combined_input = f"""Based on the following documents, please answer this question: {user_question}

Documents:
{docs_text}

Please provide a clear, helpful answer using only the information from these documents. If you can't find the answer in the documents, say "I don't have enough information to answer that question based on the provided documents."
"""
    
    # Step 4: Generate response with LLM
    messages = [
        SystemMessage(content="You are a helpful assistant that answers questions based on provided documents and conversation history."),
    ] + chat_history + [
        HumanMessage(content=combined_input)
    ]
    
    result = model.invoke(messages)
    answer = result.content
    
    # Step 5: Save turn to history
    chat_history.append(HumanMessage(content=user_question))
    chat_history.append(AIMessage(content=answer))
    
    print(f"\nAnswer:\n{answer}\n")
    return answer


def start_chat(vectorstore):
    """Interactive chat loop with conversation history."""
    # Use gpt-4o-mini (fast and inexpensive) or gpt-4o
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    chat_history = []
    
    print("\n" + "=" * 65)
    print(" RAG Chatbot is Ready! Type 'quit' or 'exit' to stop.")
    print("=" * 65)
    
    while True:
        try:
            question = input("\nYour question: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break
            
        if not question:
            continue
            
        if question.lower() in ["quit", "exit", "q"]:
            print("Goodbye!")
            break
            
        ask_question(vectorstore, model, question, chat_history)


# ==============================================================================
# MAIN ENTRY POINT
# ==============================================================================

def main():
    # 1. Ingestion Pipeline: Get or create the vector store
    vectorstore = get_or_create_vector_store()

    # 2. Conversational Q&A: Start the interactive chat
    start_chat(vectorstore)


if __name__ == "__main__":
    main()