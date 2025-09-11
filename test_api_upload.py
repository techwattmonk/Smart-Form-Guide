#!/usr/bin/env python3
"""
Test the upload API endpoint directly
"""

import requests
import io
import json

def test_api_upload():
    """Test the upload API endpoint"""
    
    print("Testing upload API endpoint...")
    
    # First, let's test if the backend is running
    try:
        response = requests.get("http://127.0.0.1:8000/docs")
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend is not responding correctly")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False
    
    # For this test, we need a valid project ID and authentication token
    # Let's first check what projects exist
    try:
        # We need to authenticate first - let's skip this for now and just test the endpoint structure
        print("Testing endpoint structure...")
        
        # Create mock PDF files
        pdf1_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF"
        pdf2_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF"
        
        # Test project ID (you'll need to replace this with an actual project ID)
        project_id = "68c2fb9de05d103fef2114f9"  # Replace with actual project ID
        
        files = {
            'pdf1': ('planset.pdf', io.BytesIO(pdf1_content), 'application/pdf'),
            'pdf2': ('utility_bill.pdf', io.BytesIO(pdf2_content), 'application/pdf')
        }
        
        # Note: This will fail without proper authentication, but we can see the response
        response = requests.post(
            f"http://127.0.0.1:8000/api/projects/{project_id}/upload",
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.text}")
        
        if response.status_code == 401:
            print("✅ Endpoint exists but requires authentication (expected)")
            return True
        elif response.status_code == 200:
            print("✅ Upload successful!")
            return True
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Error testing upload: {e}")
        return False

def test_project_retrieval():
    """Test if we can retrieve a project and see embedded documents"""
    
    print("\nTesting project retrieval...")
    
    try:
        # Test project ID
        project_id = "68c2fb9de05d103fef2114f9"
        
        # This will also fail without auth, but we can see the structure
        response = requests.get(f"http://127.0.0.1:8000/api/projects/{project_id}")
        
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.text}")
        
        if response.status_code == 401:
            print("✅ Project endpoint exists but requires authentication (expected)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print("✅ Project retrieved successfully!")
            if 'planset_document' in data or 'utility_bill_document' in data:
                print("✅ Embedded documents found in response!")
            else:
                print("ℹ️  No embedded documents in response")
            return True
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Error testing project retrieval: {e}")
        return False

if __name__ == "__main__":
    print("API Upload Test")
    print("=" * 50)
    
    success1 = test_api_upload()
    success2 = test_project_retrieval()
    
    if success1 and success2:
        print("\n✅ API tests completed successfully!")
        print("Note: Authentication errors are expected in this test.")
    else:
        print("\n❌ API tests failed!")
