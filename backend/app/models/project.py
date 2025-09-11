from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from .user import PyObjectId
from enum import Enum

class ProjectStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Document models for project context
class DocumentType(str, Enum):
    PLANSET = "planset"
    UTILITY_BILL = "utility_bill"
    OTHER = "other"

# Embedded document model (stored within project) - Simplified
class EmbeddedDocument(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    filename: str = Field(..., description="Original filename")
    document_type: DocumentType = Field(..., description="Type of document")
    file_path: str = Field(..., description="Path to the stored file")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Project name")
    county_name: Optional[str] = Field(None, max_length=200, description="County name for jurisdiction")
    smart_guidance_flow: Optional[str] = Field(None, description="Smart guidance flow steps as JSON string")
    status: ProjectStatus = Field(default=ProjectStatus.DRAFT, description="Project status")

    # Embedded documents - Only PDF files with basic info
    planset_document: Optional[EmbeddedDocument] = Field(None, description="Planset PDF document")
    utility_bill_document: Optional[EmbeddedDocument] = Field(None, description="Utility bill PDF document")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    county_name: Optional[str] = Field(None, max_length=200)
    smart_guidance_flow: Optional[str] = Field(None)
    status: Optional[ProjectStatus] = None

class ProjectInDB(ProjectBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner_id: PyObjectId = Field(..., description="ID of the user who owns this project")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Document tracking
    document_count: int = Field(default=0, description="Number of documents uploaded to this project")
    last_analysis_date: Optional[datetime] = Field(None, description="Date of last document analysis")

class Project(ProjectBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    id: str = Field(..., description="Project ID as string")
    owner_id: str = Field(..., description="Owner ID as string")
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    last_analysis_date: Optional[datetime] = None

# Legacy document models (for backward compatibility)
class DocumentBase(BaseModel):
    filename: str = Field(..., description="Original filename")
    document_type: DocumentType = Field(..., description="Type of document")
    file_size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME type of the file")

class DocumentCreate(DocumentBase):
    project_id: PyObjectId = Field(..., description="ID of the project this document belongs to")

class DocumentInDB(DocumentBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: PyObjectId = Field(..., description="ID of the project this document belongs to")
    owner_id: PyObjectId = Field(..., description="ID of the user who owns this document")
    file_path: str = Field(..., description="Path to the stored file")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    # Analysis results
    extracted_text: Optional[str] = Field(None, description="Extracted text from the document")
    analysis_results: Optional[dict] = Field(None, description="AI analysis results")
    customer_address: Optional[str] = Field(None, description="Extracted customer address")
    jurisdiction_details: Optional[dict] = Field(None, description="Jurisdiction analysis results")

class Document(DocumentBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: PyObjectId
    owner_id: PyObjectId
    file_path: str
    uploaded_at: datetime
    extracted_text: Optional[str] = None
    analysis_results: Optional[dict] = None
    customer_address: Optional[str] = None
    jurisdiction_details: Optional[dict] = None
