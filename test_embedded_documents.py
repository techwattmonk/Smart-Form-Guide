#!/usr/bin/env python3
"""
Test script to verify the embedded documents functionality works correctly.
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app.database import connect_to_mongo, close_mongo_connection
from backend.app.services.project_service import project_service
from backend.app.models.project import ProjectCreate, DocumentType, ProjectStatus
from backend.app.models.user import UserCreate
from backend.app.services.user_service import user_service

async def test_embedded_documents():
    """Test the embedded documents functionality"""
    
    print("Testing embedded documents functionality...")
    print("=" * 50)
    
    # Connect to database
    await connect_to_mongo()
    
    try:
        # Create a test user (or use existing)
        test_email = "test_embedded@example.com"
        test_user = None
        
        try:
            # Try to get existing user
            test_user = await user_service.get_user_by_email(test_email)
            if test_user:
                print(f"Using existing test user: {test_email}")
            else:
                # Create new test user
                user_create = UserCreate(
                    email=test_email,
                    name="Test User",
                    password="testpassword123"
                )
                test_user = await user_service.create_user(user_create)
                print(f"Created new test user: {test_email}")
        except Exception as e:
            print(f"Error with test user: {e}")
            return False
        
        user_id = str(test_user.id)
        
        # 1. Create a test project
        print("\n1. Creating test project...")
        project_create = ProjectCreate(
            name="Test Embedded Documents Project",
            county_name="Test County",
            status=ProjectStatus.DRAFT
        )
        
        project = await project_service.create_project(project_create, user_id)
        project_id = str(project.id)
        print(f"✅ Created project: {project_id}")
        
        # 2. Add planset document
        print("\n2. Adding planset document...")
        planset_success = await project_service.add_embedded_document(
            project_id=project_id,
            owner_id=user_id,
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
        
        # 3. Add utility bill document
        print("\n3. Adding utility bill document...")
        utility_success = await project_service.add_embedded_document(
            project_id=project_id,
            owner_id=user_id,
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
        
        # 4. Retrieve project and verify embedded documents
        print("\n4. Retrieving project with embedded documents...")
        updated_project = await project_service.get_project_by_id(project_id, user_id)
        
        if updated_project:
            print(f"✅ Retrieved project: {updated_project.name}")
            print(f"   Document count: {updated_project.document_count}")
            
            # Check planset document
            if hasattr(updated_project, 'planset_document') and updated_project.planset_document:
                print(f"   ✅ Planset document: {updated_project.planset_document.filename}")
            else:
                print("   ❌ Planset document not found")
                return False
            
            # Check utility bill document
            if hasattr(updated_project, 'utility_bill_document') and updated_project.utility_bill_document:
                print(f"   ✅ Utility bill document: {updated_project.utility_bill_document.filename}")
            else:
                print("   ❌ Utility bill document not found")
                return False
        else:
            print("❌ Failed to retrieve updated project")
            return False
        
        # 5. Test embedded documents retrieval
        print("\n5. Testing embedded documents retrieval...")
        embedded_docs = await project_service.get_embedded_documents(project_id, user_id)
        
        if len(embedded_docs) == 2:
            print(f"✅ Retrieved {len(embedded_docs)} embedded documents")
            for doc in embedded_docs:
                print(f"   - {doc.get('filename', 'Unknown')} ({doc.get('document_type', 'Unknown')})")
        else:
            print(f"❌ Expected 2 documents, got {len(embedded_docs)}")
            return False
        
        # 6. Test analysis update
        print("\n6. Testing analysis update...")
        analysis_success = await project_service.update_embedded_document_analysis(
            project_id=project_id,
            owner_id=user_id,
            document_type=DocumentType.PLANSET,
            extracted_text="Test extracted text from planset",
            customer_address="123 Test Street, Test City, TC 12345",
            analysis_results={"test_key": "test_value"}
        )
        
        if analysis_success:
            print("✅ Analysis update successful")
        else:
            print("❌ Analysis update failed")
            return False
        
        # 7. Verify analysis was saved
        print("\n7. Verifying analysis was saved...")
        final_project = await project_service.get_project_by_id(project_id, user_id)
        
        if (final_project and 
            hasattr(final_project, 'planset_document') and 
            final_project.planset_document and
            final_project.planset_document.extracted_text == "Test extracted text from planset"):
            print("✅ Analysis data verified")
        else:
            print("❌ Analysis data not found or incorrect")
            return False
        
        # 8. Clean up - delete test project
        print("\n8. Cleaning up...")
        delete_success = await project_service.delete_project(project_id, user_id)
        
        if delete_success:
            print("✅ Test project deleted")
        else:
            print("⚠️  Warning: Could not delete test project")
        
        print("\n" + "=" * 50)
        print("🎉 All tests passed! Embedded documents functionality is working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    print("Embedded Documents Test Suite")
    print("=" * 50)
    print("This script will test the embedded documents functionality.")
    print()
    
    # Run the test
    success = asyncio.run(test_embedded_documents())
    
    if success:
        print("\n✅ All tests completed successfully!")
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)
