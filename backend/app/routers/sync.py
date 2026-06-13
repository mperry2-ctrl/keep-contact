import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["sync"])

MESSAGE_LIMIT = 500


class RawMessage(BaseModel):
    sender: str
    body: Optional[str] = None
    date: datetime
    conversation: str
    subject: Optional[str] = None


class RawMessageSyncRequest(BaseModel):
    messages: list[RawMessage]


class RawMessageSyncResponse(BaseModel):
    received: int
    skipped_no_body: int
    truncated: bool
    total_sent: int
    window_start: Optional[datetime]
    window_end: Optional[datetime]
    conversations: list[str]
    messages_per_conversation: dict[str, int]


@router.post("/shortcuts/messages", response_model=RawMessageSyncResponse)
async def receive_raw_messages(
    body: RawMessageSyncRequest,
    user: dict = Depends(get_current_user),
):
    all_messages = body.messages

    if not all_messages:
        return RawMessageSyncResponse(
            received=0,
            skipped_no_body=0,
            truncated=False,
            total_sent=0,
            window_start=None,
            window_end=None,
            conversations=[],
            messages_per_conversation={},
        )

    total_sent = len(all_messages)

    # Sort ascending, keep earliest 500
    sorted_messages = sorted(all_messages, key=lambda m: m.date)
    truncated = total_sent > MESSAGE_LIMIT
    working_set = sorted_messages[:MESSAGE_LIMIT]

    # Filter null/empty bodies
    valid = [m for m in working_set if m.body and m.body.strip()]
    skipped_no_body = len(working_set) - len(valid)

    # Build per-conversation counts
    messages_per_conversation: dict[str, int] = {}
    for m in valid:
        messages_per_conversation[m.conversation] = (
            messages_per_conversation.get(m.conversation, 0) + 1
        )

    window_start = working_set[0].date if working_set else None
    window_end = working_set[-1].date if working_set else None

    response = RawMessageSyncResponse(
        received=len(valid),
        skipped_no_body=skipped_no_body,
        truncated=truncated,
        total_sent=total_sent,
        window_start=window_start,
        window_end=window_end,
        conversations=list(messages_per_conversation.keys()),
        messages_per_conversation=messages_per_conversation,
    )
    logger.info(
        "sync/shortcuts/messages user=%s total_sent=%d received=%d skipped=%d truncated=%s conversations=%s",
        user["id"], total_sent, response.received, response.skipped_no_body,
        response.truncated, response.messages_per_conversation,
    )
    return response
