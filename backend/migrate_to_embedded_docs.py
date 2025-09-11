#!/usr/bin/env python3
"""
Migration script to move existing documents from separate collection to embedded documents in projects.
This script is optional and only needed if you have existing data in the project_documents collection.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_database, connect_to_mongo, close_mongo_connection
from app.models.project import DocumentType
from bson import ObjectId
from datetime import datetime

async def migrate_documents_to_embedded():
    """Migrate existing documents from project_documents collection to embedded documents in projects"""
    
    print("Starting migration of documents to embedded format...")
    
    # Connect to database
    await connect_to_mongo()
    db = await get_database()
    
    try:
        # Get all documents from the project_documents collection
        documents_cursor = db["project_documents"].find({})
        documents = await documents_cursor.to_list(length=None)
        
        print(f"Found {len(documents)} documents to migrate")
        
        migrated_count = 0
        error_count = 0
        
        for doc in documents:
            try:
                project_id = doc["project_id"]
                document_type = doc["document_type"]
                
                # Create embedded document structure
                embedded_doc = {
                    "filename": doc["filename"],
                    "document_type": document_type,
                    "file_size": doc["file_size"],
                    "content_type": doc["content_type"],
                    "file_path": doc["file_path"],
                    "uploaded_at": doc["uploaded_at"],
                    "extracted_text": doc.get("extracted_text"),
                    "analysis_results": doc.get("analysis_results"),
                    "customer_address": doc.get("customer_address"),
                    "jurisdiction_details": doc.get("jurisdiction_details")
                }
                
                # Determine which field to update based on document type
                if document_type == DocumentType.PLANSET:
                    field_name = "planset_document"
                elif document_type == DocumentType.UTILITY_BILL:
                    field_name = "utility_bill_document"
                else:
                    print(f"Skipping document {doc['_id']} with unknown type: {document_type}")
                    continue
                
                # Update the project with the embedded document
                result = await db["projects"].update_one(
                    {"_id": project_id},
                    {
                        "$set": {
                            field_name: embedded_doc,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                if result.modified_count > 0:
                    migrated_count += 1
                    print(f"Migrated {document_type} document for project {project_id}")
                else:
                    print(f"Warning: Could not update project {project_id} for document {doc['_id']}")
                    error_count += 1
                    
            except Exception as e:
                print(f"Error migrating document {doc['_id']}: {str(e)}")
                error_count += 1
        
        print(f"\nMigration completed!")
        print(f"Successfully migrated: {migrated_count} documents")
        print(f"Errors: {error_count} documents")
        
        # Update document counts for all projects
        print("\nUpdating document counts...")
        projects_cursor = db["projects"].find({})
        projects = await projects_cursor.to_list(length=None)
        
        for project in projects:
            count = 0
            if project.get("planset_document"):
                count += 1
            if project.get("utility_bill_document"):
                count += 1
            
            await db["projects"].update_one(
                {"_id": project["_id"]},
                {"$set": {"document_count": count}}
            )
        
        print(f"Updated document counts for {len(projects)} projects")
        
        # Optionally, you can backup and remove the old documents collection
        # Uncomment the following lines if you want to do this:
        
        # print("\nBacking up old documents collection...")
        # backup_collection_name = f"project_documents_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        # await db["project_documents"].aggregate([{"$out": backup_collection_name}]).to_list(length=None)
        # print(f"Backup created as: {backup_collection_name}")
        
        # print("Removing old documents collection...")
        # await db["project_documents"].drop()
        # print("Old documents collection removed")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False
    
    finally:
        await close_mongo_connection()
    
    return True

if __name__ == "__main__":
    print("Document Migration Script")
    print("=" * 50)
    print("This script will migrate existing documents from the 'project_documents'")
    print("collection to embedded documents within the 'projects' collection.")
    print()
    
    response = input("Do you want to proceed with the migration? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        sys.exit(0)
    
    # Run the migration
    success = asyncio.run(migrate_documents_to_embedded())
    
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
