import asyncio
import logging
import os
from datetime import date, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import async_session_factory
from ..models import Contact, Interaction, LifeEvent, UserSettings
from ..config import settings
from ..utils import next_annual_occurrence

log = logging.getLogger(__name__)

UPCOMING_DAYS = 7


def _user_hour_matches(user_settings: UserSettings, now: datetime | None = None) -> bool:
    """Return True if the current hour in the user's timezone matches their reminder_hour."""
    try:
        tz = ZoneInfo(user_settings.timezone)
    except (ZoneInfoNotFoundError, Exception):
        tz = ZoneInfo("America/New_York")
    local_now = now.astimezone(tz) if now is not None else datetime.now(tz)
    return local_now.hour == user_settings.reminder_hour


async def _build_digest(db: AsyncSession, user_id, today: date) -> dict:
    """Returns {'overdue': [...], 'upcoming': [...]} for a user, excluding sms_opt_out contacts."""
    window_end = today + timedelta(days=UPCOMING_DAYS)

    last_interaction_sq = (
        select(Interaction.contact_id, func.max(Interaction.date).label("last_date"))
        .group_by(Interaction.contact_id)
        .subquery()
    )

    rows = (await db.execute(
        select(Contact, last_interaction_sq.c.last_date)
        .outerjoin(last_interaction_sq, Contact.id == last_interaction_sq.c.contact_id)
        .where(
            Contact.user_id == user_id,
            Contact.check_in_frequency_days.isnot(None),
            Contact.sms_opt_out.is_(False),
        )
    )).all()

    overdue = []
    for contact, last_date in rows:
        if last_date is None:
            overdue.append({"name": contact.name, "days_overdue": contact.check_in_frequency_days})
        else:
            days_since = (today - last_date).days
            if days_since > contact.check_in_frequency_days:
                overdue.append({"name": contact.name, "days_overdue": days_since - contact.check_in_frequency_days})

    overdue.sort(key=lambda c: c["days_overdue"], reverse=True)

    contacts = (await db.execute(
        select(Contact).where(
            Contact.user_id == user_id,
            Contact.sms_opt_out.is_(False),
        )
    )).scalars().all()

    contact_map = {c.id: c.name for c in contacts}
    contact_ids = [c.id for c in contacts]

    life_events = (await db.execute(
        select(LifeEvent).where(
            LifeEvent.contact_id.in_(contact_ids),
            LifeEvent.event_date.isnot(None),
        )
    )).scalars().all()

    upcoming = []

    for contact in contacts:
        if not contact.birthday:
            continue
        next_bday = next_annual_occurrence(contact.birthday, today)
        if today <= next_bday <= window_end:
            upcoming.append({
                "name": contact.name,
                "title": "Birthday",
                "event_date": next_bday,
                "days_until": (next_bday - today).days,
            })

    for event in life_events:
        next_date = next_annual_occurrence(event.event_date, today) if event.is_recurring else event.event_date
        if today <= next_date <= window_end:
            upcoming.append({
                "name": contact_map.get(event.contact_id, ""),
                "title": event.title,
                "event_date": next_date,
                "days_until": (next_date - today).days,
            })

    upcoming.sort(key=lambda e: e["event_date"])
    return {"overdue": overdue, "upcoming": upcoming}


def _format_sms(overdue: list, upcoming: list) -> str:
    parts = []
    if overdue:
        names = ", ".join(c["name"] for c in overdue[:3])
        suffix = f" +{len(overdue) - 3} more" if len(overdue) > 3 else ""
        parts.append(f"{len(overdue)} overdue: {names}{suffix}")
    if upcoming:
        names = ", ".join(f"{e['name']} ({e['title']})" for e in upcoming[:2])
        suffix = f" +{len(upcoming) - 2} more" if len(upcoming) > 2 else ""
        parts.append(f"Coming up: {names}{suffix}")
    return "Keep Contact: " + " | ".join(parts)


async def run_reminder_check():
    """Runs every hour; sends SMS digest only to users whose local hour matches their reminder_hour."""
    if os.getenv("SMS_ENABLED", "true").lower() != "true":
        log.info("SMS_ENABLED is off — skipping reminder check")
        return
    log.info("Running hourly reminder check")
    today = date.today()

    async with async_session_factory() as db:
        all_settings = (await db.execute(select(UserSettings))).scalars().all()

        for user_settings in all_settings:
            if not user_settings.sms_reminders_enabled or not user_settings.sms_phone:
                continue

            if not _user_hour_matches(user_settings, now=None):
                continue

            digest = await _build_digest(db, user_settings.user_id, today)
            if not digest["overdue"] and not digest["upcoming"]:
                continue

            await _send_sms(user_settings.sms_phone, digest["overdue"], digest["upcoming"])

    log.info("Reminder check complete")


async def _send_sms(to_phone: str, overdue: list, upcoming: list):
    from twilio.rest import Client
    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        body = _format_sms(overdue, upcoming)
        client.messages.create(to=to_phone, from_=settings.twilio_from_number, body=body)
        log.info(f"Reminder SMS sent to {to_phone}")
    except Exception as e:
        log.error(f"Failed to send SMS to {to_phone}: {e}")


def run_reminder_check_sync():
    asyncio.run(run_reminder_check())
