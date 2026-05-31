import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models import Contact, Interaction, LifeEvent
from ..schemas import OverdueContact, UpcomingEvent
from ..auth import get_current_user
from ..utils import next_annual_occurrence

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

UPCOMING_DAYS = 30


@router.get("/overdue", response_model=list[OverdueContact])
async def overdue_contacts(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["id"])
    today = date.today()

    last_interaction_sq = (
        select(Interaction.contact_id, func.max(Interaction.date).label("last_date"))
        .group_by(Interaction.contact_id)
        .subquery()
    )

    rows = (await db.execute(
        select(Contact, last_interaction_sq.c.last_date)
        .outerjoin(last_interaction_sq, Contact.id == last_interaction_sq.c.contact_id)
        .where(Contact.user_id == user_id, Contact.check_in_frequency_days.isnot(None))
        .order_by(Contact.name)
    )).all()

    overdue = []
    for contact, last_date in rows:
        if last_date is None:
            overdue.append(OverdueContact(
                id=contact.id,
                name=contact.name,
                check_in_frequency_days=contact.check_in_frequency_days,
                last_interaction_date=None,
                days_overdue=contact.check_in_frequency_days,
            ))
        else:
            days_since = (today - last_date).days
            if days_since > contact.check_in_frequency_days:
                overdue.append(OverdueContact(
                    id=contact.id,
                    name=contact.name,
                    check_in_frequency_days=contact.check_in_frequency_days,
                    last_interaction_date=last_date,
                    days_overdue=days_since - contact.check_in_frequency_days,
                ))

    return sorted(overdue, key=lambda c: c.days_overdue, reverse=True)


@router.get("/upcoming", response_model=list[UpcomingEvent])
async def upcoming_events(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["id"])
    today = date.today()
    window_end = today + timedelta(days=UPCOMING_DAYS)

    contacts = (await db.execute(
        select(Contact).where(Contact.user_id == user_id)
    )).scalars().all()

    contact_map = {c.id: c.name for c in contacts}
    contact_ids = [c.id for c in contacts]

    life_events = (await db.execute(
        select(LifeEvent).where(
            LifeEvent.contact_id.in_(contact_ids),
            LifeEvent.event_date.isnot(None),
        )
    )).scalars().all()

    upcoming: list[UpcomingEvent] = []

    # birthdays from contact birthday field
    for contact in contacts:
        if not contact.birthday:
            continue
        next_bday = next_annual_occurrence(contact.birthday, today)
        if today <= next_bday <= window_end:
            upcoming.append(UpcomingEvent(
                contact_id=contact.id,
                contact_name=contact.name,
                title="Birthday",
                event_type="birthday",
                event_date=next_bday,
                days_until=(next_bday - today).days,
                is_recurring=True,
            ))

    # life events
    for event in life_events:
        if event.is_recurring:
            next_date = next_annual_occurrence(event.event_date, today)
        else:
            next_date = event.event_date

        if today <= next_date <= window_end:
            upcoming.append(UpcomingEvent(
                contact_id=event.contact_id,
                contact_name=contact_map.get(event.contact_id, ""),
                title=event.title,
                event_type=event.event_type,
                event_date=next_date,
                days_until=(next_date - today).days,
                is_recurring=event.is_recurring,
            ))

    return sorted(upcoming, key=lambda e: e.event_date)
