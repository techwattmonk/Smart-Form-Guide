from fastapi import APIRouter, Depends, HTTPException, status
from app.routers.auth import get_current_user
from app.models.user import UserInDB

router = APIRouter()

@router.get("/profile")
async def get_user_profile(current_user: UserInDB = Depends(get_current_user)):
    """Get user profile"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "profile_picture": current_user.profile_picture,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at
    }
