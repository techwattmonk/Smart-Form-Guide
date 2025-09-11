from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from app.models.project import ProjectCreate, ProjectUpdate, ProjectInDB, Project, DocumentCreate, DocumentInDB, Document
from app.models.user import PyObjectId

class ProjectService:
    def __init__(self):
        self.collection_name = "projects"
        self.documents_collection_name = "project_documents"

    async def create_project(self, project_create: ProjectCreate, owner_id: str) -> ProjectInDB:
        """Create a new project for a user"""
        db = await get_database()
        
        project_data = {
            "name": project_create.name,
            "county_name": project_create.county_name,
            "smart_guidance_flow": project_create.smart_guidance_flow,
            "status": project_create.status,
            "owner_id": ObjectId(owner_id),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "document_count": 0,
            "last_analysis_date": None
        }
        
        result = await db[self.collection_name].insert_one(project_data)
        project_data["_id"] = result.inserted_id
        
        return ProjectInDB(**project_data)

    async def get_user_projects(self, owner_id: str, skip: int = 0, limit: int = 100) -> List[Project]:
        """Get all projects for a specific user"""
        db = await get_database()
        
        cursor = db[self.collection_name].find(
            {"owner_id": ObjectId(owner_id)}
        ).sort("updated_at", -1).skip(skip).limit(limit)
        
        projects = []
        async for project_data in cursor:
            # Convert ObjectId to string for the id and owner_id fields
            project_data["id"] = str(project_data["_id"])
            project_data["owner_id"] = str(project_data["owner_id"])
            projects.append(Project(**project_data))

        return projects

    async def get_project_by_id(self, project_id: str, owner_id: str) -> Optional[Project]:
        """Get a specific project by ID, ensuring it belongs to the user"""
        db = await get_database()
        
        project_data = await db[self.collection_name].find_one({
            "_id": ObjectId(project_id),
            "owner_id": ObjectId(owner_id)
        })
        
        if project_data:
            # Convert ObjectId to string for the id and owner_id fields
            project_data["id"] = str(project_data["_id"])
            project_data["owner_id"] = str(project_data["owner_id"])
            return Project(**project_data)
        return None

    async def update_project(self, project_id: str, project_update: ProjectUpdate, owner_id: str) -> Optional[Project]:
        """Update a project, ensuring it belongs to the user"""
        db = await get_database()
        
        # Build update data, excluding None values
        update_data = {}
        if project_update.name is not None:
            update_data["name"] = project_update.name
        if project_update.county_name is not None:
            update_data["county_name"] = project_update.county_name
        if project_update.smart_guidance_flow is not None:
            update_data["smart_guidance_flow"] = project_update.smart_guidance_flow
        if project_update.status is not None:
            update_data["status"] = project_update.status
        
        if not update_data:
            # No updates to make
            return await self.get_project_by_id(project_id, owner_id)
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await db[self.collection_name].update_one(
            {"_id": ObjectId(project_id), "owner_id": ObjectId(owner_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_project_by_id(project_id, owner_id)
        return None

    async def delete_project(self, project_id: str, owner_id: str) -> bool:
        """Delete a project and all its documents, ensuring it belongs to the user"""
        db = await get_database()
        
        # First, delete all documents associated with this project
        await db[self.documents_collection_name].delete_many({
            "project_id": ObjectId(project_id),
            "owner_id": ObjectId(owner_id)
        })
        
        # Then delete the project
        result = await db[self.collection_name].delete_one({
            "_id": ObjectId(project_id),
            "owner_id": ObjectId(owner_id)
        })
        
        return result.deleted_count > 0

    async def get_project_count(self, owner_id: str) -> int:
        """Get the total number of projects for a user"""
        db = await get_database()
        return await db[self.collection_name].count_documents({"owner_id": ObjectId(owner_id)})

    # Document management methods
    async def create_document(self, document_create: DocumentCreate, owner_id: str, file_path: str) -> DocumentInDB:
        """Create a new document within a project"""
        db = await get_database()
        
        # Verify the project belongs to the user
        project = await self.get_project_by_id(str(document_create.project_id), owner_id)
        if not project:
            raise ValueError("Project not found or access denied")
        
        document_data = {
            "filename": document_create.filename,
            "document_type": document_create.document_type,
            "file_size": document_create.file_size,
            "content_type": document_create.content_type,
            "project_id": document_create.project_id,
            "owner_id": ObjectId(owner_id),
            "file_path": file_path,
            "uploaded_at": datetime.utcnow(),
            "extracted_text": None,
            "analysis_results": None,
            "customer_address": None,
            "jurisdiction_details": None
        }
        
        result = await db[self.documents_collection_name].insert_one(document_data)
        document_data["_id"] = result.inserted_id
        
        # Update project document count
        await db[self.collection_name].update_one(
            {"_id": document_create.project_id},
            {
                "$inc": {"document_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return DocumentInDB(**document_data)

    async def get_project_documents(self, project_id: str, owner_id: str) -> List[Document]:
        """Get all documents for a specific project"""
        db = await get_database()
        
        # Verify the project belongs to the user
        project = await self.get_project_by_id(project_id, owner_id)
        if not project:
            return []
        
        cursor = db[self.documents_collection_name].find({
            "project_id": ObjectId(project_id),
            "owner_id": ObjectId(owner_id)
        }).sort("uploaded_at", -1)
        
        documents = []
        async for doc_data in cursor:
            documents.append(Document(**doc_data))
        
        return documents

    async def update_document_analysis(self, document_id: str, owner_id: str, 
                                     extracted_text: Optional[str] = None,
                                     analysis_results: Optional[dict] = None,
                                     customer_address: Optional[str] = None,
                                     jurisdiction_details: Optional[dict] = None) -> bool:
        """Update document with analysis results"""
        db = await get_database()
        
        update_data = {}
        if extracted_text is not None:
            update_data["extracted_text"] = extracted_text
        if analysis_results is not None:
            update_data["analysis_results"] = analysis_results
        if customer_address is not None:
            update_data["customer_address"] = customer_address
        if jurisdiction_details is not None:
            update_data["jurisdiction_details"] = jurisdiction_details
        
        if not update_data:
            return False
        
        result = await db[self.documents_collection_name].update_one(
            {"_id": ObjectId(document_id), "owner_id": ObjectId(owner_id)},
            {"$set": update_data}
        )
        
        # Update project's last analysis date
        if result.modified_count > 0:
            document = await db[self.documents_collection_name].find_one(
                {"_id": ObjectId(document_id)}
            )
            if document:
                await db[self.collection_name].update_one(
                    {"_id": document["project_id"]},
                    {"$set": {"last_analysis_date": datetime.utcnow()}}
                )
        
        return result.modified_count > 0

project_service = ProjectService()
