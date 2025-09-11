#!/usr/bin/env python3
"""
Test script to verify project isolation functionality.
This script tests that users can only access their own projects.
"""

import requests
import json
import sys

API_BASE = "http://localhost:8000"

def test_user_registration_and_login():
    """Test user registration and login for two different users"""
    print("Testing user registration and login...")
    
    # Register first user
    import time
    timestamp = int(time.time())

    user1_data = {
        "email": f"carly{timestamp}@example.com",
        "password": "password123",
        "full_name": "Carly Smith"
    }

    response = requests.post(f"{API_BASE}/api/auth/register", json=user1_data)
    if response.status_code != 200:
        print(f"Failed to register user1: {response.text}")
        return None, None

    user1_token = response.json()["access_token"]
    print("✓ User1 (Carly) registered successfully")

    # Register second user
    user2_data = {
        "email": f"max{timestamp}@example.com",
        "password": "password123",
        "full_name": "Max Johnson"
    }
    
    response = requests.post(f"{API_BASE}/api/auth/register", json=user2_data)
    if response.status_code != 200:
        print(f"Failed to register user2: {response.text}")
        return None, None
    
    user2_token = response.json()["access_token"]
    print("✓ User2 (Max) registered successfully")
    
    return user1_token, user2_token

def test_project_creation(token, user_name, project_name):
    """Test project creation for a user"""
    print(f"Creating project for {user_name}...")
    
    project_data = {
        "name": project_name,
        "description": f"Test project for {user_name}",
        "customer_name": "John Wick",
        "status": "draft"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{API_BASE}/api/projects/", json=project_data, headers=headers)
    
    if response.status_code != 201:
        print(f"Failed to create project for {user_name}: {response.text}")
        return None
    
    project = response.json()
    print(f"✓ Project '{project_name}' created for {user_name} with ID: {project['id']}")
    return project

def test_project_isolation(user1_token, user2_token, user1_project_id):
    """Test that users cannot access each other's projects"""
    print("Testing project isolation...")
    
    # User2 tries to access User1's project
    headers = {"Authorization": f"Bearer {user2_token}"}
    response = requests.get(f"{API_BASE}/api/projects/{user1_project_id}", headers=headers)
    
    if response.status_code == 404:
        print("✓ Project isolation working: User2 cannot access User1's project")
        return True
    else:
        print(f"✗ Project isolation failed: User2 can access User1's project (status: {response.status_code})")
        return False

def test_project_listing(token, user_name, expected_count):
    """Test that users only see their own projects"""
    print(f"Testing project listing for {user_name}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/api/projects/", headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to get projects for {user_name}: {response.text}")
        return False
    
    projects = response.json()
    if len(projects) == expected_count:
        print(f"✓ {user_name} sees {len(projects)} project(s) as expected")
        return True
    else:
        print(f"✗ {user_name} sees {len(projects)} project(s), expected {expected_count}")
        return False

def main():
    """Run all tests"""
    print("Starting project isolation tests...\n")
    
    # Test user registration and login
    user1_token, user2_token = test_user_registration_and_login()
    if not user1_token or not user2_token:
        print("Failed to set up test users")
        sys.exit(1)
    
    print()
    
    # Create projects for each user
    user1_project = test_project_creation(user1_token, "Carly", "Carly's Solar Project")
    user2_project = test_project_creation(user2_token, "Max", "Max's Wind Project")
    
    if not user1_project or not user2_project:
        print("Failed to create test projects")
        sys.exit(1)
    
    print()
    
    # Test project isolation
    isolation_test1 = test_project_isolation(user1_token, user2_token, user1_project["id"])
    isolation_test2 = test_project_isolation(user2_token, user1_token, user2_project["id"])
    
    print()
    
    # Test project listing
    listing_test1 = test_project_listing(user1_token, "Carly", 1)
    listing_test2 = test_project_listing(user2_token, "Max", 1)
    
    print()
    
    # Summary
    all_tests_passed = all([isolation_test1, isolation_test2, listing_test1, listing_test2])
    
    if all_tests_passed:
        print("🎉 All project isolation tests PASSED!")
        print("✓ Users can only see and access their own projects")
        print("✓ Project isolation is working correctly")
    else:
        print("❌ Some project isolation tests FAILED!")
        print("Please check the implementation")
        sys.exit(1)

if __name__ == "__main__":
    main()
