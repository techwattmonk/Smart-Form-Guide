from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.models.user import UserCreate, Token, User
from app.services.user_service import user_service
from app.core.security import create_access_token, verify_token
from datetime import timedelta
from decouple import config

router = APIRouter()
security = HTTPBearer()

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    email: str
    full_name: str
    google_id: str
    profile_picture: str = None

@router.post("/register", response_model=dict)
async def register(user_create: UserCreate):
    """Register a new user"""
    try:
        user = await user_service.create_user(user_create)
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=timedelta(minutes=int(config("ACCESS_TOKEN_EXPIRE_MINUTES")))
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.post("/login", response_model=dict)
async def login(login_request: LoginRequest):
    """Login with email and password"""
    user = await user_service.authenticate_user(login_request.email, login_request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=int(config("ACCESS_TOKEN_EXPIRE_MINUTES")))
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "profile_picture": user.profile_picture
        }
    }

@router.post("/google-login", response_model=dict)
async def google_login(google_request: GoogleLoginRequest):
    """Login or register with Google"""
    try:
        user = await user_service.create_google_user(
            email=google_request.email,
            full_name=google_request.full_name,
            google_id=google_request.google_id,
            profile_picture=google_request.profile_picture
        )

        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=timedelta(minutes=int(config("ACCESS_TOKEN_EXPIRE_MINUTES")))
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "profile_picture": user.profile_picture
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate with Google"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    token = credentials.credentials
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await user_service.get_user_by_email(email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.get("/me", response_model=dict)
async def get_me(current_user = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "profile_picture": current_user.profile_picture
    }
