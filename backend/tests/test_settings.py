import uuid
from app.models import UserSettings
from tests.conftest import USER_A_ID, USER_B_ID


async def test_I39_get_settings_defaults(client_a):
    resp = await client_a.get("/settings/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email_reminders_enabled"] is False
    assert data["sms_reminders_enabled"] is False


async def test_I40_update_settings_phone(client_a):
    resp = await client_a.put("/settings/", json={"sms_phone": "+12125551234"})
    assert resp.status_code == 200
    assert resp.json()["sms_phone"] == "+12125551234"


async def test_I41_settings_isolation(db, client_b):
    db.add(UserSettings(
        user_id=uuid.UUID(USER_A_ID),
        sms_phone="+10000000001",
        email_reminders_enabled=True,
    ))
    await db.commit()
    resp = await client_b.get("/settings/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sms_phone"] is None
    assert data["email_reminders_enabled"] is False
