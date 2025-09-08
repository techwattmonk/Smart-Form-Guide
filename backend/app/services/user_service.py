from typing import Optional
from app.database import get_database
from app.models.user import UserCreate, UserInDB, UserUpdate
from app.core.security import get_password_hash, verify_password
from datetime import datetime
from bson import ObjectId

class UserService:
    def __init__(self):
        self.collection_name = "app_users"

    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email"""
        db = await get_database()
        user_data = await db[self.collection_name].find_one({"email": email})
        if user_data:
            return UserInDB(**user_data)
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID"""
        db = await get_database()
        user_data = await db[self.collection_name].find_one({"_id": ObjectId(user_id)})
        if user_data:
            return UserInDB(**user_data)
        return None

    async def create_user(self, user_create: UserCreate) -> UserInDB:
        """Create a new user"""
        db = await get_database()
        
        # Check if user already exists
        existing_user = await self.get_user_by_email(user_create.email)
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Hash password and create user
        hashed_password = get_password_hash(user_create.password)
        # Generate username from email (part before @)
        username = user_create.email.split('@')[0]
        user_data = {
            "email": user_create.email,
            "full_name": user_create.full_name,
            "username": username,
            "hashed_password": hashed_password,
            "is_active": user_create.is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db[self.collection_name].insert_one(user_data)
        user_data["_id"] = result.inserted_id
        
        return UserInDB(**user_data)

    async def authenticate_user(self, email: str, password: str) -> Optional[UserInDB]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def create_google_user(self, email: str, full_name: str, google_id: str, profile_picture: str = None) -> UserInDB:
        """Create or update user from Google OAuth"""
        db = await get_database()

        # Check if user exists
        existing_user = await self.get_user_by_email(email)
        if existing_user:
            # Update Google ID if not set
            if not existing_user.google_id:
                await db[self.collection_name].update_one(
                    {"_id": existing_user.id},
                    {"$set": {"google_id": google_id, "profile_picture": profile_picture, "updated_at": datetime.utcnow()}}
                )
                existing_user.google_id = google_id
                existing_user.profile_picture = profile_picture
            return existing_user

        # Create new user
        # Generate username from email (part before @)
        username = email.split('@')[0]
        user_data = {
            "email": email,
            "full_name": full_name,
            "username": username,
            "hashed_password": "",  # No password for Google users
            "is_active": True,
            "google_id": google_id,
            "profile_picture": profile_picture,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await db[self.collection_name].insert_one(user_data)
        user_data["_id"] = result.inserted_id

        return UserInDB(**user_data)

user_service = UserService()
