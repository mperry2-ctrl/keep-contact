# Keep Contact — Test Framework Design

_Living doc. Updated after each decision in the grill-me interview. If the conversation dies, read this file and continue where the last open question left off._

---

## Decisions locked in

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | **Backend only** — no frontend tests in this pass |
| 2 | Reminder tests | **Excluded** — email/SMS delivery will be redesigned later; test then |
| 3 | Unit test targets | `next_annual_occurrence` (U1–U6), Pydantic schema validation — formatting functions dropped (SMS/email path excluded) |
| 3a | Refactor | `next_annual_occurrence` extracted to `backend/app/utils.py`; both `dashboard.py` and `reminder_check.py` import from there |
| 4 | Integration test DB | **Local Docker Postgres** — `docker run postgres:16`, same dialect as prod, fully offline |
| 5 | Auth in tests | **Dependency override** — `app.dependency_overrides[get_current_user]` returns fake user dict; separate test asserts 401 with no token |
| 6 | Test tooling | `pytest`, `pytest-asyncio`, `pytest-env` in `backend/requirements-dev.txt`; `asyncio_mode = "auto"` in `pyproject.toml` |
| 7 | CI | **Local only** — run `pytest` manually before pushing; add GitHub Actions later once tests are stable |

---

## Open branches (resolve in order)

### Branch 4 — Integration test database strategy
How do integration tests get a database? Options:
- A) Dedicated Supabase test project (real Postgres, real hosted DB)
- B) Local Postgres via Docker (`docker run postgres`)
- C) SQLite in-memory (fast but dialect differences with asyncpg)

### Branch 4 — Integration test database strategy
How do integration tests get a database? Options:
- A) Dedicated Supabase test project (real Postgres, real hosted DB)
- B) Local Postgres via Docker (`docker run postgres`)
- C) SQLite in-memory (fast but dialect differences with asyncpg)

### Branch 5 — Auth handling in integration tests
How do integration tests pass authentication? Options:
- A) Override `get_current_user` dependency with a fixture that returns a fake user dict
- B) Generate a real HS256 JWT signed with the `SUPABASE_JWT_SECRET` from `.env`
- C) Use a real Supabase test user token (requires network call on every test run)

### Branch 6 — Test runner and tooling
What packages to add and how to run tests.

### Branch 7 — CI vs manual
Run tests locally only, or wire into GitHub Actions on push?

---

## "Initial Condition → Action → Expected Output" scenarios

### Unit: `next_annual_occurrence` (utils.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| U1 | `event_date=2000-06-15`, `today=2026-05-01` | `next_annual_occurrence(event_date, today)` | `2026-06-15` |
| U2 | `event_date=2000-06-15`, `today=2026-06-15` | call | `2026-06-15` (today is inclusive) |
| U3 | `event_date=2000-06-15`, `today=2026-06-16` | call | `2027-06-15` (this year passed, rolls over) |
| U4 | `event_date=2000-02-29`, `today=2026-02-01` | call | `2026-02-28` (non-leap year → Feb 28) |
| U5 | `event_date=2000-02-29`, `today=2028-01-01` | call | `2028-02-29` (leap year → real Feb 29) |
| U6 | `event_date=2000-02-29`, `today=2026-03-01` | call | `2027-02-28` (this year's Feb 28 passed, next year non-leap) |

### Integration: Contacts CRUD (routers/contacts.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| I1 | Empty DB, auth as user A | `POST /contacts/` `{name:"Alice"}` | 201, body contains `id` and `name="Alice"` |
| I2 | Contact exists for user A | `GET /contacts/{id}` as user A | 200, correct contact returned |
| I3 | Contact exists for user A | `GET /contacts/{id}` as user B | 404 (don't leak existence) |
| I4 | Contact exists for user A | `PUT /contacts/{id}` `{name:"Bob"}` as user A | 200, `name="Bob"` |
| I5 | Contact exists for user A | `DELETE /contacts/{id}` as user A | 204 |
| I6 | Contact exists for user A | `DELETE /contacts/{id}` as user B | 404 |
| I7 | Any state | `GET /contacts/` with no auth header | 401 (FastAPI 0.115+ changed HTTPBearer from 403→401) |

### Integration: Dashboard (routers/dashboard.py)
Uses `UPCOMING_DAYS` imported from `routers/dashboard.py` — tests stay correct if the constant changes.

| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| I8 | Contact with `check_in_frequency_days=30`, no interactions | `GET /dashboard/overdue` | contact appears with `days_overdue=30` |
| I9 | Contact with `check_in_frequency_days=30`, last interaction today | `GET /dashboard/overdue` | contact does NOT appear |
| I10 | Contact with `check_in_frequency_days=30`, last interaction 31 days ago | `GET /dashboard/overdue` | contact appears with `days_overdue=1` |
| I11 | Contact with no `check_in_frequency_days` | `GET /dashboard/overdue` | contact does NOT appear |
| I12 | Contact birthday = `today + (UPCOMING_DAYS - 1)` | `GET /dashboard/upcoming` | birthday appears |
| I13 | Contact birthday = `today + (UPCOMING_DAYS + 1)` | `GET /dashboard/upcoming` | birthday does NOT appear |
| I14 | Contact with non-recurring life event dated yesterday | `GET /dashboard/upcoming` | event does NOT appear |
| I15 | Contacts exist for user A | `GET /dashboard/overdue` as user B | empty list |
| I16 | Contact has recurring life event from last year; `next_annual_occurrence` falls within `UPCOMING_DAYS` | `GET /dashboard/upcoming` | event appears with rolled-over date |

### Integration: Interactions (routers/interactions.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| I17 | Contact exists for user A | `POST /contacts/{id}/interactions` `{date:today, medium:"call"}` | 201, correct `contact_id` in response |
| I18 | Contact overdue, interaction logged today | `GET /dashboard/overdue` | contact no longer appears |
| I19 | Contact exists for user A | `POST /contacts/{id}/interactions` as user B | 404 |
| I20 | Interaction exists for user A | `GET /contacts/{id}/interactions` as user A | 200, list contains the interaction |
| I21 | Interaction exists | `PUT /contacts/{id}/interactions/{iid}` `{notes:"updated"}` as user A | 200, `notes="updated"` |
| I22 | Interaction exists | `PUT /contacts/{id}/interactions/{iid}` as user B | 404 |
| I23 | Interaction exists | `DELETE /contacts/{id}/interactions/{iid}` as user A | 204 |
| I24 | Interaction exists | `DELETE /contacts/{id}/interactions/{iid}` as user B | 404 |

### Integration: Search (routers/contacts.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| I25 | Contact `name="Alice Wonderland"` | `GET /contacts/search?q=wonder` | contact returned |
| I26 | Contact `company="Acme Corp"` | `GET /contacts/search?q=acme` | contact returned |
| I27 | Contact `tags=["friend","college"]` | `GET /contacts/search?q=college` | contact returned |
| I28 | Contact exists for user A | `GET /contacts/search?q=alice` as user B | empty list |
| I29 | No matching contacts | `GET /contacts/search?q=zzznomatch` | empty list, 200 |

### Integration: Life Events (routers/life_events.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| I30 | Contact exists for user A | `POST /contacts/{id}/life_events` `{title:"Trip to Japan", event_type:"trip", event_date:"2026-09-01"}` | 201, correct `contact_id` |
| I31 | Life event exists | `PUT /contacts/{id}/life_events/{eid}` `{title:"Updated"}` as user A | 200, `title="Updated"` |
| I32 | Life event exists | `PUT /contacts/{id}/life_events/{eid}` as user B | 404 |
| I33 | Life event exists | `DELETE /contacts/{id}/life_events/{eid}` as user A | 204 |
| I34 | Life event exists | `DELETE /contacts/{id}/life_events/{eid}` as user B | 404 |

### Integration: User Profile (routers/profile.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| I35 | No profile exists for user A | `PUT /profile/` `{name:"Michael", bio:"Hello"}` | 200, profile created and returned |
| I36 | Profile exists for user A | `PUT /profile/` `{name:"Michael Updated"}` | 200, name updated, other fields unchanged |
| I37 | Profile exists for user A | `GET /profile/` as user A | 200, correct profile returned |
| I38 | Profile exists for user A | `GET /profile/` as user B | 200, returns user B's own empty profile — not user A's |

### Integration: Settings (routers/settings.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| I39 | No settings row for user A | `GET /settings/` | 200, defaults: `email_reminders_enabled=false`, `sms_reminders_enabled=false` |
| I40 | Settings exist for user A | `PUT /settings/` `{sms_phone:"+12125551234"}` | 200, phone saved, other fields unchanged |
| I41 | Settings exist for user A | `GET /settings/` as user B | 200, user B's own defaults — not user A's |

### Unit: Pydantic schema validation (schemas.py)
| ID | Initial Condition | Action | Expected Output |
|----|-------------------|--------|-----------------|
| U12 | `ContactCreate(name="Alice")` | instantiate | succeeds, all optional fields `None` |
| U13 | `ContactCreate()` — no name | instantiate | `ValidationError` |
| U14 | `ContactCreate(name="Alice", email="not-an-email")` | instantiate | `ValidationError` |
| U15 | `LifeEventCreate(title="Trip", event_type="vacation")` | instantiate | `ValidationError` (not in Literal) |
| U16 | `InteractionCreate(date=today, medium="carrier-pigeon")` | instantiate | `ValidationError` (not in Literal) |
| U17 | `ImportConfirmItem(contact=..., action="merge", merge_into=None)` | instantiate | succeeds — documents the missing cross-field validation gap |

---

## Final implementation plan

### Step 1 — Install test dependencies
Create `backend/requirements-dev.txt`:
```
pytest
pytest-asyncio
pytest-env
```
`httpx` is already in `requirements.txt`. Install with:
```bash
cd backend && source .venv/bin/activate && pip install -r requirements-dev.txt
```

### Step 2 — Configure pytest
Create `backend/pyproject.toml`:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
env = [
    "DATABASE_URL=postgresql+asyncpg://postgres:test@localhost:5432/keepcontact_test",
    "SUPABASE_URL=http://localhost",
    "SUPABASE_JWT_SECRET=test-secret",
    "SUPABASE_SERVICE_ROLE_KEY=test-key",
    "RESEND_API_KEY=test",
    "FROM_EMAIL=test@test.com",
    "TWILIO_ACCOUNT_SID=test",
    "TWILIO_AUTH_TOKEN=test",
    "TWILIO_FROM_NUMBER=+10000000000",
    "FRONTEND_URL=http://localhost:5173",
]
```

### Step 3 — Docker test database
Start before running tests:
```bash
docker run --name keepcontact-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=keepcontact_test -p 5432:5432 -d postgres:16
```
Stop/remove after:
```bash
docker rm -f keepcontact-test
```

### Step 4 — Test fixtures (`backend/tests/conftest.py`)
- `engine` fixture: creates async engine pointed at test DB, runs `Base.metadata.create_all`, drops all after session
- `db` fixture: yields an `AsyncSession`, rolls back after each test (no data bleeds between tests)
- `client` fixture: `AsyncClient` with `app.dependency_overrides[get_current_user]` returning user A dict
- `client_b` fixture: same but returns user B dict (different UUID)
- `authed_user_a` / `authed_user_b`: the fake user dicts used by those clients

### Step 5 — Test files
```
backend/tests/
  conftest.py
  test_utils.py          — U1–U6  (next_annual_occurrence)
  test_schemas.py        — U12–U17 (Pydantic validation)
  test_contacts.py       — I1–I7
  test_dashboard.py      — I8–I16
  test_interactions.py   — I17–I24
  test_search.py         — I25–I29
  test_life_events.py    — I30–I34
  test_profile.py        — I35–I38
  test_settings.py       — I39–I41
```

### Step 6 — Run tests
```bash
cd backend && source .venv/bin/activate && pytest tests/ -v
```
