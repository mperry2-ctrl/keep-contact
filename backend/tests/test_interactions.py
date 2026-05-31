import uuid
from datetime import date, timedelta
from app.models import Contact, Interaction
from tests.conftest import USER_A_ID, USER_B_ID


async def test_I17_create_interaction(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.commit()
    resp = await client_a.post(
        f"/contacts/{contact.id}/interactions/",
        json={"date": str(date.today()), "medium": "call"},
    )
    assert resp.status_code == 201
    assert resp.json()["contact_id"] == str(contact.id)


async def test_I18_logged_interaction_clears_overdue(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice", check_in_frequency_days=30)
    db.add(contact)
    await db.commit()
    assert len((await client_a.get("/dashboard/overdue")).json()) == 1
    await client_a.post(
        f"/contacts/{contact.id}/interactions/",
        json={"date": str(date.today()), "medium": "call"},
    )
    assert len((await client_a.get("/dashboard/overdue")).json()) == 0


async def test_I19_create_interaction_on_other_users_contact(db, client_b):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.commit()
    resp = await client_b.post(
        f"/contacts/{contact.id}/interactions/",
        json={"date": str(date.today()), "medium": "call"},
    )
    assert resp.status_code == 404


async def test_I20_list_interactions(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    interaction = Interaction(contact_id=contact.id, date=date.today(), medium="call")
    db.add(interaction)
    await db.commit()
    data = (await client_a.get(f"/contacts/{contact.id}/interactions/")).json()
    assert len(data) == 1
    assert data[0]["id"] == str(interaction.id)


async def test_I21_update_interaction(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    interaction = Interaction(contact_id=contact.id, date=date.today(), medium="call", notes="old")
    db.add(interaction)
    await db.commit()
    resp = await client_a.put(
        f"/contacts/{contact.id}/interactions/{interaction.id}",
        json={"date": str(date.today()), "medium": "call", "notes": "updated"},
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "updated"


async def test_I22_update_other_users_interaction(db, client_b):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    interaction = Interaction(contact_id=contact.id, date=date.today(), medium="call")
    db.add(interaction)
    await db.commit()
    resp = await client_b.put(
        f"/contacts/{contact.id}/interactions/{interaction.id}",
        json={"date": str(date.today()), "medium": "call"},
    )
    assert resp.status_code == 404


async def test_I23_delete_interaction(db, client_a):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    interaction = Interaction(contact_id=contact.id, date=date.today(), medium="call")
    db.add(interaction)
    await db.commit()
    resp = await client_a.delete(f"/contacts/{contact.id}/interactions/{interaction.id}")
    assert resp.status_code == 204


async def test_I24_delete_other_users_interaction(db, client_b):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.flush()
    interaction = Interaction(contact_id=contact.id, date=date.today(), medium="call")
    db.add(interaction)
    await db.commit()
    resp = await client_b.delete(f"/contacts/{contact.id}/interactions/{interaction.id}")
    assert resp.status_code == 404
