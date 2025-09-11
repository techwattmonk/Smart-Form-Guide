#!/usr/bin/env python3
"""
Add test embedded documents to an existing project
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app.database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId

async def add_test_documents():
    """Add test embedded documents to the Cynthia Project"""
    
    print("Adding test embedded documents to existing project...")
    
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
        print(f"Current document count: {project.get('document_count', 0)}")
        
        # Create test embedded documents
        planset_doc = {
            "filename": "cynthia_planset.pdf",
            "document_type": "planset",
            "file_size": 2048000,
            "content_type": "application/pdf",
            "file_path": "/uploads/projects/cynthia/planset.pdf",
            "uploaded_at": datetime.utcnow(),
            "extracted_text": "Sample planset text for Cynthia's solar installation project",
            "analysis_results": {
                "system_size": "10.5 kW",
                "panel_count": 30,
                "inverter_type": "String inverter"
            },
            "customer_address": "123 Sunshine Ave, Pinellas County, FL 33701",
            "jurisdiction_details": {
                "jurisdiction": "Pinellas County",
                "permit_type": "Solar PV Installation"
            }
        }
        
        utility_doc = {
            "filename": "cynthia_utility_bill.pdf",
            "document_type": "utility_bill",
            "file_size": 512000,
            "content_type": "application/pdf",
            "file_path": "/uploads/projects/cynthia/utility_bill.pdf",
            "uploaded_at": datetime.utcnow(),
            "extracted_text": "Monthly electricity usage: 1,200 kWh, Average bill: $145",
            "analysis_results": {
                "monthly_usage": "1200 kWh",
                "average_bill": "$145",
                "billing_period": "Monthly"
            },
            "customer_address": "123 Sunshine Ave, Pinellas County, FL 33701",
            "jurisdiction_details": None
        }
        
        print("Adding embedded documents...")
        
        # Update the project with embedded documents
        result = await db["projects"].update_one(
            {"_id": project_id},
            {
                "$set": {
                    "planset_document": planset_doc,
                    "utility_bill_document": utility_doc,
                    "updated_at": datetime.utcnow(),
                    "document_count": 2,
                    "customer_address": "123 Sunshine Ave, Pinellas County, FL 33701",
                    "extracted_keys": {
                        "customer_name": "Cynthia",
                        "address": "123 Sunshine Ave, Pinellas County, FL 33701",
                        "system_size": "10.5 kW",
                        "monthly_usage": "1200 kWh",
                        "average_bill": "$145"
                    }
                }
            }
        )
        
        if result.modified_count > 0:
            print("✅ Successfully added embedded documents")
        else:
            print("❌ Failed to add embedded documents")
            return False
        
        # Verify the documents were added
        updated_project = await db["projects"].find_one({"_id": project_id})
        
        if updated_project:
            print(f"\n📊 Updated Project Details:")
            print(f"   Name: {updated_project['name']}")
            print(f"   Document count: {updated_project.get('document_count', 0)}")
            print(f"   Customer address: {updated_project.get('customer_address', 'N/A')}")
            
            if "planset_document" in updated_project:
                planset = updated_project["planset_document"]
                print(f"\n📄 Planset Document:")
                print(f"   Filename: {planset['filename']}")
                print(f"   File size: {planset['file_size']} bytes")
                print(f"   Document type: {planset['document_type']}")
                print(f"   Uploaded: {planset['uploaded_at']}")
                if planset.get('analysis_results'):
                    print(f"   Analysis: {planset['analysis_results']}")
            
            if "utility_bill_document" in updated_project:
                utility = updated_project["utility_bill_document"]
                print(f"\n📄 Utility Bill Document:")
                print(f"   Filename: {utility['filename']}")
                print(f"   File size: {utility['file_size']} bytes")
                print(f"   Document type: {utility['document_type']}")
                print(f"   Uploaded: {utility['uploaded_at']}")
                if utility.get('analysis_results'):
                    print(f"   Analysis: {utility['analysis_results']}")
            
            print(f"\n🎉 Project now has embedded documents!")
            print(f"Check your MongoDB to see the updated structure.")
            
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
    print("Add Test Embedded Documents")
    print("=" * 50)
    print("This will add test planset and utility bill documents")
    print("to the 'Cynthia Project' as embedded documents.")
    print()
    
    response = input("Do you want to proceed? (y/N): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    success = asyncio.run(add_test_documents())
    
    if success:
        print("\n✅ Test documents added successfully!")
        print("Check your MongoDB Atlas to see the embedded documents.")
    else:
        print("\n❌ Failed to add test documents!")
        sys.exit(1)
