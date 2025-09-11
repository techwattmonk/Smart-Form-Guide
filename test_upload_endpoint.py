#!/usr/bin/env python3
"""
Test the upload endpoint with embedded documents
"""

import asyncio
import sys
import os
import io
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app.database import connect_to_mongo, close_mongo_connection, get_database
from backend.app.services.project_service import project_service
from backend.app.models.project import DocumentType
from bson import ObjectId

async def test_upload_service():
    """Test the project service upload functionality"""
    
    print("Testing project service embedded document upload...")
    
    # Connect to database
    await connect_to_mongo()
    db = await get_database()

    if db is None:
        print("❌ Failed to connect to database")
        return False
    
    try:
        # Find an existing project
        project = await db["projects"].find_one({})
        if not project:
            print("No projects found in database")
            return False
        
        project_id = str(project["_id"])
        owner_id = str(project["owner_id"])
        
        print(f"Using project: {project_id}")
        print(f"Project name: {project.get('name', 'Unknown')}")
        print(f"Owner ID: {owner_id}")
        
        # Test adding planset document
        print("\nTesting planset document upload...")
        planset_success = await project_service.add_embedded_document(
            project_id=project_id,
            owner_id=owner_id,
            document_type=DocumentType.PLANSET,
            filename="test_planset.pdf",
            file_path="/fake/path/test_planset.pdf",
            file_size=1024000,
            content_type="application/pdf"
        )
        
        if planset_success:
            print("✅ Planset document added successfully")
        else:
            print("❌ Failed to add planset document")
            return False
        
        # Test adding utility bill document
        print("\nTesting utility bill document upload...")
        utility_success = await project_service.add_embedded_document(
            project_id=project_id,
            owner_id=owner_id,
            document_type=DocumentType.UTILITY_BILL,
            filename="test_utility_bill.pdf",
            file_path="/fake/path/test_utility_bill.pdf",
            file_size=512000,
            content_type="application/pdf"
        )
        
        if utility_success:
            print("✅ Utility bill document added successfully")
        else:
            print("❌ Failed to add utility bill document")
            return False
        
        # Verify the documents were added
        print("\nVerifying documents in database...")
        updated_project = await db["projects"].find_one({"_id": ObjectId(project_id)})
        
        if updated_project:
            print(f"Document count: {updated_project.get('document_count', 0)}")
            
            if "planset_document" in updated_project:
                print("✅ Planset document found")
                print(f"   Filename: {updated_project['planset_document']['filename']}")
            else:
                print("❌ Planset document not found")
            
            if "utility_bill_document" in updated_project:
                print("✅ Utility bill document found")
                print(f"   Filename: {updated_project['utility_bill_document']['filename']}")
            else:
                print("❌ Utility bill document not found")
        else:
            print("❌ Could not retrieve updated project")
            return False
        
        # Test the get_embedded_documents method
        print("\nTesting get_embedded_documents method...")
        embedded_docs = await project_service.get_embedded_documents(project_id, owner_id)
        
        print(f"Retrieved {len(embedded_docs)} embedded documents:")
        for doc in embedded_docs:
            print(f"   - {doc.get('filename', 'Unknown')} ({doc.get('document_type', 'Unknown')})")
        
        # Clean up
        print("\nCleaning up...")
        await db["projects"].update_one(
            {"_id": ObjectId(project_id)},
            {
                "$unset": {
                    "planset_document": "",
                    "utility_bill_document": ""
                },
                "$set": {"document_count": 0}
            }
        )
        print("✅ Cleaned up test documents")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    success = asyncio.run(test_upload_service())
    
    if success:
        print("\n✅ Upload service test passed!")
    else:
        print("\n❌ Upload service test failed!")
        sys.exit(1)
