from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId
from .user import PyObjectId

class CountyGuidanceBase(BaseModel):
    county_name: str = Field(..., min_length=1, max_length=200, description="County name")
    smart_guidance_flow: str = Field(..., description="Smart guidance flow steps as JSON string")
    
class CountyGuidanceCreate(CountyGuidanceBase):
    pass

class CountyGuidanceUpdate(BaseModel):
    smart_guidance_flow: Optional[str] = Field(None, description="Updated smart guidance flow")

class CountyGuidanceInDB(CountyGuidanceBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Usage tracking
    usage_count: int = Field(default=1, description="Number of times this guidance has been used")
    last_used_at: datetime = Field(default_factory=datetime.utcnow, description="Last time this guidance was accessed")

class CountyGuidance(CountyGuidanceBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    id: str = Field(..., description="County guidance ID as string")
    created_at: datetime
    updated_at: datetime
    usage_count: int = 1
    last_used_at: datetime
