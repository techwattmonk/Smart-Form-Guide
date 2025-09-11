from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from typing import List, Optional
import os
import uuid
from app.routers.auth import get_current_user
from app.models.user import UserInDB
from app.models.project import ProjectCreate, ProjectUpdate, Project, DocumentCreate, DocumentType
from app.services.project_service import project_service

router = APIRouter()

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

        # Save files and create document records
        documents = []

        # Process planset PDF
        planset_filename = f"{uuid.uuid4()}_{pdf1.filename}"
        planset_path = os.path.join(upload_dir, planset_filename)

        with open(planset_path, "wb") as buffer:
            content = await pdf1.read()
            buffer.write(content)

        planset_doc = DocumentCreate(
            filename=pdf1.filename,
            document_type=DocumentType.PLANSET,
            file_size=len(content),
            content_type=pdf1.content_type,
            project_id=project.id
        )

        planset_document = await project_service.create_document(
            planset_doc, str(current_user.id), planset_path
        )
        documents.append(planset_document)

        # Process utility bill PDF
        utility_filename = f"{uuid.uuid4()}_{pdf2.filename}"
        utility_path = os.path.join(upload_dir, utility_filename)

        with open(utility_path, "wb") as buffer:
            content = await pdf2.read()
            buffer.write(content)

        utility_doc = DocumentCreate(
            filename=pdf2.filename,
            document_type=DocumentType.UTILITY_BILL,
            file_size=len(content),
            content_type=pdf2.content_type,
            project_id=project.id
        )

        utility_document = await project_service.create_document(
            utility_doc, str(current_user.id), utility_path
        )
        documents.append(utility_document)

        return {
            "message": "Documents uploaded successfully",
            "project_id": project_id,
            "documents": [
                {
                    "id": str(doc.id),
                    "filename": doc.filename,
                    "document_type": doc.document_type,
                    "uploaded_at": doc.uploaded_at
                } for doc in documents
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload documents: {str(e)}"
        )
