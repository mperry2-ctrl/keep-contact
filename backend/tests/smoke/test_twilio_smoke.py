"""
Smoke test: sends a real SMS via Twilio to verify end-to-end delivery.

Run with:
    RUN_TWILIO_INTEGRATION=1 SMOKE_SMS_TO=+1XXXXXXXXXX pytest tests/smoke/ -v

Required env vars (in addition to normal backend .env):
    RUN_TWILIO_INTEGRATION=1   — gate that enables this test
    SMOKE_SMS_TO               — phone number to receive the test SMS (E.164)
"""
import os
import pytest
from pathlib import Path
from dotenv import dotenv_values


def _load_real_twilio_creds() -> dict:
    """Load Twilio creds directly from .env, bypassing pytest-injected test values."""
    env_path = Path(__file__).parent.parent.parent / ".env"
    return dotenv_values(env_path)


@pytest.mark.skipif(
    os.getenv("RUN_TWILIO_INTEGRATION") != "1",
    reason="Set RUN_TWILIO_INTEGRATION=1 to run Twilio smoke test",
)
def test_smoke_twilio_sends_sms():
    to_phone = os.getenv("SMOKE_SMS_TO")
    if not to_phone:
        pytest.fail("Set SMOKE_SMS_TO=+1XXXXXXXXXX to specify the destination number")

    creds = _load_real_twilio_creds()
    account_sid = creds.get("TWILIO_ACCOUNT_SID")
    auth_token = creds.get("TWILIO_AUTH_TOKEN")
    from_number = creds.get("TWILIO_FROM_NUMBER")

    if not account_sid or account_sid == "test":
        pytest.fail("TWILIO_ACCOUNT_SID not set in backend/.env")
    if not auth_token or auth_token == "test":
        pytest.fail("TWILIO_AUTH_TOKEN not set in backend/.env")
    if not from_number:
        pytest.fail("TWILIO_FROM_NUMBER not set in backend/.env")

    from twilio.rest import Client

    client = Client(account_sid, auth_token)
    message = client.messages.create(
        to=to_phone,
        from_=from_number,
        body="Keep Contact smoke test — Twilio is wired correctly.",
    )

    assert message.sid is not None
    assert message.sid.startswith("SM"), f"Unexpected SID format: {message.sid}"
    print(f"\nSMS sent successfully. SID: {message.sid}")
