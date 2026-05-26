import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..auth import get_current_user
from ..database import get_db
from ..models import UserProfile
from ..schemas import UserProfileUpsert, UserProfileResponse

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/", response_model=UserProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == uuid.UUID(user["id"]))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/", response_model=UserProfileResponse)
async def upsert_profile(
    data: UserProfileUpsert,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    uid = uuid.UUID(user["id"])
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == uid))
    profile = result.scalar_one_or_none()

    if profile:
        for key, value in data.model_dump().items():
            setattr(profile, key, value)
    else:
        profile = UserProfile(**data.model_dump(), user_id=uid)
        db.add(profile)

    await db.commit()
    await db.refresh(profile)
    return profile
