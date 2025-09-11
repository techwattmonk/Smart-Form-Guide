from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional # Added Optional
import fitz  # PyMuPDF
import pandas as pd
from sentence_transformers import SentenceTransformer
import chromadb
import uuid
from google import genai
import dotenv
import io # Import io module
import json # Import json module
import os # Import os module for path manipulation
from app.routers import auth, users, projects
from app.database import connect_to_mongo, close_mongo_connection
from app.models.user import UserInDB
from app.routers.auth import get_current_user
from app.services.project_service import ProjectService

from app.services.hometown import get_jurisdiction
from app.services.google_sheets import get_google_sheet_data

# --- Config ---
# Google Sheet Configuration
SPREADSHEET_ID = dotenv.get_key(".env", "SPREADSHEET_ID")
WORKSHEET_NAME = dotenv.get_key(".env", "WORKSHEET_NAME")

# Gemini GenAI API key
GENAI_API_KEY = dotenv.get_key(".env", "GENAI_API_KEY")
# Initialize embedding model
embed_model = SentenceTransformer("all-mpnet-base-v2")

# Initialize ChromaDB (local persistent storage)
client_chroma = chromadb.PersistentClient(path="./chroma_db")
collection = client_chroma.get_or_create_collection(name="pdf-embeddings")

# Initialize Gemini GenAI client
client = genai.Client(api_key=GENAI_API_KEY)

# --- FastAPI app ---
app = FastAPI(
    title="Smart Form Guide API",
    description="Backend API for Smart Form Guide application with authentication and file upload capabilities",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database events
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])

# --- Models ---
class UploadResponse(BaseModel):
    message: str
    pdf_extracted_keys: Optional[str] = None
    excel_jurisdiction_name: Optional[str] = None
    excel_original_steps: Optional[str] = None
    excel_smart_guidance_flow: Optional[str] = None

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
    response = client.models.generate_content(
        model=model_name,
        contents=prompt
    )
    return response.text

def extract_first_page_text_fitz(pdf_file: UploadFile) -> str:
    doc = fitz.open(stream=pdf_file.file.read(), filetype="pdf")
    text = ""
    if doc.page_count > 0:
        text = doc.load_page(0).get_text()
    doc.close()
    return text

async def process_excel_or_csv_guidance(file_content: bytes, file_type: str, jurisdiction_name: str):
    file_like_object = io.BytesIO(file_content)
    
    df = None
    if file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        try:
            df = pd.read_excel(file_like_object, engine="openpyxl", header=None, skiprows=1)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading XLSX file: {e}"
            )
    elif file_type == "application/vnd.ms-excel":
        try:
            df = pd.read_excel(file_like_object, engine="xlrd", header=None, skiprows=1)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading XLS file: {e}"
            )
    elif file_type == "text/csv":
        try:
            df = pd.read_csv(file_like_object, header=None, skiprows=1)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading CSV file: {e}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .xlsx, .xls Excel, and .csv files are supported."
        )

    if df.shape[1] < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must contain at least two columns for 'jurisdiction_name' and 'steps_to_follow'."
        )
    df.columns = ["jurisdiction_name", "steps_to_follow"] + list(df.columns[2:])

    df["jurisdiction_name"] = df["jurisdiction_name"].astype(str)
    df["steps_to_follow"] = df["steps_to_follow"].astype(str)

    # Strip whitespace and compare (case-insensitive)
    matching_rows = df[df["jurisdiction_name"].str.lower().str.strip() == jurisdiction_name.lower().strip()]

    if matching_rows.empty:
        return {
            "jurisdiction_name": jurisdiction_name,
            "original_steps": None,
            "smart_guidance_flow": f"Jurisdiction '{jurisdiction_name}' not found in the file"
        }

    jurisdiction_row_index = matching_rows.index[0]
    online_link = df.loc[jurisdiction_row_index, "steps_to_follow"]

    if jurisdiction_row_index + 1 >= len(df):
        return {
            "jurisdiction_name": jurisdiction_name,
            "original_steps": online_link, # If no steps, the link itself can be considered the guidance
            "smart_guidance_flow": f"Online Link: {online_link}\nNo detailed steps found for jurisdiction '{jurisdiction_name}'. Only the online link is available."
        }

    steps = df.loc[jurisdiction_row_index + 1, "steps_to_follow"]

    prompt = f"""
You are an expert in creating user-friendly permit application guidance. Your task is to analyze the original permit requirements and transform them into clear, actionable steps that users can easily follow.

ORIGINAL PERMIT REQUIREMENTS:
{steps}

ONLINE PORTAL LINK:
{online_link}

INSTRUCTIONS:
1. Carefully analyze the original permit requirements above
2. Identify each distinct requirement or step mentioned
3. Transform each requirement into a clear, actionable step that tells users exactly what they need to DO
4. Maintain the SAME ORDER as the original requirements
5. Use simple, direct language that any homeowner can understand
6. Include specific details mentioned in the original requirements (addresses, timeframes, contact info, etc.)
7. If fees or payments are mentioned, include that information
8. If pickup locations are mentioned, include the exact address
9. If timeframes are mentioned (like "8 weeks"), include those

FORMAT YOUR RESPONSE AS:
Step 1: [Clear action the user needs to take]
Step 2: [Next clear action]
Step 3: [Next clear action]
...and so on

EXAMPLE OF GOOD STEPS:
- "Prepare detailed solar plans including site plans and electrical diagrams"
- "Obtain recorded Notice of Commencement from the county clerk"
- "Submit application through the online portal at [specific link]"
- "Wait for permit review and approval (approximately 8 weeks)"
- "Pay permit fees online through the portal"
- "Pick up approved permit in person at [specific address]"

Remember: Each step should be a specific ACTION the user needs to take, not just information. Focus on what they need to DO, not just what they need to know.

Transform the original requirements into clear steps now:
"""
    response = query_gemini(prompt)
    smart_flow = response

    return {
        "jurisdiction_name": jurisdiction_name,
        "original_steps": steps,
        "smart_guidance_flow": smart_flow
    }

# --- Endpoints ---
@app.post("/upload_pdfs/", response_model=UploadResponse)
async def upload_pdfs(
    pdf1: UploadFile = File(...),
    pdf2: UploadFile = File(...),
    project_name: str = Form(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload two PDFs, extract text, create embeddings in Chroma,
    and extract specified keys from the combined text using Gemini.
    """
    # Pre-step: Extract text from PDF2's first page and get customer address
    first_page_text_pdf1 = extract_first_page_text_fitz(pdf1)
    
    address_prompt = f"""
    Extract the customer address from the following text. If no address is found, return "N/A".
    Text:
    {first_page_text_pdf1}
    """
    customer_address = query_gemini(address_prompt)
    
    # Immediately pass the customer address to hometown.py
    jurisdiction_details = get_jurisdiction(customer_address)

    # Select the most specific jurisdiction name
    selected_jurisdiction = "N/A"
    if jurisdiction_details:
        if jurisdiction_details.get("county"):
            selected_jurisdiction = jurisdiction_details["county"]
        elif jurisdiction_details.get("township"):
            selected_jurisdiction = jurisdiction_details["township"]
        elif jurisdiction_details.get("place"):
            selected_jurisdiction = jurisdiction_details["place"]

    # Check if Google Sheet processing is desired and credentials are available
    if SPREADSHEET_ID and WORKSHEET_NAME:
        try:
            # Construct the path to credentials.json relative to the current file
            credentials_file_path = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "credentials.json"))

            # Check if credentials file exists
            if not os.path.exists(credentials_file_path):
                print(f"Warning: Google Sheets credentials file not found at {credentials_file_path}. Skipping Google Sheets processing.")
            else:
                print(f"Attempting to fetch Google Sheets data for jurisdiction: {selected_jurisdiction}")
                # Fetch data from Google Sheet
                sheet_data_bytes = get_google_sheet_data(
                    spreadsheet_id=SPREADSHEET_ID,
                    worksheet_name=WORKSHEET_NAME,
                    credentials_path=credentials_file_path # Use the relative path
                )
                print(f"Successfully retrieved {len(sheet_data_bytes)} bytes from Google Sheets")

                # Treat Google Sheet data as CSV for process_excel_or_csv_guidance
                print(f"Processing Excel guidance for jurisdiction: {selected_jurisdiction}")
                excel_guidance_result = await process_excel_or_csv_guidance(
                    file_content=sheet_data_bytes,
                    file_type="text/csv", # Google Sheets data is returned as CSV
                    jurisdiction_name=selected_jurisdiction
                )
                print(f"Excel guidance processing completed successfully")

                # Create a project with the extracted data
                project_service = ProjectService()

                # Use the provided project name
                final_project_name = project_name.strip()

                # Create project with extracted county and smart guidance flow
                from app.models.project import ProjectCreate
                project_data = ProjectCreate(
                    name=final_project_name,
                    county_name=selected_jurisdiction,
                    smart_guidance_flow=excel_guidance_result.get("smart_guidance_flow"),
                    status="draft"
                )

                try:
                    created_project = await project_service.create_project(project_data, str(current_user.id))
                    print(f"Created project: {created_project.name} with county: {created_project.county_name}")
                except Exception as e:
                    print(f"Warning: Failed to create project: {e}")

                return {
                    "message": "Google Sheet data processed and smart guidance generated.",
                    "pdf_extracted_keys": None,
                    "excel_jurisdiction_name": excel_guidance_result.get("jurisdiction_name"),
                    "excel_original_steps": excel_guidance_result.get("original_steps"),
                    "excel_smart_guidance_flow": excel_guidance_result.get("smart_guidance_flow"),
                }
        except Exception as e:
            import traceback
            print(f"Warning: Error processing Google Sheet: {type(e).__name__}: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            # Don't raise the exception, just continue with normal processing

    # Reset pdf1 file pointer after reading its first page
    pdf1.file.seek(0)

    # 1️⃣ Extract text from PDFs
    text1 = extract_text_from_pdf(pdf1)
    text2 = extract_text_from_pdf(pdf2)
    full_text = text1 + "\n" + text2

    # 2️⃣ Store embeddings in Chroma
    store_in_chroma(text1, "pdf1")
    store_in_chroma(text2, "pdf2")

    # 3️⃣ Prepare prompt for Gemini key extraction
    # Read keys from fields.json
    try:
        # Construct the path to fields.json relative to the backend directory
        fields_file_path = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fields.json"))
        with open(fields_file_path, "r") as f:
            keys = json.load(f)
        keys_str = "\n".join(keys)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"fields.json not found at {fields_file_path}."
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error decoding fields.json. Ensure it's valid JSON."
        )

    prompt = f"""
Extract the following keys from the text below and return in JSON format:
{keys_str}

Text:
{full_text}
"""
    extracted_keys = query_gemini(prompt)

    return {
        "message": "PDFs processed, embeddings stored in Chroma, keys extracted.",
        "pdf_extracted_keys": extracted_keys,
        "excel_jurisdiction_name": None,
        "excel_original_steps": None,
        "excel_smart_guidance_flow": None,
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

@app.post("/upload_excel_generate_guidance/")
async def upload_excel_generate_guidance(
    file: UploadFile = File(...),
    jurisdiction_name: str = Form(...)
):
    """
    Upload Excel with 'jurisdiction_name' and 'steps_to_follow' columns.
    Provide jurisdiction_name separately; backend finds it and calls Gemini.
    """
    # Read the content of the UploadFile into a BytesIO object
    # This ensures the file-like object is fully buffered and seekable for pandas
    contents = await file.read()
    file_like_object = io.BytesIO(contents)
    
    df = None
    if file.content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        try:
            df = pd.read_excel(file_like_object, engine="openpyxl", header=None, skiprows=1)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading XLSX file: {e}"
            )
    elif file.content_type == "application/vnd.ms-excel":
        try:
            df = pd.read_excel(file_like_object, engine="xlrd", header=None, skiprows=1)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading XLS file: {e}"
            )
    elif file.content_type == "text/csv":
        try:
            df = pd.read_csv(file_like_object, header=None, skiprows=1)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading CSV file: {e}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .xlsx, .xls Excel, and .csv files are supported."
        )

    # Assign column names as there are no headers in the file
    if df.shape[1] < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must contain at least two columns for 'jurisdiction_name' and 'steps_to_follow'."
        )
    df.columns = ["jurisdiction_name", "steps_to_follow"] + list(df.columns[2:])

    # Ensure the assigned columns are treated as strings for comparison
    df["jurisdiction_name"] = df["jurisdiction_name"].astype(str)
    df["steps_to_follow"] = df["steps_to_follow"].astype(str)

    # Find the row index where the jurisdiction_name matches
    matching_rows = df[df["jurisdiction_name"].str.lower() == jurisdiction_name.lower()]

    if matching_rows.empty:
        return {"error": f"Jurisdiction '{jurisdiction_name}' not found in the file"}

    # Get the index of the first matching row
    jurisdiction_row_index = matching_rows.index[0]

    # Extract the URL from the 'steps_to_follow' column of the matching row
    online_link = df.loc[jurisdiction_row_index, "steps_to_follow"]

    # Check if there is a next row for steps
    if jurisdiction_row_index + 1 >= len(df):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No steps found for jurisdiction '{jurisdiction_name}'. Expected a row following the jurisdiction entry."
        )

    # Extract the steps from the 'steps_to_follow' column of the next row
    steps = df.loc[jurisdiction_row_index + 1, "steps_to_follow"]

    prompt = f"""
You are an expert in creating user-friendly permit application guidance. Your task is to analyze the original permit requirements and transform them into clear, actionable steps that users can easily follow.

ORIGINAL PERMIT REQUIREMENTS:
{steps}

ONLINE PORTAL LINK:
{online_link}

INSTRUCTIONS:
1. Carefully analyze the original permit requirements above
2. Identify each distinct requirement or step mentioned
3. Transform each requirement into a clear, actionable step that tells users exactly what they need to DO
4. Maintain the SAME ORDER as the original requirements
5. Use simple, direct language that any homeowner can understand
6. Include specific details mentioned in the original requirements (addresses, timeframes, contact info, etc.)
7. If fees or payments are mentioned, include that information
8. If pickup locations are mentioned, include the exact address
9. If timeframes are mentioned (like "8 weeks"), include those

FORMAT YOUR RESPONSE AS:
Step 1: [Clear action the user needs to take]
Step 2: [Next clear action]
Step 3: [Next clear action]
...and so on

EXAMPLE OF GOOD STEPS:
- "Prepare detailed solar plans including site plans and electrical diagrams"
- "Obtain recorded Notice of Commencement from the county clerk"
- "Submit application through the online portal at [specific link]"
- "Wait for permit review and approval (approximately 8 weeks)"
- "Pay permit fees online through the portal"
- "Pick up approved permit in person at [specific address]"

Remember: Each step should be a specific ACTION the user needs to take, not just information. Focus on what they need to DO, not just what they need to know.

Transform the original requirements into clear steps now:
"""
    # Call Gemini to enhance steps
    response = query_gemini(prompt)

    smart_flow = response

    return {
        "jurisdiction_name": jurisdiction_name,
        "original_steps": steps,
        "smart_guidance_flow": smart_flow
    }

@app.get("/")
async def root():
    return {"message": "Smart Form Guide API is running!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Smart Form Guide API"}
