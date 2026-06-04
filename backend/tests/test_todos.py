"""
Tests for the todo feature.

Unit tests (U-series): pure function tests, no DB.
Integration tests (I-series): hit the test DB via client fixtures.
"""
import uuid
from datetime import date, datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock

import pytest

from app.jobs.reminder_check import _format_todo_line, _time_ago, _format_sms
from app.routers.sms import _parse_done_reply
from tests.conftest import USER_A_ID, USER_B_ID


# ---------------------------------------------------------------------------
# Unit tests — _parse_done_reply
# ---------------------------------------------------------------------------

def test_U18_parse_done_space_separated():
    assert _parse_done_reply("done 1 3 6") == [1, 3, 6]


def test_U19_parse_done_comma_separated():
    assert _parse_done_reply("done 1,3,6") == [1, 3, 6]


def test_U20_parse_done_mixed_separators():
    assert _parse_done_reply("done 1, 3 6") == [1, 3, 6]


def test_U21_parse_done_case_insensitive():
    assert _parse_done_reply("Done 2 4") == [2, 4]
    assert _parse_done_reply("COMPLETED 1") == [1]
    assert _parse_done_reply("finished 5") == [5]


def test_U22_parse_done_single_item():
    assert _parse_done_reply("done 1") == [1]


def test_U23_parse_unrecognized_returns_none():
    assert _parse_done_reply("sounds good") is None
    assert _parse_done_reply("thanks") is None
    assert _parse_done_reply("") is None
    assert _parse_done_reply("done") is None


# ---------------------------------------------------------------------------
# Unit tests — _time_ago
# ---------------------------------------------------------------------------

def test_U24_time_ago_today():
    today = date(2026, 6, 4)
    created = datetime(2026, 6, 4, 8, 0)
    assert _time_ago(created, today) == "today"


def test_U25_time_ago_one_day():
    today = date(2026, 6, 4)
    created = datetime(2026, 6, 3, 8, 0)
    assert _time_ago(created, today) == "1 day ago"


def test_U26_time_ago_days():
    today = date(2026, 6, 4)
    created = datetime(2026, 5, 30, 8, 0)
    assert _time_ago(created, today) == "5 days ago"


def test_U27_time_ago_one_week():
    today = date(2026, 6, 4)
    created = datetime(2026, 5, 28, 8, 0)
    assert _time_ago(created, today) == "1 week ago"


def test_U28_time_ago_months():
    today = date(2026, 6, 4)
    created = datetime(2026, 4, 4, 8, 0)
    assert _time_ago(created, today) == "2 months ago"


# ---------------------------------------------------------------------------
# Unit tests — _format_todo_line
# ---------------------------------------------------------------------------

def test_U29_format_todo_priority_emoji():
    todo = {"description": "Fix car", "category": "priority", "due_date": None, "created_at": datetime(2026, 5, 30)}
    line = _format_todo_line(1, todo, date(2026, 6, 4))
    assert line.startswith("1. ⚡ Fix car")


def test_U30_format_todo_need_to_do_emoji():
    todo = {"description": "Call dentist", "category": "need_to_do", "due_date": None, "created_at": datetime(2026, 5, 28)}
    line = _format_todo_line(2, todo, date(2026, 6, 4))
    assert line.startswith("2. 📌 Call dentist")


def test_U31_format_todo_wishlist_emoji():
    todo = {"description": "Read book", "category": "wishlist", "due_date": None, "created_at": datetime(2026, 5, 1)}
    line = _format_todo_line(3, todo, date(2026, 6, 4))
    assert line.startswith("3. 💭 Read book")


def test_U32_format_todo_with_due_date():
    todo = {"description": "Fix car", "category": "priority", "due_date": date(2026, 6, 7), "created_at": datetime(2026, 5, 30)}
    line = _format_todo_line(1, todo, date(2026, 6, 4))
    assert "Deadline Jun 7" in line


def test_U33_format_todo_without_due_date_has_no_deadline():
    todo = {"description": "Fix car", "category": "priority", "due_date": None, "created_at": datetime(2026, 5, 30)}
    line = _format_todo_line(1, todo, date(2026, 6, 4))
    assert "Deadline" not in line


def test_U34_format_todo_includes_created_age():
    todo = {"description": "Fix car", "category": "priority", "due_date": None, "created_at": datetime(2026, 5, 30)}
    line = _format_todo_line(1, todo, date(2026, 6, 4))
    assert "created" in line


def test_U35_format_sms_includes_todo_section():
    todos = [
        {"description": "Fix car", "category": "priority", "due_date": None, "created_at": datetime(2026, 6, 3)},
    ]
    msg = _format_sms([], [], todos=todos, today=date(2026, 6, 4))
    assert "To-Do:" in msg
    assert "Fix car" in msg
    assert "done 1 2 3" in msg


def test_U36_format_sms_no_done_hint_without_todos():
    msg = _format_sms([{"name": "Alice", "days_overdue": 3}], [], todos=[], today=date(2026, 6, 4))
    assert "done 1 2 3" not in msg


def test_U37_format_sms_todos_numbered():
    todos = [
        {"description": "First", "category": "priority", "due_date": None, "created_at": datetime(2026, 6, 1)},
        {"description": "Second", "category": "need_to_do", "due_date": None, "created_at": datetime(2026, 6, 2)},
    ]
    msg = _format_sms([], [], todos=todos, today=date(2026, 6, 4))
    assert "1. ⚡ First" in msg
    assert "2. 📌 Second" in msg


# ---------------------------------------------------------------------------
# Integration tests — /todos CRUD
# ---------------------------------------------------------------------------

async def test_I53_create_todo(client_a):
    resp = await client_a.post("/todos/", json={"description": "Buy milk", "category": "priority"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["description"] == "Buy milk"
    assert data["category"] == "priority"
    assert data["completed_at"] is None


async def test_I54_create_todo_default_category(client_a):
    resp = await client_a.post("/todos/", json={"description": "Call dentist"})
    assert resp.status_code == 201
    assert resp.json()["category"] == "need_to_do"


async def test_I55_create_todo_with_due_date(client_a):
    resp = await client_a.post("/todos/", json={"description": "File taxes", "category": "priority", "due_date": "2026-06-10"})
    assert resp.status_code == 201
    assert resp.json()["due_date"] == "2026-06-10"


async def test_I56_list_todos_returns_only_own(client_a, db):
    from app.models import Todo
    await client_a.post("/todos/", json={"description": "Alice task"})
    # Insert a todo directly for a different user
    other = Todo(user_id=uuid.UUID(USER_B_ID), description="Bob task", category="need_to_do")
    db.add(other)
    await db.commit()
    resp = await client_a.get("/todos/")
    descriptions = [t["description"] for t in resp.json()]
    assert "Alice task" in descriptions
    assert "Bob task" not in descriptions


async def test_I57_list_todos_sorted_by_category_then_due_date(client_a):
    await client_a.post("/todos/", json={"description": "Wishlist item", "category": "wishlist"})
    await client_a.post("/todos/", json={"description": "Priority item", "category": "priority"})
    await client_a.post("/todos/", json={"description": "Need to do item", "category": "need_to_do"})
    resp = await client_a.get("/todos/")
    categories = [t["category"] for t in resp.json()]
    assert categories == ["priority", "need_to_do", "wishlist"]


async def test_I58_list_todos_due_date_nulls_last(client_a):
    await client_a.post("/todos/", json={"description": "No date", "category": "priority"})
    await client_a.post("/todos/", json={"description": "Has date", "category": "priority", "due_date": "2026-06-10"})
    resp = await client_a.get("/todos/")
    items = resp.json()
    assert items[0]["description"] == "Has date"
    assert items[1]["description"] == "No date"


async def test_I59_update_todo_description(client_a):
    create = await client_a.post("/todos/", json={"description": "Old"})
    tid = create.json()["id"]
    resp = await client_a.put(f"/todos/{tid}", json={"description": "New"})
    assert resp.status_code == 200
    assert resp.json()["description"] == "New"


async def test_I60_update_todo_category(client_a):
    create = await client_a.post("/todos/", json={"description": "Task", "category": "wishlist"})
    tid = create.json()["id"]
    resp = await client_a.put(f"/todos/{tid}", json={"category": "priority"})
    assert resp.json()["category"] == "priority"


async def test_I61_update_todo_due_date(client_a):
    create = await client_a.post("/todos/", json={"description": "Task"})
    tid = create.json()["id"]
    resp = await client_a.put(f"/todos/{tid}", json={"due_date": "2026-07-01"})
    assert resp.json()["due_date"] == "2026-07-01"


async def test_I62_complete_todo_sets_completed_at(client_a):
    create = await client_a.post("/todos/", json={"description": "Task"})
    tid = create.json()["id"]
    resp = await client_a.post(f"/todos/{tid}/complete")
    assert resp.status_code == 200
    assert resp.json()["completed_at"] is not None


async def test_I63_delete_todo(client_a):
    create = await client_a.post("/todos/", json={"description": "Task"})
    tid = create.json()["id"]
    resp = await client_a.delete(f"/todos/{tid}")
    assert resp.status_code == 204
    listed = await client_a.get("/todos/")
    assert all(t["id"] != tid for t in listed.json())


async def test_I64_cannot_access_other_users_todo(client_a, db):
    from app.models import Todo
    # Insert a todo owned by user B
    other = Todo(user_id=uuid.UUID(USER_B_ID), description="Private", category="need_to_do")
    db.add(other)
    await db.commit()
    # user A should get 404 trying to edit it
    resp = await client_a.put(f"/todos/{other.id}", json={"description": "Hacked"})
    assert resp.status_code == 404


async def test_I65_invalid_category_rejected(client_a):
    resp = await client_a.post("/todos/", json={"description": "Task", "category": "invalid"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Integration tests — /sms/inbound
# ---------------------------------------------------------------------------

# Patch Twilio signature validation for all inbound SMS tests
def _sms_post(client, from_: str, body: str):
    """Post to /sms/inbound with Twilio signature validation bypassed."""
    return client.post(
        "/sms/inbound",
        data={"From": from_, "Body": body},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )


async def test_I66_sms_inbound_unknown_phone_returns_204(client_a):
    with patch("app.routers.sms.RequestValidator") as mock_val:
        mock_val.return_value.validate.return_value = True
        resp = await _sms_post(client_a, "+19995550000", "done 1")
    assert resp.status_code == 204


async def test_I67_sms_inbound_unrecognized_sends_help(client_a, db):
    user_id = uuid.UUID(USER_A_ID)
    from app.models import UserSettings
    settings_obj = UserSettings(user_id=user_id, sms_reminders_enabled=True, sms_phone="+12025550001")
    db.add(settings_obj)
    await db.commit()

    with patch("app.routers.sms.RequestValidator") as mock_val, \
         patch("app.routers.sms._send_sms") as mock_send:
        mock_val.return_value.validate.return_value = True
        resp = await _sms_post(client_a, "+12025550001", "thanks")

    assert resp.status_code == 204
    mock_send.assert_called_once()
    assert "done 1 2 3" in mock_send.call_args[0][1]


async def test_I68_sms_inbound_done_marks_correct_todos(client_a, db):
    user_id = uuid.UUID(USER_A_ID)
    from app.models import UserSettings, Todo
    settings_obj = UserSettings(user_id=user_id, sms_reminders_enabled=True, sms_phone="+12025550002")
    db.add(settings_obj)
    t1 = Todo(user_id=user_id, description="First", category="priority")
    t2 = Todo(user_id=user_id, description="Second", category="need_to_do")
    t3 = Todo(user_id=user_id, description="Third", category="wishlist")
    db.add_all([t1, t2, t3])
    await db.commit()

    with patch("app.routers.sms.RequestValidator") as mock_val, \
         patch("app.routers.sms._send_sms") as mock_send:
        mock_val.return_value.validate.return_value = True
        resp = await _sms_post(client_a, "+12025550002", "done 1 3")

    assert resp.status_code == 204
    await db.refresh(t1)
    await db.refresh(t2)
    await db.refresh(t3)
    assert t1.completed_at is not None
    assert t2.completed_at is None
    assert t3.completed_at is not None
    confirmation = mock_send.call_args[0][1]
    assert "First" in confirmation
    assert "Third" in confirmation


async def test_I69_sms_inbound_partial_invalid_index(client_a, db):
    user_id = uuid.UUID(USER_A_ID)
    from app.models import UserSettings, Todo
    settings_obj = UserSettings(user_id=user_id, sms_reminders_enabled=True, sms_phone="+12025550003")
    db.add(settings_obj)
    t1 = Todo(user_id=user_id, description="Only", category="priority")
    db.add(t1)
    await db.commit()

    with patch("app.routers.sms.RequestValidator") as mock_val, \
         patch("app.routers.sms._send_sms") as mock_send:
        mock_val.return_value.validate.return_value = True
        await _sms_post(client_a, "+12025550003", "done 1 9")

    confirmation = mock_send.call_args[0][1]
    assert "Only" in confirmation
    assert "9" in confirmation
    assert "not found" in confirmation


async def test_I70_digest_fires_on_todos_only(db):
    """_build_digest returns todos even when overdue/upcoming are empty."""
    from app.jobs.reminder_check import _build_digest
    from app.models import Todo
    user_id = uuid.UUID(USER_A_ID)
    t = Todo(user_id=user_id, description="Solo task", category="priority")
    db.add(t)
    await db.commit()

    digest = await _build_digest(db, user_id, date(2026, 6, 4))
    assert digest["overdue"] == []
    assert digest["upcoming"] == []
    assert any(t["description"] == "Solo task" for t in digest["todos"])
