#!/usr/bin/env python3
"""
Update existing project to use simplified embedded documents
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app.database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId

async def update_to_simple_embedded():
    """Update the Cynthia Project to use simplified embedded documents"""
    
    print("Updating to simplified embedded documents...")
    
    # Connect to database
    await connect_to_mongo()
    db = await get_database()
    
    try:
        # Find the Cynthia Project
        project = await db["projects"].find_one({"name": "Cynthia Project"})
        if not project:
            print("❌ Cynthia Project not found")
            return False
        
        project_id = project["_id"]
        print(f"Found project: {project_id}")
        print(f"Project name: {project['name']}")
        
        # Create simplified embedded documents - only filename, type, path, and upload date
        planset_doc = {
            "filename": "cynthia_planset.pdf",
            "document_type": "planset",
            "file_path": "/uploads/projects/cynthia/planset.pdf",
            "uploaded_at": datetime.utcnow()
        }
        
        utility_doc = {
            "filename": "cynthia_utility_bill.pdf",
            "document_type": "utility_bill",
            "file_path": "/uploads/projects/cynthia/utility_bill.pdf",
            "uploaded_at": datetime.utcnow()
        }
        
        print("Updating with simplified embedded documents...")
        
        # Update the project with simplified embedded documents
        # Remove all the extra fields we don't want
        result = await db["projects"].update_one(
            {"_id": project_id},
            {
                "$set": {
                    "planset_document": planset_doc,
                    "utility_bill_document": utility_doc,
                    "updated_at": datetime.utcnow(),
                    "document_count": 2
                },
                "$unset": {
                    "customer_address": "",
                    "extracted_keys": ""
                }
            }
        )
        
        if result.modified_count > 0:
            print("✅ Successfully updated to simplified embedded documents")
        else:
            print("❌ Failed to update embedded documents")
            return False
        
        # Verify the documents were updated
        updated_project = await db["projects"].find_one({"_id": project_id})
        
        if updated_project:
            print(f"\n📊 Updated Project Details:")
            print(f"   Name: {updated_project['name']}")
            print(f"   Document count: {updated_project.get('document_count', 0)}")
            
            # Check that unwanted fields are removed
            if "customer_address" not in updated_project:
                print("   ✅ customer_address field removed")
            else:
                print("   ⚠️  customer_address field still present")
            
            if "extracted_keys" not in updated_project:
                print("   ✅ extracted_keys field removed")
            else:
                print("   ⚠️  extracted_keys field still present")
            
            if "planset_document" in updated_project:
                planset = updated_project["planset_document"]
                print(f"\n📄 Planset Document (Simplified):")
                print(f"   Filename: {planset['filename']}")
                print(f"   Document type: {planset['document_type']}")
                print(f"   File path: {planset['file_path']}")
                print(f"   Uploaded: {planset['uploaded_at']}")
                
                # Check that analysis fields are not present
                unwanted_fields = ['file_size', 'content_type', 'extracted_text', 'analysis_results', 'customer_address', 'jurisdiction_details']
                for field in unwanted_fields:
                    if field not in planset:
                        print(f"   ✅ {field} not present (good)")
                    else:
                        print(f"   ⚠️  {field} still present")
            
            if "utility_bill_document" in updated_project:
                utility = updated_project["utility_bill_document"]
                print(f"\n📄 Utility Bill Document (Simplified):")
                print(f"   Filename: {utility['filename']}")
                print(f"   Document type: {utility['document_type']}")
                print(f"   File path: {utility['file_path']}")
                print(f"   Uploaded: {utility['uploaded_at']}")
                
                # Check that analysis fields are not present
                unwanted_fields = ['file_size', 'content_type', 'extracted_text', 'analysis_results', 'customer_address', 'jurisdiction_details']
                for field in unwanted_fields:
                    if field not in utility:
                        print(f"   ✅ {field} not present (good)")
                    else:
                        print(f"   ⚠️  {field} still present")
            
            print(f"\n🎉 Project now has simplified embedded documents!")
            print(f"Only filename, document_type, file_path, and uploaded_at are stored.")
            print(f"Check your MongoDB to see the clean structure.")
            
        else:
            print("❌ Could not retrieve updated project")
            return False
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    print("Update to Simplified Embedded Documents")
    print("=" * 50)
    print("This will update the 'Cynthia Project' to use simplified")
    print("embedded documents with only essential PDF information:")
    print("- filename")
    print("- document_type") 
    print("- file_path")
    print("- uploaded_at")
    print()
    print("It will remove:")
    print("- customer_address")
    print("- extracted_keys")
    print("- All analysis fields from documents")
    print()
    
    response = input("Do you want to proceed? (y/N): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    success = asyncio.run(update_to_simple_embedded())
    
    if success:
        print("\n✅ Successfully updated to simplified embedded documents!")
        print("Check your MongoDB Atlas to see the clean structure.")
    else:
        print("\n❌ Failed to update!")
        sys.exit(1)
