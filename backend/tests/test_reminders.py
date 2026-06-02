"""
Tests for SMS reminder logic.

Unit tests (U-series): no DB required — test pure functions directly.
Integration tests (I-series): hit the test DB via client_a fixture.
Smoke test: see tests/smoke/test_twilio_smoke.py (gated behind RUN_TWILIO_INTEGRATION=1).
"""
import uuid
from datetime import date, datetime, timezone, timedelta

import pytest

from app.jobs.reminder_check import _user_hour_matches, _build_digest, _format_sms
from app.models import Contact, UserSettings, Interaction, LifeEvent
from tests.conftest import USER_A_ID


# ---------------------------------------------------------------------------
# Unit tests — _user_hour_matches
# ---------------------------------------------------------------------------

def _make_settings(hour: int, tz: str) -> UserSettings:
    return UserSettings(
        user_id=uuid.uuid4(),
        reminder_hour=hour,
        timezone=tz,
        sms_reminders_enabled=True,
    )


def test_U7_hour_matches_in_correct_timezone():
    # 13:30 UTC = 09:30 Eastern (UTC-4 in summer)
    now = datetime(2026, 6, 1, 13, 30, tzinfo=timezone.utc)
    s = _make_settings(hour=9, tz="America/New_York")
    assert _user_hour_matches(s, now=now) is True


def test_U8_hour_does_not_match():
    now = datetime(2026, 6, 1, 13, 30, tzinfo=timezone.utc)
    s = _make_settings(hour=8, tz="America/New_York")
    assert _user_hour_matches(s, now=now) is False


def test_U9_different_timezone_same_utc_time():
    # 13:30 UTC = 06:30 Pacific (UTC-7 in summer)
    now = datetime(2026, 6, 1, 13, 30, tzinfo=timezone.utc)
    eastern = _make_settings(hour=9, tz="America/New_York")
    pacific = _make_settings(hour=9, tz="America/Los_Angeles")
    assert _user_hour_matches(eastern, now=now) is True
    assert _user_hour_matches(pacific, now=now) is False


def test_U10_invalid_timezone_falls_back_to_eastern():
    # Falls back to America/New_York — 13:30 UTC = 09:30 Eastern
    now = datetime(2026, 6, 1, 13, 30, tzinfo=timezone.utc)
    s = _make_settings(hour=9, tz="Not/ATimezone")
    assert _user_hour_matches(s, now=now) is True


def test_U11_midnight_hour():
    # 04:00 UTC = 00:00 Eastern (UTC-4)
    now = datetime(2026, 6, 1, 4, 0, tzinfo=timezone.utc)
    s = _make_settings(hour=0, tz="America/New_York")
    assert _user_hour_matches(s, now=now) is True


# ---------------------------------------------------------------------------
# Unit tests — _format_sms
# ---------------------------------------------------------------------------

def test_U12_format_sms_overdue_only():
    overdue = [{"name": "Alice", "days_overdue": 5}]
    msg = _format_sms(overdue, [])
    assert "Alice" in msg
    assert "overdue" in msg
    assert "Coming up" not in msg


def test_U13_format_sms_upcoming_only():
    upcoming = [{"name": "Bob", "title": "Birthday", "event_date": date(2026, 6, 5), "days_until": 4}]
    msg = _format_sms([], upcoming)
    assert "Bob" in msg
    assert "Birthday" in msg
    assert "overdue" not in msg


def test_U14_format_sms_combined():
    overdue = [{"name": "Alice", "days_overdue": 5}]
    upcoming = [{"name": "Bob", "title": "Birthday", "event_date": date(2026, 6, 5), "days_until": 4}]
    msg = _format_sms(overdue, upcoming)
    assert "Alice" in msg
    assert "Bob" in msg
    assert "|" in msg


def test_U15_format_sms_truncates_overdue_at_three():
    overdue = [{"name": f"Person{i}", "days_overdue": i} for i in range(5)]
    msg = _format_sms(overdue, [])
    assert "+2 more" in msg


def test_U16_format_sms_truncates_upcoming_at_two():
    upcoming = [
        {"name": f"Person{i}", "title": "Birthday", "event_date": date(2026, 6, i + 1), "days_until": i}
        for i in range(4)
    ]
    msg = _format_sms([], upcoming)
    assert "+2 more" in msg


def test_U17_format_sms_starts_with_keep_contact():
    overdue = [{"name": "Alice", "days_overdue": 1}]
    assert _format_sms(overdue, []).startswith("Keep Contact:")


# ---------------------------------------------------------------------------
# Integration tests — contact sms_opt_out via API
# ---------------------------------------------------------------------------

async def test_I42_contact_sms_opt_out_defaults_false(client_a):
    resp = await client_a.post("/contacts/", json={"name": "Alice"})
    assert resp.status_code == 201
    assert resp.json()["sms_opt_out"] is False


async def test_I43_contact_sms_opt_out_can_be_enabled(client_a):
    create = await client_a.post("/contacts/", json={"name": "Alice"})
    cid = create.json()["id"]
    resp = await client_a.put(f"/contacts/{cid}", json={"name": "Alice", "sms_opt_out": True})
    assert resp.status_code == 200
    assert resp.json()["sms_opt_out"] is True


async def test_I44_contact_sms_opt_out_persists_on_get(client_a):
    create = await client_a.post("/contacts/", json={"name": "Alice", "sms_opt_out": True})
    cid = create.json()["id"]
    resp = await client_a.get(f"/contacts/{cid}")
    assert resp.json()["sms_opt_out"] is True


# ---------------------------------------------------------------------------
# Integration tests — settings reminder_hour and timezone
# ---------------------------------------------------------------------------

async def test_I45_settings_reminder_hour_default(client_a):
    resp = await client_a.get("/settings/")
    assert resp.status_code == 200
    assert resp.json()["reminder_hour"] == 8


async def test_I46_settings_timezone_default(client_a):
    resp = await client_a.get("/settings/")
    assert resp.json()["timezone"] == "America/New_York"


async def test_I47_settings_reminder_hour_update(client_a):
    resp = await client_a.put("/settings/", json={"reminder_hour": 9})
    assert resp.status_code == 200
    assert resp.json()["reminder_hour"] == 9


async def test_I48_settings_timezone_update(client_a):
    resp = await client_a.put("/settings/", json={"timezone": "America/Los_Angeles"})
    assert resp.status_code == 200
    assert resp.json()["timezone"] == "America/Los_Angeles"


# ---------------------------------------------------------------------------
# Integration tests — _build_digest filters
# ---------------------------------------------------------------------------

async def test_I49_digest_excludes_opted_out_contact(db, client_a):
    user_id = uuid.UUID(USER_A_ID)
    today = date(2026, 6, 1)

    # Opted-out contact that is overdue
    opted_out = Contact(
        user_id=user_id,
        name="OptedOut",
        check_in_frequency_days=7,
        sms_opt_out=True,
    )
    # Normal contact that is overdue
    normal = Contact(
        user_id=user_id,
        name="Normal",
        check_in_frequency_days=7,
        sms_opt_out=False,
    )
    db.add_all([opted_out, normal])
    await db.commit()

    digest = await _build_digest(db, user_id, today)
    names = [c["name"] for c in digest["overdue"]]
    assert "Normal" in names
    assert "OptedOut" not in names


async def test_I50_digest_excludes_opted_out_from_upcoming(db, client_a):
    user_id = uuid.UUID(USER_A_ID)
    today = date(2026, 6, 1)

    opted_out = Contact(
        user_id=user_id,
        name="OptedOut",
        sms_opt_out=True,
        birthday=date(1990, 6, 3),  # 2 days away
    )
    normal = Contact(
        user_id=user_id,
        name="Normal",
        sms_opt_out=False,
        birthday=date(1990, 6, 3),
    )
    db.add_all([opted_out, normal])
    await db.commit()

    digest = await _build_digest(db, user_id, today)
    names = [e["name"] for e in digest["upcoming"]]
    assert "Normal" in names
    assert "OptedOut" not in names


async def test_I51_digest_upcoming_window_is_7_days(db, client_a):
    user_id = uuid.UUID(USER_A_ID)
    today = date(2026, 6, 1)

    in_window = Contact(user_id=user_id, name="InWindow", sms_opt_out=False, birthday=date(1990, 6, 7))
    outside_window = Contact(user_id=user_id, name="Outside", sms_opt_out=False, birthday=date(1990, 6, 9))
    db.add_all([in_window, outside_window])
    await db.commit()

    digest = await _build_digest(db, user_id, today)
    names = [e["name"] for e in digest["upcoming"]]
    assert "InWindow" in names
    assert "Outside" not in names


async def test_I52_digest_contact_with_recent_interaction_not_overdue(db, client_a):
    user_id = uuid.UUID(USER_A_ID)
    today = date(2026, 6, 1)

    contact = Contact(user_id=user_id, name="Recent", check_in_frequency_days=30, sms_opt_out=False)
    db.add(contact)
    await db.commit()

    interaction = Interaction(
        contact_id=contact.id,
        date=date(2026, 5, 20),  # 12 days ago, well within 30-day window
        medium="call",
    )
    db.add(interaction)
    await db.commit()

    digest = await _build_digest(db, user_id, today)
    names = [c["name"] for c in digest["overdue"]]
    assert "Recent" not in names
