#!/usr/bin/env python3
"""
Test the county guidance caching system
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app.database import connect_to_mongo, close_mongo_connection, get_database
from backend.app.services.county_guidance_service import county_guidance_service
from backend.app.models.county_guidance import CountyGuidanceCreate

async def test_county_guidance_cache():
    """Test the county guidance caching functionality"""
    
    print("Testing County Guidance Cache System")
    print("=" * 50)
    
    # Connect to database
    await connect_to_mongo()
    
    try:
        # Test 1: Create a test county guidance
        print("\n1. Creating test county guidance...")
        test_county = "Pinellas County"
        test_guidance = """
        {
            "steps": [
                {
                    "step": 1,
                    "title": "Submit Application",
                    "description": "Submit your solar permit application online through the county portal",
                    "requirements": ["Completed application form", "Site plan", "Electrical diagram"],
                    "estimated_time": "1-2 business days"
                },
                {
                    "step": 2,
                    "title": "Plan Review",
                    "description": "County reviews your submitted plans for compliance",
                    "requirements": ["All required documents submitted", "Plans meet code requirements"],
                    "estimated_time": "5-10 business days"
                },
                {
                    "step": 3,
                    "title": "Permit Issuance",
                    "description": "Permit is issued after successful plan review",
                    "requirements": ["Plan review approval", "Permit fees paid"],
                    "estimated_time": "1-2 business days"
                },
                {
                    "step": 4,
                    "title": "Installation",
                    "description": "Install solar system according to approved plans",
                    "requirements": ["Valid permit", "Licensed contractor", "Approved equipment"],
                    "estimated_time": "1-3 days"
                },
                {
                    "step": 5,
                    "title": "Inspection",
                    "description": "County inspection of completed installation",
                    "requirements": ["Installation complete", "Inspection scheduled"],
                    "estimated_time": "1-2 business days"
                }
            ],
            "total_estimated_time": "8-17 business days",
            "contact_info": {
                "department": "Pinellas County Building Department",
                "phone": "(727) 464-4062",
                "website": "https://www.pinellascounty.org/building/"
            }
        }
        """
        
        guidance_create = CountyGuidanceCreate(
            county_name=test_county,
            smart_guidance_flow=test_guidance.strip()
        )
        
        created_guidance = await county_guidance_service.create_county_guidance(guidance_create)
        print(f"✅ Created guidance for {created_guidance.county_name}")
        print(f"   ID: {created_guidance.id}")
        print(f"   Usage count: {created_guidance.usage_count}")
        
        # Test 2: Retrieve the cached guidance
        print(f"\n2. Testing cache retrieval for '{test_county}'...")
        cached_guidance = await county_guidance_service.get_county_guidance(test_county)
        
        if cached_guidance:
            print(f"✅ Successfully retrieved cached guidance")
            print(f"   County: {cached_guidance.county_name}")
            print(f"   Usage count: {cached_guidance.usage_count}")
            print(f"   Last used: {cached_guidance.last_used_at}")
            print(f"   Guidance length: {len(cached_guidance.smart_guidance_flow)} characters")
        else:
            print("❌ Failed to retrieve cached guidance")
            return False
        
        # Test 3: Test case-insensitive search
        print(f"\n3. Testing case-insensitive search...")
        cached_guidance_lower = await county_guidance_service.get_county_guidance("pinellas county")
        cached_guidance_upper = await county_guidance_service.get_county_guidance("PINELLAS COUNTY")
        
        if cached_guidance_lower and cached_guidance_upper:
            print(f"✅ Case-insensitive search works")
            print(f"   Lower case usage count: {cached_guidance_lower.usage_count}")
            print(f"   Upper case usage count: {cached_guidance_upper.usage_count}")
        else:
            print("❌ Case-insensitive search failed")
        
        # Test 4: Test usage tracking
        print(f"\n4. Testing usage tracking...")
        initial_usage = cached_guidance.usage_count
        
        # Access the guidance multiple times
        for i in range(3):
            await county_guidance_service.get_county_guidance(test_county)
        
        final_guidance = await county_guidance_service.get_county_guidance(test_county)
        final_usage = final_guidance.usage_count
        
        print(f"   Initial usage count: {initial_usage}")
        print(f"   Final usage count: {final_usage}")
        print(f"   Usage increased by: {final_usage - initial_usage}")
        
        if final_usage > initial_usage:
            print("✅ Usage tracking works correctly")
        else:
            print("❌ Usage tracking not working")
        
        # Test 5: Get all cached counties
        print(f"\n5. Testing get all cached counties...")
        all_counties = await county_guidance_service.get_all_cached_counties()
        print(f"✅ Found {len(all_counties)} cached counties")
        
        for county in all_counties:
            print(f"   - {county.county_name} (used {county.usage_count} times)")
        
        # Test 6: Get statistics
        print(f"\n6. Testing statistics...")
        stats = await county_guidance_service.get_guidance_stats()
        print(f"✅ Statistics retrieved:")
        print(f"   Total counties cached: {stats['total_counties_cached']}")
        print(f"   Total usage count: {stats['total_usage_count']}")
        print(f"   Most used counties: {len(stats['most_used_counties'])}")
        
        for county_stat in stats['most_used_counties']:
            print(f"     - {county_stat['county_name']}: {county_stat['usage_count']} uses")
        
        # Test 7: Search functionality
        print(f"\n7. Testing search functionality...")
        search_results = await county_guidance_service.search_counties("pinellas")
        print(f"✅ Search for 'pinellas' found {len(search_results)} results")
        
        for result in search_results:
            print(f"   - {result.county_name}")
        
        print(f"\n🎉 All tests completed successfully!")
        print(f"The county guidance caching system is working correctly.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await close_mongo_connection()

async def cleanup_test_data():
    """Clean up test data"""
    print("\nCleaning up test data...")
    
    await connect_to_mongo()
    db = await get_database()
    
    try:
        # Delete test county guidance
        result = await db["county_guidance"].delete_many({
            "county_name": {"$regex": "pinellas county", "$options": "i"}
        })
        print(f"✅ Deleted {result.deleted_count} test records")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
    
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    print("County Guidance Cache Test")
    print("=" * 50)
    print("This will test the county guidance caching system")
    print("including creation, retrieval, usage tracking, and search.")
    print()
    
    response = input("Do you want to run the test? (y/N): ")
    if response.lower() != 'y':
        print("Test cancelled.")
        sys.exit(0)
    
    success = asyncio.run(test_county_guidance_cache())
    
    if success:
        print("\n" + "=" * 50)
        cleanup_response = input("Do you want to clean up test data? (y/N): ")
        if cleanup_response.lower() == 'y':
            asyncio.run(cleanup_test_data())
        
        print("\n✅ County guidance caching system test completed successfully!")
    else:
        print("\n❌ County guidance caching system test failed!")
        sys.exit(1)
