#!/usr/bin/env python3
"""
Simple test to verify county guidance cache collection exists and can be accessed
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

async def test_county_cache_collection():
    """Test direct MongoDB connection and county_guidance collection"""
    
    print("Testing County Guidance Cache Collection")
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
        
        # Test county_guidance collection
        collection = db["county_guidance"]
        
        # Create a test document
        test_doc = {
            "county_name": "Test County",
            "smart_guidance_flow": '{"steps": [{"step": 1, "title": "Test Step"}]}',
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "usage_count": 1,
            "last_used_at": datetime.utcnow()
        }
        
        print("Creating test document...")
        result = await collection.insert_one(test_doc)
        print(f"✅ Test document created with ID: {result.inserted_id}")
        
        # Retrieve the document
        print("Retrieving test document...")
        retrieved_doc = await collection.find_one({"_id": result.inserted_id})
        
        if retrieved_doc:
            print("✅ Test document retrieved successfully")
            print(f"   County: {retrieved_doc['county_name']}")
            print(f"   Usage count: {retrieved_doc['usage_count']}")
        else:
            print("❌ Failed to retrieve test document")
            return False
        
        # Test case-insensitive search
        print("Testing case-insensitive search...")
        case_insensitive_doc = await collection.find_one({
            "county_name": {"$regex": "^test county$", "$options": "i"}
        })
        
        if case_insensitive_doc:
            print("✅ Case-insensitive search works")
        else:
            print("❌ Case-insensitive search failed")
        
        # Update usage count
        print("Testing usage count update...")
        update_result = await collection.update_one(
            {"_id": result.inserted_id},
            {
                "$inc": {"usage_count": 1},
                "$set": {"last_used_at": datetime.utcnow()}
            }
        )
        
        if update_result.modified_count > 0:
            print("✅ Usage count update works")
            
            # Verify the update
            updated_doc = await collection.find_one({"_id": result.inserted_id})
            print(f"   Updated usage count: {updated_doc['usage_count']}")
        else:
            print("❌ Usage count update failed")
        
        # Clean up test document
        print("Cleaning up test document...")
        delete_result = await collection.delete_one({"_id": result.inserted_id})
        
        if delete_result.deleted_count > 0:
            print("✅ Test document cleaned up")
        else:
            print("❌ Failed to clean up test document")
        
        # Check existing collections
        print("\nChecking existing collections...")
        collections = await db.list_collection_names()
        print(f"Available collections: {collections}")
        
        if "county_guidance" in collections:
            print("✅ county_guidance collection exists")
        else:
            print("ℹ️  county_guidance collection will be created when first document is inserted")
        
        # Check if there are any existing county guidance documents
        existing_count = await collection.count_documents({})
        print(f"Existing county guidance documents: {existing_count}")
        
        if existing_count > 0:
            print("Existing counties:")
            async for doc in collection.find().limit(5):
                print(f"   - {doc['county_name']} (used {doc['usage_count']} times)")
        
        client.close()
        print("\n🎉 County guidance cache collection test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("County Guidance Cache Collection Test")
    print("=" * 50)
    print("This will test direct MongoDB access to the county_guidance collection")
    print()
    
    success = asyncio.run(test_county_cache_collection())
    
    if success:
        print("\n✅ County guidance cache collection is working correctly!")
    else:
        print("\n❌ County guidance cache collection test failed!")
        sys.exit(1)
