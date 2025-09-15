from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import os
import uuid
import fitz  # PyMuPDF for text extraction
from app.routers.auth import get_current_user
from app.models.user import UserInDB
from app.models.project import ProjectCreate, ProjectUpdate, Project, DocumentCreate, DocumentType
from app.services.project_service import project_service

router = APIRouter()

def extract_text_from_pdf(pdf_file: UploadFile) -> str:
    """Extract text from PDF file"""
    try:
        doc = fitz.open(stream=pdf_file.file.read(), filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(
    project_create: ProjectCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new project for the current user"""
    try:
        project = await project_service.create_project(project_create, str(current_user.id))
        # Return the project data with proper field mapping for JSON response
        return {
            "id": str(project.id),
            "name": project.name,
            "county_name": project.county_name,
            "smart_guidance_flow": project.smart_guidance_flow,
            "status": project.status,
            "owner_id": str(project.owner_id),
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
            "document_count": project.document_count,
            "last_analysis_date": project.last_analysis_date.isoformat() if project.last_analysis_date else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )

@router.get("/", response_model=List[Project])
async def get_user_projects(
    skip: int = Query(0, ge=0, description="Number of projects to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of projects to return"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all projects for the current user"""
    try:
        projects = await project_service.get_user_projects(str(current_user.id), skip, limit)
        return projects
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}"
        )

@router.get("/count")
async def get_project_count(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get the total number of projects for the current user"""
    try:
        count = await project_service.get_project_count(str(current_user.id))
        return {"count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project count: {str(e)}"
        )

@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get a specific project by ID"""
    try:
        project = await project_service.get_project_by_id(project_id, str(current_user.id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}"
        )

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update a specific project"""
    try:
        project = await project_service.update_project(project_id, project_update, str(current_user.id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        )

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a specific project and all its documents"""
    try:
        success = await project_service.delete_project(project_id, str(current_user.id))
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )

@router.get("/{project_id}/documents")
async def get_project_documents(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all documents for a specific project"""
    try:
        documents = await project_service.get_project_documents(project_id, str(current_user.id))
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project documents: {str(e)}"
        )

@router.post("/{project_id}/upload")
async def upload_documents_to_project(
    project_id: str,
    pdf1: UploadFile = File(..., description="Planset PDF"),
    pdf2: UploadFile = File(..., description="Utility Bill PDF"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Upload documents to a specific project"""
    try:
        # Verify project exists and belongs to user
        project = await project_service.get_project_by_id(project_id, str(current_user.id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Create upload directory if it doesn't exist
        upload_dir = f"uploads/projects/{project_id}"
        os.makedirs(upload_dir, exist_ok=True)

        # Save files and add as embedded documents
        documents = []

        # Process planset PDF
        planset_filename = f"{uuid.uuid4()}_{pdf1.filename}"
        planset_path = os.path.join(upload_dir, planset_filename)

        # Extract text from planset before saving
        pdf1.file.seek(0)  # Reset file pointer
        planset_text = extract_text_from_pdf(pdf1)

        # Reset file pointer again for saving
        pdf1.file.seek(0)
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
            extracted_text=planset_text
        )

        if planset_success:
            documents.append({
                "filename": pdf1.filename,
                "document_type": DocumentType.PLANSET,
                "uploaded_at": datetime.utcnow()
            })

        # Process utility bill PDF
        utility_filename = f"{uuid.uuid4()}_{pdf2.filename}"
        utility_path = os.path.join(upload_dir, utility_filename)

        # Extract text from utility bill before saving
        pdf2.file.seek(0)  # Reset file pointer
        utility_text = extract_text_from_pdf(pdf2)

        # Reset file pointer again for saving
        pdf2.file.seek(0)
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
            extracted_text=utility_text
        )

        if utility_success:
            documents.append({
                "filename": pdf2.filename,
                "document_type": DocumentType.UTILITY_BILL,
                "uploaded_at": datetime.utcnow()
            })

        return {
            "message": "Documents uploaded successfully",
            "project_id": project_id,
            "documents": documents
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload documents: {str(e)}"
        )

@router.get("/{project_id}/documents")
async def get_project_documents(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all documents for a specific project (including embedded documents)"""
    try:
        # Get embedded documents from the project
        embedded_docs = await project_service.get_embedded_documents(project_id, str(current_user.id))

        # Also get legacy documents for backward compatibility
        legacy_docs = await project_service.get_project_documents(project_id, str(current_user.id))

        # Convert legacy documents to dict format
        legacy_docs_dict = [
            {
                "id": str(doc.id),
                "filename": doc.filename,
                "document_type": doc.document_type,
                "file_size": doc.file_size,
                "content_type": doc.content_type,
                "uploaded_at": doc.uploaded_at,
                "extracted_text": doc.extracted_text,
                "analysis_results": doc.analysis_results,
                "customer_address": doc.customer_address,
                "jurisdiction_details": doc.jurisdiction_details
            } for doc in legacy_docs
        ]

        # Combine both types of documents
        all_documents = embedded_docs + legacy_docs_dict

        return {
            "project_id": project_id,
            "documents": all_documents,
            "total_count": len(all_documents)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project documents: {str(e)}"
        )

@router.get("/{project_id}/extracted-text")
async def get_project_extracted_text(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get extracted text from all documents in a project for form auto-fill"""
    try:
        # Verify project exists and belongs to user
        project = await project_service.get_project_by_id(project_id, str(current_user.id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Get all documents for the project
        documents = await project_service.get_project_documents(project_id, str(current_user.id))

        # Initialize response data
        extracted_data = {
            "planset_text": "",
            "utility_text": "",
            "customer_address": "",
            "energy_consumption": "",
            "utility_company": "",
            "account_number": "",
            "billing_period": ""
        }

        # Extract text from documents
        for doc in documents:
            if doc.document_type == "planset" and doc.extracted_text:
                extracted_data["planset_text"] = doc.extracted_text
                if doc.customer_address:
                    extracted_data["customer_address"] = doc.customer_address

            elif doc.document_type == "utility_bill" and doc.extracted_text:
                extracted_data["utility_text"] = doc.extracted_text

                # Extract utility-specific data from analysis results
                if doc.analysis_results:
                    analysis = doc.analysis_results
                    extracted_data["energy_consumption"] = analysis.get("energy_consumption", "")
                    extracted_data["utility_company"] = analysis.get("utility_company", "")
                    extracted_data["account_number"] = analysis.get("account_number", "")
                    extracted_data["billing_period"] = analysis.get("billing_period", "")

        return extracted_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get extracted text: {str(e)}"
        )
