from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.routers.auth import get_current_user
from app.models.user import UserInDB
from app.models.county_guidance import CountyGuidanceCreate, CountyGuidanceUpdate, CountyGuidance
from app.services.county_guidance_service import county_guidance_service

router = APIRouter()

@router.get("/{county_name}", response_model=Optional[CountyGuidance])
async def get_county_guidance(
    county_name: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get cached guidance for a specific county"""
    try:
        guidance = await county_guidance_service.get_county_guidance(county_name)
        return guidance
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get county guidance: {str(e)}"
        )

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_county_guidance(
    guidance_create: CountyGuidanceCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create new county guidance cache entry"""
    try:
        guidance = await county_guidance_service.create_county_guidance(guidance_create)
        return {
            "message": "County guidance cached successfully",
            "county_name": guidance.county_name,
            "id": str(guidance.id)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create county guidance: {str(e)}"
        )

@router.get("/", response_model=List[CountyGuidance])
async def get_all_cached_counties(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search term for county names"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all cached county guidance entries"""
    try:
        if search:
            guidance_list = await county_guidance_service.search_counties(search)
        else:
            guidance_list = await county_guidance_service.get_all_cached_counties(skip, limit)
        return guidance_list
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cached counties: {str(e)}"
        )

@router.put("/{guidance_id}")
async def update_county_guidance(
    guidance_id: str,
    guidance_update: CountyGuidanceUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update existing county guidance"""
    try:
        updated_guidance = await county_guidance_service.update_county_guidance(guidance_id, guidance_update)
        if not updated_guidance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="County guidance not found"
            )
        return {
            "message": "County guidance updated successfully",
            "county_name": updated_guidance.county_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update county guidance: {str(e)}"
        )

@router.delete("/{guidance_id}")
async def delete_county_guidance(
    guidance_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a county guidance entry"""
    try:
        success = await county_guidance_service.delete_county_guidance(guidance_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="County guidance not found"
            )
        return {"message": "County guidance deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete county guidance: {str(e)}"
        )

@router.get("/stats/overview")
async def get_guidance_stats(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get statistics about cached guidance"""
    try:
        stats = await county_guidance_service.get_guidance_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get guidance stats: {str(e)}"
        )

@router.post("/cache/{county_name}")
async def cache_county_guidance(
    county_name: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Manually trigger caching for a specific county (useful for pre-populating cache)"""
    try:
        # Check if already cached
        existing = await county_guidance_service.get_county_guidance(county_name)
        if existing:
            return {
                "message": f"County '{county_name}' is already cached",
                "usage_count": existing.usage_count,
                "last_used_at": existing.last_used_at
            }

        # Import the Excel processing function
        from app.main import process_excel_or_csv_guidance, get_google_sheet_data
        from decouple import config
        import os

        SPREADSHEET_ID = config("SPREADSHEET_ID", default=None)
        WORKSHEET_NAME = config("WORKSHEET_NAME", default=None)

        if not SPREADSHEET_ID or not WORKSHEET_NAME:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google Sheets configuration not available"
            )

        # Process from Google Sheets
        credentials_file_path = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "credentials.json"))

        if not os.path.exists(credentials_file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google Sheets credentials not found"
            )

        # Fetch and process data
        sheet_data_bytes = get_google_sheet_data(
            spreadsheet_id=SPREADSHEET_ID,
            worksheet_name=WORKSHEET_NAME,
            credentials_path=credentials_file_path
        )

        excel_guidance_result = await process_excel_or_csv_guidance(
            file_content=sheet_data_bytes,
            file_type="text/csv",
            jurisdiction_name=county_name
        )

        if not excel_guidance_result.get("smart_guidance_flow"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No guidance found for county '{county_name}' in the data source"
            )

        # Cache the result
        guidance_create = CountyGuidanceCreate(
            county_name=county_name,
            smart_guidance_flow=excel_guidance_result["smart_guidance_flow"]
        )

        cached_guidance = await county_guidance_service.create_county_guidance(guidance_create)

        return {
            "message": f"Successfully cached guidance for county '{county_name}'",
            "county_name": cached_guidance.county_name,
            "cached_at": cached_guidance.created_at
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cache county guidance: {str(e)}"
        )
