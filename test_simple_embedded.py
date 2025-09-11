#!/usr/bin/env python3
"""
Simple test to verify embedded documents work
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app.database import connect_to_mongo, close_mongo_connection, get_database
from backend.app.models.project import DocumentType
from bson import ObjectId

async def test_simple_embedded():
    """Simple test of embedded documents"""
    
    print("Testing embedded documents with direct MongoDB operations...")
    
    # Connect to database
    await connect_to_mongo()
    db = await get_database()
    
    try:
        # Find an existing project
        project = await db["projects"].find_one({})
        if not project:
            print("No projects found in database")
            return False
        
        project_id = project["_id"]
        print(f"Using project: {project_id}")
        print(f"Project name: {project.get('name', 'Unknown')}")
        
        # Create a test embedded document
        embedded_doc = {
            "filename": "test_planset.pdf",
            "document_type": "planset",
            "file_size": 1024000,
            "content_type": "application/pdf",
            "file_path": "/fake/path/test_planset.pdf",
            "uploaded_at": datetime.utcnow(),
            "extracted_text": None,
            "analysis_results": None,
            "customer_address": None,
            "jurisdiction_details": None
        }
        
        print("Adding embedded document...")
        
        # Update the project directly
        result = await db["projects"].update_one(
            {"_id": project_id},
            {
                "$set": {
                    "planset_document": embedded_doc,
                    "updated_at": datetime.utcnow(),
                    "document_count": 1
                }
            }
        )
        
        if result.modified_count > 0:
            print("✅ Successfully added embedded document")
        else:
            print("❌ Failed to add embedded document")
            return False
        
        # Retrieve and verify
        updated_project = await db["projects"].find_one({"_id": project_id})
        
        if updated_project and "planset_document" in updated_project:
            print("✅ Embedded document found in project")
            print(f"   Filename: {updated_project['planset_document']['filename']}")
            print(f"   Document type: {updated_project['planset_document']['document_type']}")
            print(f"   File size: {updated_project['planset_document']['file_size']}")
        else:
            print("❌ Embedded document not found")
            return False
        
        # Clean up - remove the test document
        await db["projects"].update_one(
            {"_id": project_id},
            {
                "$unset": {"planset_document": ""},
                "$set": {"document_count": 0}
            }
        )
        print("✅ Cleaned up test document")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    success = asyncio.run(test_simple_embedded())
    
    if success:
        print("\n✅ Simple embedded document test passed!")
    else:
        print("\n❌ Simple embedded document test failed!")
        sys.exit(1)
