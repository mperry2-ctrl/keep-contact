import uuid
from app.models import Contact
from tests.conftest import USER_A_ID, USER_B_ID


async def test_I25_search_by_name(db, client_a):
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Alice Wonderland"))
    await db.commit()
    resp = await client_a.get("/contacts/search?q=wonder")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_I26_search_by_company(db, client_a):
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Bob", company="Acme Corp"))
    await db.commit()
    resp = await client_a.get("/contacts/search?q=acme")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_I27_search_by_tag(db, client_a):
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Carol", tags=["friend", "college"]))
    await db.commit()
    resp = await client_a.get("/contacts/search?q=college")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_I28_search_cross_user_returns_empty(db, client_b):
    db.add(Contact(user_id=uuid.UUID(USER_A_ID), name="Alice"))
    await db.commit()
    resp = await client_b.get("/contacts/search?q=alice")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_I29_search_no_match(client_a):
    resp = await client_a.get("/contacts/search?q=zzznomatch")
    assert resp.status_code == 200
    assert resp.json() == []
