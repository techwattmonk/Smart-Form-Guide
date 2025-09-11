from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from app.models.county_guidance import CountyGuidanceCreate, CountyGuidanceUpdate, CountyGuidanceInDB, CountyGuidance

class CountyGuidanceService:
    def __init__(self):
        self.collection_name = "county_guidance"

    async def get_county_guidance(self, county_name: str) -> Optional[CountyGuidance]:
        """Get cached guidance for a county (case-insensitive)"""
        db = await get_database()
        
        # Search case-insensitive
        guidance_data = await db[self.collection_name].find_one({
            "county_name": {"$regex": f"^{county_name}$", "$options": "i"}
        })
        
        if guidance_data:
            # Update usage tracking
            await db[self.collection_name].update_one(
                {"_id": guidance_data["_id"]},
                {
                    "$inc": {"usage_count": 1},
                    "$set": {"last_used_at": datetime.utcnow()}
                }
            )
            
            # Convert ObjectId to string for the id field
            guidance_data["id"] = str(guidance_data["_id"])
            return CountyGuidance(**guidance_data)
        
        return None

    async def create_county_guidance(self, guidance_create: CountyGuidanceCreate) -> CountyGuidanceInDB:
        """Create new county guidance cache entry"""
        db = await get_database()
        
        # Check if guidance already exists (case-insensitive)
        existing = await db[self.collection_name].find_one({
            "county_name": {"$regex": f"^{guidance_create.county_name}$", "$options": "i"}
        })
        
        if existing:
            # Update existing guidance instead of creating duplicate
            return await self.update_county_guidance(
                str(existing["_id"]), 
                CountyGuidanceUpdate(smart_guidance_flow=guidance_create.smart_guidance_flow)
            )
        
        guidance_data = {
            "county_name": guidance_create.county_name,
            "smart_guidance_flow": guidance_create.smart_guidance_flow,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "usage_count": 1,
            "last_used_at": datetime.utcnow()
        }
        
        result = await db[self.collection_name].insert_one(guidance_data)
        guidance_data["_id"] = result.inserted_id
        
        return CountyGuidanceInDB(**guidance_data)

    async def update_county_guidance(self, guidance_id: str, guidance_update: CountyGuidanceUpdate) -> Optional[CountyGuidanceInDB]:
        """Update existing county guidance"""
        db = await get_database()
        
        update_data = {"updated_at": datetime.utcnow()}
        if guidance_update.smart_guidance_flow is not None:
            update_data["smart_guidance_flow"] = guidance_update.smart_guidance_flow
        
        result = await db[self.collection_name].update_one(
            {"_id": ObjectId(guidance_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            updated_guidance = await db[self.collection_name].find_one({"_id": ObjectId(guidance_id)})
            if updated_guidance:
                return CountyGuidanceInDB(**updated_guidance)
        
        return None

    async def get_all_cached_counties(self, skip: int = 0, limit: int = 100) -> List[CountyGuidance]:
        """Get all cached county guidance entries"""
        db = await get_database()
        
        cursor = db[self.collection_name].find().sort("usage_count", -1).skip(skip).limit(limit)
        
        guidance_list = []
        async for guidance_data in cursor:
            # Convert ObjectId to string for the id field
            guidance_data["id"] = str(guidance_data["_id"])
            guidance_list.append(CountyGuidance(**guidance_data))

        return guidance_list

    async def delete_county_guidance(self, guidance_id: str) -> bool:
        """Delete a county guidance entry"""
        db = await get_database()
        
        result = await db[self.collection_name].delete_one({"_id": ObjectId(guidance_id)})
        return result.deleted_count > 0

    async def get_guidance_stats(self) -> dict:
        """Get statistics about cached guidance"""
        db = await get_database()
        
        total_counties = await db[self.collection_name].count_documents({})
        
        # Get most used counties
        most_used_cursor = db[self.collection_name].find().sort("usage_count", -1).limit(5)
        most_used = []
        async for guidance in most_used_cursor:
            most_used.append({
                "county_name": guidance["county_name"],
                "usage_count": guidance["usage_count"],
                "last_used_at": guidance["last_used_at"]
            })
        
        # Get total usage count
        pipeline = [
            {"$group": {"_id": None, "total_usage": {"$sum": "$usage_count"}}}
        ]
        total_usage_result = await db[self.collection_name].aggregate(pipeline).to_list(1)
        total_usage = total_usage_result[0]["total_usage"] if total_usage_result else 0
        
        return {
            "total_counties_cached": total_counties,
            "total_usage_count": total_usage,
            "most_used_counties": most_used
        }

    async def search_counties(self, search_term: str) -> List[CountyGuidance]:
        """Search for counties by name (partial match)"""
        db = await get_database()
        
        cursor = db[self.collection_name].find({
            "county_name": {"$regex": search_term, "$options": "i"}
        }).sort("usage_count", -1)
        
        guidance_list = []
        async for guidance_data in cursor:
            # Convert ObjectId to string for the id field
            guidance_data["id"] = str(guidance_data["_id"])
            guidance_list.append(CountyGuidance(**guidance_data))

        return guidance_list

county_guidance_service = CountyGuidanceService()
