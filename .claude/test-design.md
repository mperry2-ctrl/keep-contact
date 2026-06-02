# Keep Contact — Test Framework Design

_Living doc. Updated as the test suite evolves. All setup steps are complete._

---

## Decisions locked in

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | **Backend only** — no frontend tests |
| 2 | Test DB | **Local Postgres via brew** (`brew services start postgresql@16`, DB: `keepcontact_test`) |
| 3 | Auth in tests | **Dependency override** — `app.dependency_overrides[get_current_user]` returns fake user dict; separate test asserts 401 with no token |
| 4 | Test tooling | `pytest`, `pytest-asyncio`, `pytest-env`; `asyncio_mode = "auto"` in `pyproject.toml` |
| 5 | CI | **Local only** — run manually before pushing; GitHub Actions wired up later |
| 6 | Twilio in tests | **Mock in main suite** (pytest-env injects `TWILIO_ACCOUNT_SID=test`); **real smoke test** in `tests/smoke/` reads from `.env` directly to bypass overrides, gated behind `RUN_TWILIO_INTEGRATION=1` |
| 7 | Schema | Test suite uses `Base.metadata.create_all` — no Alembic migrations needed in tests |

---

## Running the suite

```bash
brew services start postgresql@16
cd backend && source .venv/bin/activate
pytest tests/ -v                  # 70 passed, 4 skipped (profile routes pending)
pytest tests/test_utils.py tests/test_schemas.py -v   # unit tests only, no DB
RUN_TWILIO_INTEGRATION=1 SMOKE_SMS_TO=+1XXXXXXXXXX pytest tests/smoke/ -v
```

---

## Test scenarios

### Unit: `next_annual_occurrence` (utils.py) — U1–U6
| ID | Condition | Expected |
|----|-----------|----------|
| U1 | `event_date=2000-06-15`, `today=2026-05-01` | `2026-06-15` |
| U2 | `event_date=2000-06-15`, `today=2026-06-15` | `2026-06-15` (today inclusive) |
| U3 | `event_date=2000-06-15`, `today=2026-06-16` | `2027-06-15` (rolls over) |
| U4 | `event_date=2000-02-29`, `today=2026-02-01` | `2026-02-28` (non-leap → Feb 28) |
| U5 | `event_date=2000-02-29`, `today=2028-01-01` | `2028-02-29` (leap year) |
| U6 | `event_date=2000-02-29`, `today=2026-03-01` | `2027-02-28` (this year's Feb 28 passed) |

### Unit: Reminder logic (jobs/reminder_check.py) — U7–U17
| ID | Condition | Expected |
|----|-----------|----------|
| U7 | `reminder_hour=9`, `timezone=America/New_York`, UTC now = 13:30 | `_user_hour_matches` → True (13:30 UTC = 9:30 ET) |
| U8 | `reminder_hour=8`, `timezone=America/New_York`, UTC now = 13:30 | `_user_hour_matches` → False |
| U9 | 13:30 UTC, Eastern set to 9, Pacific set to 9 | Eastern matches, Pacific does not |
| U10 | `timezone="Not/ATimezone"` | Falls back to America/New_York; still matches at correct UTC time |
| U11 | `reminder_hour=0`, `timezone=America/New_York`, UTC now = 04:00 | True (midnight ET) |
| U12 | `overdue=[Alice]`, `upcoming=[]` | SMS contains "Alice", no "Coming up" |
| U13 | `overdue=[]`, `upcoming=[Bob Birthday]` | SMS contains "Bob", "Birthday", no "overdue" |
| U14 | Both overdue and upcoming present | SMS contains both, separated by `\|` |
| U15 | 5 overdue contacts | SMS shows first 3 + "+2 more" |
| U16 | 4 upcoming events | SMS shows first 2 + "+2 more" |
| U17 | Any valid inputs | SMS starts with "Keep Contact:" |

### Unit: Pydantic schema validation (schemas.py) — U12–U16
_(Note: U12–U16 numbering reused from schemas; they are in `test_schemas.py`)_
| ID | Condition | Expected |
|----|-----------|----------|
| U12 | `ContactCreate(name="Alice")` | Succeeds, all optional fields None |
| U13 | `ContactCreate()` — no name | `ValidationError` |
| U14 | `ContactCreate(name="Alice", email="not-an-email")` | `ValidationError` |
| U15 | `LifeEventCreate(title="Trip", event_type="vacation")` | `ValidationError` (not in Literal) |
| U16 | `InteractionCreate(date=today, medium="carrier-pigeon")` | `ValidationError` (not in Literal) |

### Integration: Contacts CRUD — I1–I7
| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I1 | Empty DB, auth as user A | `POST /contacts/` `{name:"Alice"}` | 201, id + name returned |
| I2 | Contact exists for user A | `GET /contacts/{id}` as user A | 200 |
| I3 | Contact exists for user A | `GET /contacts/{id}` as user B | 404 |
| I4 | Contact exists for user A | `PUT /contacts/{id}` `{name:"Bob"}` | 200, name updated |
| I5 | Contact exists for user A | `DELETE /contacts/{id}` as user A | 204 |
| I6 | Contact exists for user A | `DELETE /contacts/{id}` as user B | 404 |
| I7 | Any state | `GET /contacts/` with no auth | 401 |

### Integration: Dashboard — I8–I16
| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I8 | Contact `check_in_frequency_days=30`, no interactions | `GET /dashboard/overdue` | appears with `days_overdue=30` |
| I9 | Same contact, last interaction today | `GET /dashboard/overdue` | does not appear |
| I10 | Last interaction 31 days ago | `GET /dashboard/overdue` | appears with `days_overdue=1` |
| I11 | No `check_in_frequency_days` set | `GET /dashboard/overdue` | does not appear |
| I12 | Birthday = today + (UPCOMING_DAYS - 1) | `GET /dashboard/upcoming` | appears |
| I13 | Birthday = today + (UPCOMING_DAYS + 1) | `GET /dashboard/upcoming` | does not appear |
| I14 | Non-recurring life event dated yesterday | `GET /dashboard/upcoming` | does not appear |
| I15 | Contacts exist for user A | `GET /dashboard/overdue` as user B | empty list |
| I16 | Recurring life event; next annual occurrence within window | `GET /dashboard/upcoming` | appears with rolled-over date |

### Integration: Interactions — I17–I24
| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I17 | Contact exists | `POST /contacts/{id}/interactions` | 201 |
| I18 | Contact overdue, interaction logged today | `GET /dashboard/overdue` | contact gone |
| I19 | Contact exists for user A | `POST /contacts/{id}/interactions` as user B | 404 |
| I20 | Interaction exists | `GET /contacts/{id}/interactions` | 200, list returned |
| I21 | Interaction exists | `PUT` with updated notes | 200, notes updated |
| I22 | Interaction exists | `PUT` as user B | 404 |
| I23 | Interaction exists | `DELETE` as user A | 204 |
| I24 | Interaction exists | `DELETE` as user B | 404 |

### Integration: Search — I25–I29
| ID | Condition | Expected |
|----|-----------|----------|
| I25 | Contact `name="Alice Wonderland"` | `?q=wonder` returns contact |
| I26 | Contact `company="Acme Corp"` | `?q=acme` returns contact |
| I27 | Contact `tags=["friend","college"]` | `?q=college` returns contact |
| I28 | Contact exists for user A | `?q=alice` as user B → empty |
| I29 | No match | empty list, 200 |

### Integration: Life Events — I30–I34
| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I30 | Contact exists | `POST /contacts/{id}/life_events` | 201 |
| I31 | Life event exists | `PUT` updated title | 200 |
| I32 | Life event exists | `PUT` as user B | 404 |
| I33 | Life event exists | `DELETE` as user A | 204 |
| I34 | Life event exists | `DELETE` as user B | 404 |

### Integration: User Profile — I35–I38 (skipped — route pending)
| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I35 | No profile | `PUT /profile/` `{name:"Michael"}` | 200, created |
| I36 | Profile exists | `PUT` updated name | 200, updated |
| I37 | Profile exists | `GET /profile/` as user A | 200, correct profile |
| I38 | Profile exists for user A | `GET /profile/` as user B | 200, user B's own empty profile |

### Integration: Settings — I39–I41, I45–I48
| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I39 | No settings row | `GET /settings/` | defaults: both reminders false |
| I40 | Settings exist | `PUT` `{sms_phone:"+12125551234"}` | phone saved |
| I41 | Settings for user A | `GET /settings/` as user B | user B's own defaults |
| I45 | No settings row | `GET /settings/` | `reminder_hour=8` |
| I46 | No settings row | `GET /settings/` | `timezone="America/New_York"` |
| I47 | Settings exist | `PUT` `{reminder_hour:9}` | 200, hour updated |
| I48 | Settings exist | `PUT` `{timezone:"America/Los_Angeles"}` | 200, timezone updated |

### Integration: SMS opt-out and digest filtering — I42–I52
| ID | Condition | Action | Expected |
|----|-----------|--------|----------|
| I42 | New contact | `POST /contacts/` | `sms_opt_out=false` by default |
| I43 | Contact exists | `PUT` `{sms_opt_out:true}` | 200, opt-out set |
| I44 | Contact with `sms_opt_out=true` | `GET /contacts/{id}` | `sms_opt_out=true` returned |
| I49 | Opted-out contact is overdue | `_build_digest` | contact excluded from overdue list |
| I50 | Opted-out contact has birthday in window | `_build_digest` | contact excluded from upcoming list |
| I51 | Contact birthday = today + 7 | `_build_digest` | appears (7-day window inclusive) |
| I52 | Contact birthday = today + 9 | `_build_digest` | does not appear |
| I52 | Contact with interaction 12 days ago, frequency 30 days | `_build_digest` | not overdue |

### Smoke: Twilio end-to-end
| ID | Condition | Expected |
|----|-----------|----------|
| S1 | `RUN_TWILIO_INTEGRATION=1`, real creds in `.env` | SMS sent, SID starts with "SM"; delivery confirmed in Twilio Console |
