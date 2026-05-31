import uuid
from datetime import date, timedelta
from app.models import Contact, Interaction, LifeEvent
from app.routers.dashboard import UPCOMING_DAYS
from tests.conftest import USER_A_ID, USER_B_ID


async def test_I8_overdue_no_interactions(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice", check_in_frequency_days=30)
    db.add(contact)
    await db.commit()
    resp = await client_a.get("/dashboard/overdue")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["days_overdue"] == 30


async def test_I9_not_overdue_recent_interaction(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice", check_in_frequency_days=30)
    db.add(contact)
    await db.flush()
    db.add(Interaction(contact_id=contact.id, date=date.today(), medium="call"))
    await db.commit()
    resp = await client_a.get("/dashboard/overdue")
    assert len(resp.json()) == 0


async def test_I10_overdue_by_one_day(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice", check_in_frequency_days=30)
    db.add(contact)
    await db.flush()
    db.add(Interaction(contact_id=contact.id, date=date.today() - timedelta(days=31), medium="call"))
    await db.commit()
    data = (await client_a.get("/dashboard/overdue")).json()
    assert len(data) == 1
    assert data[0]["days_overdue"] == 1


async def test_I11_no_frequency_not_overdue(db, client_a):
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Alice"))
    await db.commit()
    resp = await client_a.get("/dashboard/overdue")
    assert len(resp.json()) == 0


async def test_I12_birthday_within_window(db, client_a):
    today = date.today()
    target = today + timedelta(days=UPCOMING_DAYS - 1)
    bday = target.replace(year=2000)  # year 2000 is a leap year, any month/day is valid
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Alice", birthday=bday))
    await db.commit()
    events = (await client_a.get("/dashboard/upcoming")).json()
    assert any(e["event_type"] == "birthday" for e in events)


async def test_I13_birthday_outside_window(db, client_a):
    today = date.today()
    target = today + timedelta(days=UPCOMING_DAYS + 1)
    bday = target.replace(year=2000)
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Alice", birthday=bday))
    await db.commit()
    assert len((await client_a.get("/dashboard/upcoming")).json()) == 0


async def test_I14_non_recurring_past_event_not_upcoming(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    db.add(LifeEvent(
        contact_id=contact.id,
        title="Old meeting",
        event_type="meeting",
        event_date=date.today() - timedelta(days=1),
        is_recurring=False,
    ))
    await db.commit()
    assert len((await client_a.get("/dashboard/upcoming")).json()) == 0


async def test_I15_overdue_isolation_across_users(db, client_b):
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Alice", check_in_frequency_days=30))
    await db.commit()
    assert len((await client_b.get("/dashboard/overdue")).json()) == 0


async def test_I16_recurring_event_within_window(db, client_a):
    today = date.today()
    target = today + timedelta(days=UPCOMING_DAYS // 2)
    try:
        event_date = target.replace(year=target.year - 1)
    except ValueError:  # Feb 29 in non-leap year — step back one day
        event_date = (target - timedelta(days=1)).replace(year=target.year - 1)
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    db.add(LifeEvent(
        contact_id=contact.id,
        title="Anniversary",
        event_type="milestone",
        event_date=event_date,
        is_recurring=True,
    ))
    await db.commit()
    events = (await client_a.get("/dashboard/upcoming")).json()
    assert any(e["title"] == "Anniversary" for e in events)
