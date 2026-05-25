import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Contact, LifeEvent
from ..schemas import LifeEventCreate, LifeEventUpdate, LifeEventResponse
from ..auth import get_current_user

router = APIRouter(prefix="/contacts/{contact_id}/life_events", tags=["life_events"])


async def _get_contact(contact_id: uuid.UUID, user_id: str, db: AsyncSession) -> Contact:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == uuid.UUID(user_id))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get("/", response_model=list[LifeEventResponse])
async def list_life_events(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    result = await db.execute(
        select(LifeEvent)
        .where(LifeEvent.contact_id == contact_id)
        .order_by(LifeEvent.event_date.asc().nulls_last(), LifeEvent.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=LifeEventResponse, status_code=201)
async def create_life_event(
    contact_id: uuid.UUID,
    data: LifeEventCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    event = LifeEvent(**data.model_dump(), contact_id=contact_id)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.put("/{event_id}", response_model=LifeEventResponse)
async def update_life_event(
    contact_id: uuid.UUID,
    event_id: uuid.UUID,
    data: LifeEventUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    result = await db.execute(
        select(LifeEvent).where(LifeEvent.id == event_id, LifeEvent.contact_id == contact_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Life event not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
async def delete_life_event(
    contact_id: uuid.UUID,
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    result = await db.execute(
        select(LifeEvent).where(LifeEvent.id == event_id, LifeEvent.contact_id == contact_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Life event not found")
    await db.delete(event)
    await db.commit()
