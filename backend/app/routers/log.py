import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Contact, Interaction, LifeEvent
from ..schemas import GroupInteractionCreate, GroupEventCreate, InteractionResponse, LifeEventResponse
from ..auth import get_current_user

router = APIRouter(prefix="/log", tags=["log"])


async def _resolve_contacts(
    contact_ids: list[uuid.UUID],
    user_id: str,
    db: AsyncSession,
) -> list[Contact]:
    result = await db.execute(
        select(Contact).where(
            Contact.id.in_(contact_ids),
            Contact.user_id == uuid.UUID(user_id),
        )
    )
    contacts = result.scalars().all()
    if len(contacts) != len(contact_ids):
        raise HTTPException(status_code=404, detail="One or more contacts not found")
    return list(contacts)


@router.post("/interaction", response_model=list[InteractionResponse], status_code=201)
async def log_group_interaction(
    data: GroupInteractionCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if not data.contact_ids:
        raise HTTPException(status_code=422, detail="At least one contact is required")

    contacts = await _resolve_contacts(data.contact_ids, user["id"], db)
    name_map = {c.id: c.name for c in contacts}
    group_id = uuid.uuid4() if len(contacts) > 1 else None

    interactions = []
    for contact in contacts:
        other_names = ', '.join(
            name_map[cid] for cid in data.contact_ids if cid != contact.id
        ) or None
        interaction = Interaction(
            contact_id=contact.id,
            date=data.date,
            medium=data.medium,
            notes=data.notes,
            group_id=group_id,
            group_participant_names=other_names,
        )
        db.add(interaction)
        interactions.append(interaction)

    await db.commit()
    for i in interactions:
        await db.refresh(i)
    return interactions


@router.post("/event", response_model=list[LifeEventResponse], status_code=201)
async def log_group_event(
    data: GroupEventCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if not data.contact_ids:
        raise HTTPException(status_code=422, detail="At least one contact is required")

    contacts = await _resolve_contacts(data.contact_ids, user["id"], db)
    name_map = {c.id: c.name for c in contacts}
    group_id = uuid.uuid4() if len(contacts) > 1 else None

    events = []
    for contact in contacts:
        other_names = ', '.join(
            name_map[cid] for cid in data.contact_ids if cid != contact.id
        ) or None
        event = LifeEvent(
            contact_id=contact.id,
            title=data.title,
            event_type=data.event_type,
            event_date=data.event_date,
            is_recurring=data.is_recurring,
            notes=data.notes,
            reminder_days_before=data.reminder_days_before,
            reminder_days_after=data.reminder_days_after,
            group_id=group_id,
            group_participant_names=other_names,
        )
        db.add(event)
        events.append(event)

    await db.commit()
    for e in events:
        await db.refresh(e)
    return events
