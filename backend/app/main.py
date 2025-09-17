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
from app.utils.image_processing import process_image_file, is_image_file, validate_image_file

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",  # Frontend URLs
        "chrome-extension://*",   # Allow Chrome extension
        "*"  # Allow all origins for development (restrict in production)
    ],
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

# Import and include county guidance router
from app.routers import county_guidance
app.include_router(county_guidance.router, prefix="/api/county-guidance", tags=["county-guidance"])

# Import county guidance service for caching
from app.services.county_guidance_service import county_guidance_service
from app.models.county_guidance import CountyGuidanceCreate

# Import for document handling
from datetime import datetime
from app.models.project import DocumentType
import uuid

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

def extract_text_from_file(file: UploadFile) -> dict:
    """
    Extract text from either PDF or image file
    Returns a dictionary with extracted text and metadata
    """
    try:
        # Read file content
        file_content = file.file.read()

        # Check if it's an image file
        if is_image_file(file.filename):
            print(f"📸 Processing image file: {file.filename}")

            # Validate image file
            validation = validate_image_file(file_content)
            if not validation["valid"]:
                return {
                    "text": "",
                    "error": validation["error"],
                    "file_type": "image",
                    "success": False
                }

            # Process image with Gemini Vision
            image_result = process_image_file(file_content, file.filename)

            return {
                "text": image_result.get("extracted_text", ""),
                "structured_data": image_result.get("structured_data", {}),
                "customer_address": image_result.get("customer_address", ""),
                "billing_period": image_result.get("billing_period", ""),
                "energy_consumption": image_result.get("energy_consumption", ""),
                "account_number": image_result.get("account_number", ""),
                "utility_company": image_result.get("utility_company", ""),
                "file_type": "image",
                "success": image_result.get("success", False),
                "error": image_result.get("error", None)
            }
        else:
            # Process as PDF
            print(f"📄 Processing PDF file: {file.filename}")

            # Reset file pointer
            file.file.seek(0)

            # Extract text using existing PDF function
            text = extract_text_from_pdf(file)

            return {
                "text": text,
                "structured_data": {},
                "customer_address": "",
                "billing_period": "",
                "energy_consumption": "",
                "account_number": "",
                "utility_company": "",
                "file_type": "pdf",
                "success": True,
                "error": None
            }

    except Exception as e:
        return {
            "text": "",
            "structured_data": {},
            "customer_address": "",
            "billing_period": "",
            "energy_consumption": "",
            "account_number": "",
            "utility_company": "",
            "file_type": "unknown",
            "success": False,
            "error": f"Failed to process file: {str(e)}"
        }

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
    """
    Enhanced PDF text extraction for planset documents
    Handles multiple text orientations and layouts
    """
    doc = fitz.open(stream=pdf_file.file.read(), filetype="pdf")
    text = ""
    if doc.page_count > 0:
        page = doc.load_page(0)

        # Extract text with different methods to catch rotated/positioned text
        # Method 1: Standard text extraction
        standard_text = page.get_text()

        # Method 2: Extract text blocks with position info
        text_blocks = page.get_text("dict")
        block_texts = []

        for block in text_blocks.get("blocks", []):
            if "lines" in block:
                for line in block["lines"]:
                    for span in line.get("spans", []):
                        if span.get("text", "").strip():
                            block_texts.append(span["text"].strip())

        # Combine all extracted text
        all_text = standard_text + "\n" + "\n".join(block_texts)

        # Clean up the text
        lines = all_text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line and len(line) > 2:  # Filter out very short lines
                cleaned_lines.append(line)

        text = "\n".join(cleaned_lines)

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

IMPORTANT: Do not use any markdown formatting like `**` or `##`. The output should be plain text.

Transform the original requirements into clear steps now:
"""
    response = query_gemini(prompt)
    
    smart_flow = response.replace('**', '')

    return {
        "jurisdiction_name": jurisdiction_name,
        "original_steps": steps,
        "smart_guidance_flow": smart_flow
    }

# --- Chrome Extension API Endpoints ---

class FieldAnalysis(BaseModel):
    url: str
    title: str
    timestamp: str
    fields: List[dict]

class AutoFillRequest(BaseModel):
    fields: List[dict]
    project: dict

class AutoFillResponse(BaseModel):
    fieldValues: dict
    success: bool
    message: str

@app.post("/api/analyze-fields")
async def analyze_fields(field_analysis: FieldAnalysis):
    """Receive and store field analysis from Chrome extension"""
    try:
        # For now, just log the received data
        # In the future, you could store this in the database for analytics
        print(f"📋 Received field analysis for {field_analysis.url}")
        print(f"🔍 Found {len(field_analysis.fields)} fields")

        # Log field types for debugging
        field_types = {}
        for field in field_analysis.fields:
            field_type = field.get('type', 'unknown')
            field_types[field_type] = field_types.get(field_type, 0) + 1

        print(f"📊 Field types: {field_types}")

        return {
            "success": True,
            "message": f"Analyzed {len(field_analysis.fields)} fields",
            "fieldTypes": field_types
        }

    except Exception as e:
        print(f"❌ Error analyzing fields: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze fields: {str(e)}"
        )

@app.get("/api/projects")
async def get_projects_for_extension():
    """Get all projects for Chrome extension (simplified, no auth for now)"""
    try:
        # For now, return mock data or get from database without auth
        # In production, you'd want to implement proper authentication

        # Get database connection
        from app.database import get_database
        db = await get_database()

        # Get all projects (simplified - in production add user filtering)
        projects_cursor = db.projects.find({}).sort("created_at", -1).limit(50)
        projects = []

        async for project in projects_cursor:
            # Get extracted text from documents if available
            planset_text = ""
            utility_bill_text = ""

            # Check if project has embedded documents with extracted text
            if project.get("planset_document") and project["planset_document"].get("extracted_text"):
                planset_text = project["planset_document"]["extracted_text"]

            if project.get("utility_bill_document") and project["utility_bill_document"].get("extracted_text"):
                utility_bill_text = project["utility_bill_document"]["extracted_text"]

            projects.append({
                "id": str(project["_id"]),
                "name": project["name"],
                "created_at": project["created_at"].isoformat(),
                "planset_text": planset_text,
                "utility_bill_text": utility_bill_text
            })

        print(f"📋 Returning {len(projects)} projects for extension")
        return projects

    except Exception as e:
        print(f"❌ Error fetching projects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}"
        )

@app.post("/api/auto-fill", response_model=AutoFillResponse)
async def auto_fill_form(request: AutoFillRequest):
    """Process form fields with project data using LLM"""
    try:
        print(f"🚀 Starting auto-fill for {len(request.fields)} fields")
        print(f"📋 Using project: {request.project.get('name', 'Unknown')}")

        # Prepare field descriptions for LLM
        field_descriptions = []
        for field in request.fields:
            field_desc = f"Field: {field.get('label', field.get('name', 'Unknown'))}"
            field_desc += f" (Type: {field.get('type', 'text')}"
            if field.get('options'):
                options = [opt.get('label', opt.get('value', '')) for opt in field['options']]
                field_desc += f", Options: {', '.join(options)}"
            field_desc += ")"
            field_descriptions.append(field_desc)

        # Create prompt for LLM
        prompt = f"""
You are a smart form-filling assistant for solar permit applications. Based on the provided project documents, fill out the form fields with appropriate values.

PROJECT INFORMATION:
Project Name: {request.project.get('name', 'N/A')}

PLANSET DOCUMENT TEXT:
{request.project.get('planset_text', 'No planset text available')}

UTILITY BILL TEXT:
{request.project.get('utility_bill_text', 'No utility bill text available')}

FORM FIELDS TO FILL:
{chr(10).join(field_descriptions)}

Please provide appropriate values for each field based on the document content. For radio buttons and dropdowns, select the most appropriate option from the available choices. For text fields, extract or derive the appropriate information from the documents.

Return your response as a JSON object where keys are the field IDs/names and values are the appropriate field values. For radio groups, return the value of the selected option.

Example format:
{{
    "customer_name": "John Smith",
    "program": "simple_solar",
    "service_type": "new_generating_facility",
    "project_address": "123 Main St, City, State"
}}
"""

        # Call Gemini API
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )

        # Parse the response
        response_text = response.text.strip()
        print(f"🤖 LLM Response: {response_text}")

        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            field_values = json.loads(json_match.group())
        else:
            # Fallback: create a simple mapping
            field_values = {}
            for field in request.fields:
                field_id = field.get('id', field.get('name', ''))
                if field_id:
                    field_values[field_id] = "Auto-filled value"

        print(f"✅ Generated field values: {field_values}")

        return AutoFillResponse(
            fieldValues=field_values,
            success=True,
            message=f"Successfully processed {len(field_values)} fields"
        )

    except Exception as e:
        print(f"❌ Auto-fill error: {e}")
        return AutoFillResponse(
            fieldValues={},
            success=False,
            message=f"Auto-fill failed: {str(e)}"
        )

# --- Endpoints ---
@app.post("/upload_pdfs/", response_model=UploadResponse)
async def upload_pdfs(
    pdf1: UploadFile = File(...),
    pdf2: UploadFile = File(...),
    project_name: str = Form(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload planset PDF and utility bill (PDF or image), extract text, create embeddings in Chroma,
    and extract specified keys from the combined text using Gemini.
    """
    # 🏠 IMPROVED: Extract customer address from planset first (more reliable than utility bills)
    print("🏠 Extracting customer address from planset (primary source)...")

    # Extract text from planset first page
    first_page_text_pdf1 = extract_first_page_text_fitz(pdf1)

    # Enhanced prompt for planset address extraction
    planset_address_prompt = f"""
    Extract the CUSTOMER/PROPERTY address from this solar planset document.

    This is a solar installation planset. Look specifically for:
    - "RESIDENCE LOCATED AT" followed by an address
    - "PROPERTY ADDRESS" or "CUSTOMER ADDRESS"
    - Address in the project scope/description section
    - Installation address or service address
    - The address where the solar PV system will be installed

    Common patterns in plansets:
    - "TO INSTALL A ROOF MOUNTED SOLAR PHOTOVOLTAIC SYSTEM AT THE OWNER RESIDENCE LOCATED AT [ADDRESS]"
    - Address may appear in the top section or side margins
    - May be formatted across multiple lines

    IGNORE these addresses:
    - Contractor company addresses (like "FLO ENERGY" office address)
    - Utility company addresses
    - Engineering firm addresses
    - Any business/corporate addresses

    Return ONLY the complete customer property address in format: [Street Number] [Street Name], [City], [State] [ZIP]
    If no customer address is found, return "N/A"

    Planset Text:
    {first_page_text_pdf1}
    """

    customer_address = query_gemini(planset_address_prompt)
    print(f"📋 Address extracted from planset: {customer_address}")

    # Process utility bill for additional data (energy consumption, billing info, etc.)
    print("📊 Processing utility bill for energy data...")
    utility_result = extract_text_from_file(pdf2)

    if not utility_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process utility bill: {utility_result.get('error', 'Unknown error')}"
        )

    # Validate planset address and use utility bill as fallback ONLY if planset extraction completely fails
    if not customer_address or customer_address.strip().lower() in ["n/a", "", "not found"]:
        print("⚠️ No valid address found in planset, trying utility bill as fallback...")

        if utility_result["file_type"] == "image":
            # For images, use the extracted address from Gemini Vision
            customer_address = utility_result.get("customer_address", "N/A")
            print(f"📸 Fallback address from utility image: {customer_address}")
        else:
            # For PDFs, extract address using text analysis
            utility_text = utility_result["text"]
            if utility_text.strip():
                utility_address_prompt = f"""
                Extract the customer service address or billing address from this utility bill text.
                Look for the address where the service is provided, not the utility company's address.
                Return only the complete address (street, city, state, ZIP) or "N/A" if not found.

                Utility Bill Text:
                {utility_text}
                """
                customer_address = query_gemini(utility_address_prompt)
                print(f"📄 Fallback address from utility PDF: {customer_address}")
    else:
        print(f"✅ Using planset address (more reliable): {customer_address}")

    print(f"🎯 Final customer address: {customer_address}")

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

    # 🚀 NEW: Check cache first before processing Excel/Google Sheets
    print(f"🔍 Checking cache for county: {selected_jurisdiction}")
    cached_guidance = await county_guidance_service.get_county_guidance(selected_jurisdiction)

    excel_guidance_result = {}

    if cached_guidance:
        print(f"✅ Found cached guidance for {selected_jurisdiction} (used {cached_guidance.usage_count} times)")
        excel_guidance_result = {
            "smart_guidance_flow": cached_guidance.smart_guidance_flow
        }
    else:
        print(f"❌ No cached guidance found for {selected_jurisdiction}. Processing from Excel/Google Sheets...")

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

                    # 🚀 NEW: Cache the result for future use
                    if excel_guidance_result.get("smart_guidance_flow"):
                        print(f"💾 Caching guidance for {selected_jurisdiction}")
                        try:
                            guidance_create = CountyGuidanceCreate(
                                county_name=selected_jurisdiction,
                                smart_guidance_flow=excel_guidance_result["smart_guidance_flow"]
                            )
                            await county_guidance_service.create_county_guidance(guidance_create)
                            print(f"✅ Successfully cached guidance for {selected_jurisdiction}")
                        except Exception as cache_error:
                            print(f"⚠️  Warning: Failed to cache guidance: {cache_error}")
                            # Continue processing even if caching fails

            except Exception as e:
                import traceback
                print(f"Warning: Error processing Google Sheet: {type(e).__name__}: {e}")
                print(f"Traceback: {traceback.format_exc()}")
                # Don't raise the exception, just continue with normal processing

    # Create a project with the extracted data (moved outside the Google Sheets block)
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
        project_id = str(created_project.id)
    except Exception as e:
        print(f"Warning: Failed to create project: {e}")
        # If project creation fails, we can't save documents, so return early
        if excel_guidance_result.get("smart_guidance_flow"):
            return {
                "message": "Smart guidance generated successfully, but project creation failed.",
                "pdf_extracted_keys": None,
                "excel_jurisdiction_name": excel_guidance_result.get("jurisdiction_name"),
                "excel_original_steps": excel_guidance_result.get("original_steps"),
                "excel_smart_guidance_flow": excel_guidance_result.get("smart_guidance_flow"),
            }
        project_id = None

    # Reset pdf1 file pointer for text extraction
    pdf1.file.seek(0)

    # 1️⃣ Extract text from planset PDF first
    text1 = extract_text_from_pdf(pdf1)  # Planset is always PDF
    print(f"📄 Extracted planset text: {len(text1)} characters")

    # 2️⃣ Get utility bill text from already processed result
    text2 = utility_result["text"]
    print(f"📄 Extracted utility bill text: {len(text2)} characters")

    # 🚀 IMPORTANT: Save PDFs as embedded documents in the project
    documents_saved = []
    if project_id:
        print(f"💾 Saving PDFs as embedded documents to project {project_id}")

        # Reset file pointers to beginning
        pdf1.file.seek(0)
        pdf2.file.seek(0)

        # Create upload directory
        upload_dir = f"uploads/projects/{project_id}"
        os.makedirs(upload_dir, exist_ok=True)

        # Save planset PDF
        planset_filename = f"{uuid.uuid4()}_{pdf1.filename}"
        planset_path = os.path.join(upload_dir, planset_filename)

        with open(planset_path, "wb") as buffer:
            planset_content = await pdf1.read()
            buffer.write(planset_content)

        # Add planset as embedded document with extracted text
        planset_success = await project_service.add_embedded_document(
            project_id=project_id,
            owner_id=str(current_user.id),
            document_type=DocumentType.PLANSET,
            filename=pdf1.filename,
            file_path=planset_path,
            extracted_text=text1,  # Save extracted planset text
            customer_address=customer_address  # Save extracted address
        )

        if planset_success:
            documents_saved.append({
                "filename": pdf1.filename,
                "document_type": "planset",
                "uploaded_at": datetime.utcnow()
            })
            print(f"✅ Saved planset document: {pdf1.filename}")

        # Save utility bill PDF
        utility_filename = f"{uuid.uuid4()}_{pdf2.filename}"
        utility_path = os.path.join(upload_dir, utility_filename)

        with open(utility_path, "wb") as buffer:
            utility_content = await pdf2.read()
            buffer.write(utility_content)

        # Add utility bill as embedded document with extracted text
        utility_success = await project_service.add_embedded_document(
            project_id=project_id,
            owner_id=str(current_user.id),
            document_type=DocumentType.UTILITY_BILL,
            filename=pdf2.filename,
            file_path=utility_path,
            extracted_text=text2,  # Save extracted utility bill text
            analysis_results=utility_result  # Save utility analysis results
        )

        if utility_success:
            documents_saved.append({
                "filename": pdf2.filename,
                "document_type": "utility_bill",
                "uploaded_at": datetime.utcnow()
            })
            print(f"✅ Saved utility bill document: {pdf2.filename}")

        print(f"📊 Total documents saved: {len(documents_saved)}")

    # Return early if we have guidance from cache or Google Sheets
    if excel_guidance_result.get("smart_guidance_flow"):
        return {
            "message": "Smart guidance generated successfully.",
            "project_id": project_id,
            "documents_saved": documents_saved,
            "pdf_extracted_keys": None,
            "excel_jurisdiction_name": excel_guidance_result.get("jurisdiction_name"),
            "excel_original_steps": excel_guidance_result.get("original_steps"),
            "excel_smart_guidance_flow": excel_guidance_result.get("smart_guidance_flow"),
        }

    # Combine extracted texts for LLM processing
    full_text = text1 + "\n" + text2

    # Log utility bill processing results (already processed above)
    print(f"📋 Final processing summary:")
    print(f"   - Planset text length: {len(text1)} characters")
    print(f"   - Utility bill text length: {len(text2)} characters")
    print(f"   - Customer address used: {customer_address}")
    if utility_result["file_type"] == "image":
        print(f"   - Image processing results:")
        print(f"     • Customer Address: {utility_result.get('customer_address', 'N/A')}")
        print(f"     • Energy Consumption: {utility_result.get('energy_consumption', 'N/A')}")
        print(f"     • Billing Period: {utility_result.get('billing_period', 'N/A')}")
        print(f"     • Utility Company: {utility_result.get('utility_company', 'N/A')}")

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

IMPORTANT: Do not use any markdown formatting like `**` or `##`. The output should be plain text.

Transform the original requirements into clear steps now:
"""
    # Call Gemini to enhance steps
    response = query_gemini(prompt)

    smart_flow = response.replace('**', '')

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
