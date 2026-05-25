import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import UserSettings
from ..schemas import UserSettingsUpdate, UserSettingsResponse
from ..auth import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=UserSettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["id"])
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.put("/", response_model=UserSettingsResponse)
async def update_settings(
    data: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["id"])
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    settings.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(settings)
    return settings
