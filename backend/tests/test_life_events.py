import uuid
from app.models import Contact, LifeEvent
from tests.conftest import USER_A_ID, USER_B_ID


async def test_I30_create_life_event(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.commit()
    resp = await client_a.post(
        f"/contacts/{contact.id}/life_events/",
        json={"title": "Trip to Japan", "event_type": "trip", "event_date": "2026-09-01"},
    )
    assert resp.status_code == 201
    assert resp.json()["contact_id"] == str(contact.id)


async def test_I31_update_life_event(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    event = LifeEvent(contact_id=contact.id, title="Old Title", event_type="milestone")
    db.add(event)
    await db.commit()
    resp = await client_a.put(
        f"/contacts/{contact.id}/life_events/{event.id}",
        json={"title": "Updated"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


async def test_I32_update_other_users_life_event(db, client_b):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    event = LifeEvent(contact_id=contact.id, title="Trip", event_type="trip")
    db.add(event)
    await db.commit()
    resp = await client_b.put(
        f"/contacts/{contact.id}/life_events/{event.id}",
        json={"title": "Hacked"},
    )
    assert resp.status_code == 404


async def test_I33_delete_life_event(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    event = LifeEvent(contact_id=contact.id, title="Trip", event_type="trip")
    db.add(event)
    await db.commit()
    resp = await client_a.delete(f"/contacts/{contact.id}/life_events/{event.id}")
    assert resp.status_code == 204


async def test_I34_delete_other_users_life_event(db, client_b):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    event = LifeEvent(contact_id=contact.id, title="Trip", event_type="trip")
    db.add(event)
    await db.commit()
    resp = await client_b.delete(f"/contacts/{contact.id}/life_events/{event.id}")
    assert resp.status_code == 404
