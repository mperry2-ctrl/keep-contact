import asyncio
import logging
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import async_session_factory
from ..models import Contact, Interaction, LifeEvent, UserSettings
from ..config import settings

log = logging.getLogger(__name__)

UPCOMING_DAYS = 3


def _next_annual_occurrence(event_date: date, today: date) -> date:
    try:
        candidate = event_date.replace(year=today.year)
    except ValueError:
        candidate = event_date.replace(year=today.year, day=28)
    if candidate < today:
        try:
            candidate = event_date.replace(year=today.year + 1)
        except ValueError:
            candidate = event_date.replace(year=today.year + 1, day=28)
    return candidate


async def _build_digest(db: AsyncSession, user_id, today: date) -> dict:
    """Returns {'overdue': [...], 'upcoming': [...]} for a user."""
    window_end = today + timedelta(days=UPCOMING_DAYS)

    last_interaction_sq = (
        select(Interaction.contact_id, func.max(Interaction.date).label("last_date"))
        .group_by(Interaction.contact_id)
        .subquery()
    )

    rows = (await db.execute(
        select(Contact, last_interaction_sq.c.last_date)
        .outerjoin(last_interaction_sq, Contact.id == last_interaction_sq.c.contact_id)
        .where(Contact.user_id == user_id, Contact.check_in_frequency_days.isnot(None))
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

    upcoming = []

    for contact in contacts:
        if not contact.birthday:
            continue
        next_bday = _next_annual_occurrence(contact.birthday, today)
        if today <= next_bday <= window_end:
            upcoming.append({"name": contact.name, "title": "Birthday", "event_date": next_bday, "days_until": (next_bday - today).days})

    for event in life_events:
        next_date = _next_annual_occurrence(event.event_date, today) if event.is_recurring else event.event_date
        if today <= next_date <= window_end:
            upcoming.append({
                "name": contact_map.get(event.contact_id, ""),
                "title": event.title,
                "event_date": next_date,
                "days_until": (next_date - today).days,
            })

    upcoming.sort(key=lambda e: e["event_date"])
    return {"overdue": overdue, "upcoming": upcoming}


def _format_email_html(overdue: list, upcoming: list, today: date) -> str:
    lines = [f"<h2>Keep Contact — {today.strftime('%B %d, %Y')}</h2>"]

    if overdue:
        lines.append("<h3>Reach out</h3><ul>")
        for c in overdue:
            days = c["days_overdue"]
            label = f"{days} day{'s' if days != 1 else ''} overdue"
            lines.append(f"<li><strong>{c['name']}</strong> — {label}</li>")
        lines.append("</ul>")

    if upcoming:
        lines.append("<h3>Coming up (next 3 days)</h3><ul>")
        for e in upcoming:
            when = "today" if e["days_until"] == 0 else ("tomorrow" if e["days_until"] == 1 else f"in {e['days_until']} days")
            lines.append(f"<li><strong>{e['name']}</strong> — {e['title']} ({when})</li>")
        lines.append("</ul>")

    return "\n".join(lines)


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
    log.info("Running daily reminder check")
    today = date.today()

    async with async_session_factory() as db:
        all_settings = (await db.execute(select(UserSettings))).scalars().all()

        for user_settings in all_settings:
            if not user_settings.email_reminders_enabled and not user_settings.sms_reminders_enabled:
                continue

            digest = await _build_digest(db, user_settings.user_id, today)
            if not digest["overdue"] and not digest["upcoming"]:
                continue

            user_email = await _get_user_email(user_settings.user_id)

            if user_settings.email_reminders_enabled and user_email:
                await _send_email(user_email, digest["overdue"], digest["upcoming"], today)

            if user_settings.sms_reminders_enabled and user_settings.sms_phone:
                await _send_sms(user_settings.sms_phone, digest["overdue"], digest["upcoming"])

    log.info("Reminder check complete")


async def _get_user_email(user_id) -> str | None:
    import httpx
    from ..config import settings as cfg
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{cfg.supabase_url}/auth/v1/admin/users/{user_id}",
                headers={"apikey": cfg.supabase_service_role_key, "Authorization": f"Bearer {cfg.supabase_service_role_key}"},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json().get("email")
    except Exception as e:
        log.error(f"Failed to fetch email for user {user_id}: {e}")
        return None


async def _send_email(to_email: str, overdue: list, upcoming: list, today: date):
    import resend
    resend.api_key = settings.resend_api_key
    try:
        html = _format_email_html(overdue, upcoming, today)
        resend.Emails.send({
            "from": settings.from_email,
            "to": to_email,
            "subject": f"Keep Contact — {today.strftime('%b %d')} reminders",
            "html": html,
        })
        log.info(f"Reminder email sent to {to_email}")
    except Exception as e:
        log.error(f"Failed to send email to {to_email}: {e}")


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
