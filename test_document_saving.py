#!/usr/bin/env python3
"""
Test that documents are being saved as embedded documents in projects
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from decouple import Config, RepositoryEnv

# Load environment from backend/.env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', '.env')
config = Config(RepositoryEnv(env_path))

async def test_document_saving():
    """Test that documents are being saved in projects"""
    
    print("Testing Document Saving in Projects")
    print("=" * 50)
    
    try:
        # Connect directly to MongoDB
        MONGODB_URL = config("MONGODB_URL")
        DATABASE_NAME = config("DATABASE_NAME")
        
        print(f"Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB")
        
        # Check projects collection
        projects_collection = db["projects"]
        
        # Find projects with embedded documents
        projects_with_docs = await projects_collection.find({
            "$or": [
                {"planset_document": {"$exists": True, "$ne": None}},
                {"utility_bill_document": {"$exists": True, "$ne": None}}
            ]
        }).to_list(10)
        
        print(f"\n📊 Found {len(projects_with_docs)} projects with embedded documents")
        
        if projects_with_docs:
            for project in projects_with_docs:
                print(f"\n📁 Project: {project['name']}")
                print(f"   ID: {project['_id']}")
                print(f"   County: {project.get('county_name', 'N/A')}")
                print(f"   Document count: {project.get('document_count', 0)}")
                
                if 'planset_document' in project and project['planset_document']:
                    planset = project['planset_document']
                    print(f"   📄 Planset Document:")
                    print(f"      Filename: {planset['filename']}")
                    print(f"      Type: {planset['document_type']}")
                    print(f"      Path: {planset['file_path']}")
                    print(f"      Uploaded: {planset['uploaded_at']}")
                
                if 'utility_bill_document' in project and project['utility_bill_document']:
                    utility = project['utility_bill_document']
                    print(f"   📄 Utility Bill Document:")
                    print(f"      Filename: {utility['filename']}")
                    print(f"      Type: {utility['document_type']}")
                    print(f"      Path: {utility['file_path']}")
                    print(f"      Uploaded: {utility['uploaded_at']}")
        else:
            print("❌ No projects found with embedded documents")
            print("\nThis could mean:")
            print("1. No documents have been uploaded yet")
            print("2. The document saving functionality is not working")
            print("3. Documents are being saved in a different format")
        
        # Check all projects to see their structure
        print(f"\n🔍 Checking all projects structure...")
        all_projects = await projects_collection.find().limit(5).to_list(5)
        
        for project in all_projects:
            print(f"\n📁 Project: {project['name']}")
            print(f"   Fields: {list(project.keys())}")
            
            # Check if it has the expected embedded document fields
            has_planset = 'planset_document' in project
            has_utility = 'utility_bill_document' in project
            
            print(f"   Has planset_document field: {has_planset}")
            print(f"   Has utility_bill_document field: {has_utility}")
            
            if has_planset:
                planset_value = project['planset_document']
                print(f"   Planset document value: {type(planset_value)} - {planset_value}")
            
            if has_utility:
                utility_value = project['utility_bill_document']
                print(f"   Utility document value: {type(utility_value)} - {utility_value}")
        
        # Test creating a project with embedded documents manually
        print(f"\n🧪 Testing manual document creation...")
        
        test_project = {
            "name": "Test Document Project",
            "county_name": "Test County",
            "smart_guidance_flow": '{"test": "guidance"}',
            "status": "draft",
            "owner_id": "test_owner_id",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "document_count": 2,
            "planset_document": {
                "filename": "test_planset.pdf",
                "document_type": "planset",
                "file_path": "/uploads/test/planset.pdf",
                "uploaded_at": datetime.utcnow()
            },
            "utility_bill_document": {
                "filename": "test_utility.pdf",
                "document_type": "utility_bill",
                "file_path": "/uploads/test/utility.pdf",
                "uploaded_at": datetime.utcnow()
            }
        }
        
        result = await projects_collection.insert_one(test_project)
        print(f"✅ Created test project with ID: {result.inserted_id}")
        
        # Verify the test project
        created_project = await projects_collection.find_one({"_id": result.inserted_id})
        
        if created_project:
            print(f"✅ Test project verified:")
            print(f"   Name: {created_project['name']}")
            print(f"   Has planset_document: {'planset_document' in created_project}")
            print(f"   Has utility_bill_document: {'utility_bill_document' in created_project}")
            
            if 'planset_document' in created_project:
                print(f"   Planset filename: {created_project['planset_document']['filename']}")
            
            if 'utility_bill_document' in created_project:
                print(f"   Utility filename: {created_project['utility_bill_document']['filename']}")
        
        # Clean up test project
        await projects_collection.delete_one({"_id": result.inserted_id})
        print(f"✅ Cleaned up test project")
        
        client.close()
        print(f"\n🎉 Document saving test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Document Saving Test")
    print("=" * 50)
    print("This will check if documents are being saved as embedded documents in projects")
    print()
    
    success = asyncio.run(test_document_saving())
    
    if success:
        print("\n✅ Document saving test completed!")
    else:
        print("\n❌ Document saving test failed!")
        sys.exit(1)
