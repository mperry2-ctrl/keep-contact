import re
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Form, Request, Response
from sqlalchemy import select, case
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.request_validator import RequestValidator
from ..database import get_db
from ..models import UserSettings, Todo
from ..config import settings

router = APIRouter(prefix="/sms", tags=["sms"])
log = logging.getLogger(__name__)

_CATEGORY_RANK = case(
    (Todo.category == "priority", 0),
    (Todo.category == "need_to_do", 1),
    (Todo.category == "wishlist", 2),
    else_=3,
)

_ORDER = [_CATEGORY_RANK, Todo.due_date.asc().nullslast(), Todo.created_at.asc(), Todo.description.asc()]

_DONE_RE = re.compile(r"^(done|complete|completed|finish|finished)\s*([\d\s,]+)$", re.IGNORECASE)

HELP_TEXT = "Keep Contact: Reply 'done 1 2 3' to complete to-do items. Reply STOP to unsubscribe."


def _parse_done_reply(body: str) -> list[int] | None:
    m = _DONE_RE.match(body.strip())
    if not m:
        return None
    nums = [int(n) for n in re.findall(r"\d+", m.group(2))]
    return nums if nums else None


def _send_sms(to: str, body: str) -> None:
    from twilio.rest import Client
    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(to=to, from_=settings.twilio_from_number, body=body)
    except Exception as e:
        log.error(f"Failed to send SMS to {to}: {e}")


@router.post("/inbound")
async def sms_inbound(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    if settings.twilio_auth_token:
        validator = RequestValidator(settings.twilio_auth_token)
        signature = request.headers.get("X-Twilio-Signature", "")
        form_data = dict(await request.form())
        if not validator.validate(str(request.url), form_data, signature):
            log.warning("Invalid Twilio signature on inbound SMS")
            return Response(status_code=403)

    result = await db.execute(
        select(UserSettings).where(UserSettings.sms_phone == From)
    )
    user_settings = result.scalar_one_or_none()

    if not user_settings:
        return Response(status_code=204)

    indices = _parse_done_reply(Body)

    if indices is None:
        _send_sms(From, HELP_TEXT)
        return Response(status_code=204)

    todos_result = await db.execute(
        select(Todo)
        .where(Todo.user_id == user_settings.user_id, Todo.completed_at.is_(None))
        .order_by(*_ORDER)
    )
    todos = todos_result.scalars().all()

    completed_names = []
    skipped = []
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for idx in indices:
        if 1 <= idx <= len(todos):
            todos[idx - 1].completed_at = now
            completed_names.append(todos[idx - 1].description)
        else:
            skipped.append(idx)

    await db.commit()

    if completed_names:
        n = len(completed_names)
        msg = f"Keep Contact: Marked {n} item{'s' if n != 1 else ''} complete: {', '.join(completed_names)}."
        if skipped:
            msg += f" Skipped: {', '.join(str(s) for s in skipped)} (not found)."
    else:
        msg = f"Keep Contact: No items marked complete. {', '.join(str(s) for s in skipped)} not found."

    _send_sms(From, msg)
    return Response(status_code=204)
