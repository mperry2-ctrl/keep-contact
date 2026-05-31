import uuid
from app.models import Contact
from tests.conftest import USER_A_ID


async def test_I1_create_contact(client_a):
    resp = await client_a.post("/contacts/", json={"name": "Alice"})
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["name"] == "Alice"


async def test_I2_get_own_contact(client_a):
    create = await client_a.post("/contacts/", json={"name": "Alice"})
    contact_id = create.json()["id"]
    resp = await client_a.get(f"/contacts/{contact_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Alice"


async def test_I3_get_other_users_contact_returns_404(db, client_b):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.commit()
    resp = await client_b.get(f"/contacts/{contact.id}")
    assert resp.status_code == 404


async def test_I4_update_own_contact(client_a):
    create = await client_a.post("/contacts/", json={"name": "Alice"})
    contact_id = create.json()["id"]
    resp = await client_a.put(f"/contacts/{contact_id}", json={"name": "Bob"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Bob"


async def test_I5_delete_own_contact(client_a):
    create = await client_a.post("/contacts/", json={"name": "Alice"})
    contact_id = create.json()["id"]
    resp = await client_a.delete(f"/contacts/{contact_id}")
    assert resp.status_code == 204


async def test_I6_delete_other_users_contact_returns_404(db, client_b):
    contact = Contact(user_id=uuid.UUID(USER_A_ID), name="Alice")
    db.add(contact)
    await db.commit()
    resp = await client_b.delete(f"/contacts/{contact.id}")
    assert resp.status_code == 404


async def test_I7_no_auth_returns_401(unauthed_client):
    resp = await unauthed_client.get("/contacts/")
    assert resp.status_code == 401
