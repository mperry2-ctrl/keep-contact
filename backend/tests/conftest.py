import asyncio
import pytest
from contextlib import asynccontextmanager
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

# Import app first so we can patch the lifespan before any clients are created
from app.main import app
from app.database import Base, get_db
from app.auth import get_current_user

# Replace APScheduler lifespan with a no-op so the scheduler never starts in tests
@asynccontextmanager
async def _noop_lifespan(app):
    yield

app.router.lifespan_context = _noop_lifespan

USER_A_ID = "00000000-0000-0000-0000-000000000001"
USER_B_ID = "00000000-0000-0000-0000-000000000002"
USER_A = {"id": USER_A_ID, "email": "user_a@test.com"}
USER_B = {"id": USER_B_ID, "email": "user_b@test.com"}


@pytest.fixture(scope="session")
def test_engine():
    from app.config import settings
    engine = create_async_engine(settings.database_url, poolclass=NullPool, echo=False)

    async def _setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_setup())
    yield engine

    async def _teardown():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()

    asyncio.run(_teardown())


async def _truncate_all(engine):
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


# Not autouse — only integration fixtures call this.
# Embedded in each client/db fixture so unit tests never trigger test_engine setup.
@pytest.fixture
async def clean_tables(test_engine):
    yield
    await _truncate_all(test_engine)


@pytest.fixture
async def db(test_engine):
    factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await _truncate_all(test_engine)


def _make_client(user_dict, test_engine):
    factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def _get_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = lambda: user_dict
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.fixture
async def client_a(test_engine):
    async with _make_client(USER_A, test_engine) as ac:
        yield ac
    app.dependency_overrides.clear()
    await _truncate_all(test_engine)


@pytest.fixture
async def client_b(test_engine):
    async with _make_client(USER_B, test_engine) as ac:
        yield ac
    app.dependency_overrides.clear()
    await _truncate_all(test_engine)


@pytest.fixture
async def unauthed_client(test_engine):
    factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def _get_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    # get_current_user is NOT overridden — tests real auth rejection

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await _truncate_all(test_engine)
