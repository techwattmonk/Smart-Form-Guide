from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from contextlib import asynccontextmanager
import fitz  # PyMuPDF
from sentence_transformers import SentenceTransformer
import chromadb
import uuid
from google import generativeai as genai
import dotenv
from app.routers import auth, users
from app.database import connect_to_mongo, close_mongo_connection

# --- Config ---
# Gemini GenAI API key
GENAI_API_KEY = dotenv.get_key(".env", "GENAI_API_KEY")

# Validate API key
if not GENAI_API_KEY or GENAI_API_KEY == "your-gemini-api-key-here":
    print("WARNING: Gemini API key not configured. Please set GENAI_API_KEY in .env file")
    GENAI_API_KEY = None

# Initialize embedding model
embed_model = SentenceTransformer("all-mpnet-base-v2")

# Initialize ChromaDB (local persistent storage) with telemetry disabled
import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
client_chroma = chromadb.PersistentClient(path="./chroma_db")
collection = client_chroma.get_or_create_collection(name="pdf-embeddings")

# Initialize Gemini GenAI client only if API key is available
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# --- Lifespan events ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

# --- FastAPI app ---
app = FastAPI(
    title="Smart Form Guide API",
    description="Backend API for Smart Form Guide application with authentication and file upload capabilities",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

# --- Models ---
class UploadPDFResponse(BaseModel):
    message: str
    extracted_keys: str

class QueryRequest(BaseModel):
    question: str
    top_k: int = 3

class QueryResponse(BaseModel):
    answer: str

# --- Helper Functions ---
def extract_text_from_pdf(pdf_file: UploadFile) -> str:
    doc = fitz.open(stream=pdf_file.file.read(), filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def store_in_chroma(text: str, source_name: str):
    # create embedding
    vector = embed_model.encode(text).tolist()
    doc_id = str(uuid.uuid4())
    collection.add(
        ids=[doc_id],
        embeddings=[vector],
        metadatas=[{"source": source_name}],
        documents=[text]
    )

def query_gemini(prompt: str, model_name: str = "gemini-2.0-flash") -> str:
    if not GENAI_API_KEY:
        return "Error: Gemini API key not configured. Please set GENAI_API_KEY in .env file"

    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating content: {str(e)}"

# --- Endpoints ---
@app.post("/upload_pdfs/", response_model=UploadPDFResponse)
async def upload_pdfs(
    pdf1: UploadFile = File(...),
    pdf2: UploadFile = File(...),
    keys: List[str] = Form(...)
):
    """
    Upload two PDFs, extract text, create embeddings in Chroma,
    and extract specified keys from the combined text using Gemini.
    """
    # 1️⃣ Extract text from PDFs
    text1 = extract_text_from_pdf(pdf1)
    text2 = extract_text_from_pdf(pdf2)
    full_text = text1 + "\n" + text2

    # 2️⃣ Store embeddings in Chroma
    store_in_chroma(text1, "pdf1")
    store_in_chroma(text2, "pdf2")

    # 3️⃣ Prepare prompt for Gemini key extraction
    keys_str = "\n".join(keys)
    prompt = f"""
Extract the following keys from the text below and return in JSON format:
{keys_str}

Text:
{full_text}
"""
    extracted_keys = query_gemini(prompt)

    # If Gemini fails, provide a basic fallback response
    if extracted_keys.startswith("Error:"):
        extracted_keys = f"""{{
    "status": "processed_without_ai",
    "message": "Files uploaded successfully. AI analysis unavailable - please configure Gemini API key.",
    "files_processed": ["planset.pdf", "utility_bill.pdf"],
    "text_length": {len(full_text)}
}}"""

    return {
        "message": "PDFs processed, embeddings stored in Chroma, keys extracted.",
        "extracted_keys": extracted_keys
    }

@app.post("/query/", response_model=QueryResponse)
async def query(question: QueryRequest):
    """
    Semantic search over stored PDF embeddings + Gemini answer generation.
    """
    # 1️⃣ Embed the question
    q_embedding = embed_model.encode(question.question).tolist()

    # 2️⃣ Query Chroma for top-k relevant documents
    results = collection.query(
        query_embeddings=[q_embedding],
        n_results=question.top_k
    )

    # 3️⃣ Combine retrieved chunks
    retrieved_docs = results["documents"][0]
    context = "\n\n".join(retrieved_docs)

    # 4️⃣ Prepare Gemini prompt
    prompt = f"""
You are a helpful assistant. Use the following context to answer the question.
Context:
{context}

Question:
{question.question}

Answer clearly and concisely:
"""
    # 5️⃣ Get answer from Gemini
    answer = query_gemini(prompt)

    return {"answer": answer}

@app.get("/")
async def root():
    return {"message": "Smart Form Guide API is running!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Smart Form Guide API"}
