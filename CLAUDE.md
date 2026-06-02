# Keep Contact — Project Guide

## What this is
A personal CRM for staying in touch with people and tracking life context (upcoming trips, milestones, birthdays). Proactively reminds you to reach out and surfaces context before interactions.

## Live URLs
- **Frontend**: https://keep-contact-bjec.vercel.app
- **Backend**: https://keep-contact-production.up.railway.app
- **Supabase project**: https://dbakcokrxhnmsklapkwp.supabase.co

## Stack
- **Backend**: FastAPI (Python), SQLAlchemy async, Alembic, PostgreSQL on Supabase
- **Frontend**: React + TypeScript, Vite, react-router-dom, @supabase/supabase-js
- **Auth**: Supabase Auth (ES256 JWT)
- **SMS**: Twilio (`twilio` package)
- **Scheduler**: APScheduler (hourly tick, fires digest at each user's configured local hour)
- **Deploy**: Railway (backend), Vercel (frontend)

## Local development
```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

## Deploying changes
```bash
git add <files>
git commit -m "message"
git push   # Vercel auto-deploys frontend; Railway auto-deploys backend + runs alembic upgrade head
```

## Environment variables
- Backend `.env` has all secrets — do NOT commit it
- Railway has the production copy of all backend env vars
- Vercel has: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL

## Testing requirement
After any backend feature, bug fix, or refactor — run the test suite before considering the task done:
```bash
cd backend && source .venv/bin/activate && pytest tests/ -v
```
If tests fail, fix them before moving on. If new behavior isn't covered by existing tests, add tests for it. Skip this only for changes that are purely cosmetic (comments, docs, formatting) or frontend-only.

## Running tests
```bash
# Prereq: local Postgres must be running
brew services start postgresql@16

cd backend
source .venv/bin/activate
pytest tests/ -v           # full suite (70 passed, 4 skipped)
pytest tests/test_utils.py tests/test_schemas.py -v  # unit tests only (no DB needed)
```

Test DB is `keepcontact_test` on localhost:5432. Create it once with `createdb keepcontact_test`.
Schema is created/dropped automatically by the test suite — no manual migrations needed.

### Twilio smoke test
Sends a real SMS to verify end-to-end delivery. Reads credentials directly from `.env` (bypasses pytest-env overrides):
```bash
cd backend
RUN_TWILIO_INTEGRATION=1 SMOKE_SMS_TO=+1XXXXXXXXXX pytest tests/smoke/ -v
```

See `.claude/test-design.md` for the full scenario list and design decisions.

## Database migrations
```bash
cd backend
source .venv/bin/activate
alembic upgrade head       # apply migrations
alembic revision -m "name" # create new migration
```
Current migrations: 0001 (schema) → 0002 (location) → 0003 (phone/postal) → 0004 (user_settings) → 0005 (user_profiles) → 0006 (reminder_days_after) → 0007 (group_logging) → 0008 (sms_opt_out + reminder_hour + timezone)

## What's been built (complete)
1. Auth (Supabase)
2. Contacts CRUD (name, phone E.164, location, tags, check-in frequency, sms_opt_out)
3. Interaction log (date, medium, notes; editable; group interactions)
4. Life events (trips, milestones, meetings per contact; group events)
5. Dashboard (overdue check-ins + upcoming events in 30 days; quick-log modal)
6. Search (filter by name, company, tags, notes)
7. SMS reminders (APScheduler hourly, per-user timezone + delivery hour, per-contact opt-out, 7-day upcoming window)
8. Contact import (vCard .vcf and CSV — LinkedIn/Google Contacts format)
9. User profile (shareable public profile card at `/p/:slug`)
10. Deploy (Railway + Vercel; Procfile runs migrations on deploy)
11. Backend test suite (70 tests: unit + integration + Twilio smoke test)

## SMS reminders — current status
- **Code**: fully wired. Hourly scheduler checks each user's `reminder_hour` in their `timezone`, sends digest of overdue check-ins + events in next 7 days.
- **Blocker**: A2P 10DLC registration pending with Twilio. Delivery will work once approved.
- **Smoke test**: passes (Twilio accepts the request). Delivery blocked at carrier level until A2P clears.
- **Email**: deprioritized — Resend sandbox only allows sending to the signup email. Needs a verified domain; tackle when needed.

## Next steps (in priority order)

### 1. Contact categories
Assign contacts to categories (Friends, Family, Work, etc.) with default check-in frequency per category. Per-contact frequency overrides the category default.
- New table: `contact_categories` (user_id, name, default_check_in_days, color)
- Foreign key on `contacts.category_id`
- Settings page: manage categories and their defaults
- Contact form: category picker

### 2. Map visualizer
Show a world map with pins for where contacts are located.
- Contacts already have city/state/country_code/postal_code fields
- Option A: geocoding API (Google Maps, Mapbox) → lat/lng stored on contact
- Option B: country_code only, choropleth map (simpler, no API key)
- Recommended library: `react-simple-maps`
- New page: `/map`

### 3. Analytics dashboard (admin)
Usage metrics: signups, contacts created, interactions logged, active users.
- Recommended: add PostHog — one script tag, gives sessions/clicks/funnels automatically
- Install: `npm install posthog-js` in frontend

### 4. GitHub Actions CI
Wire `pytest tests/ -v` to run on every push/PR.
- Add `.github/workflows/test.yml`
- Needs: postgres service container, same env vars as `pyproject.toml`

## Key files
```
backend/app/
  main.py              — FastAPI app, APScheduler wiring (hourly)
  models.py            — SQLAlchemy models
  schemas.py           — Pydantic schemas
  routers/
    contacts.py        — CRUD + search
    dashboard.py       — overdue + upcoming logic
    settings.py        — reminder preferences (hour, timezone, sms_phone)
    import_contacts.py — vCard + CSV import
    profile.py         — user profile CRUD
    log.py             — group interaction/event logging
  jobs/
    reminder_check.py  — hourly digest job (timezone-aware, opt-out filtered)

frontend/src/
  App.tsx              — routes + nav
  pages/
    Dashboard.tsx      — home page + quick-log modal
    Contacts.tsx       — list + search
    ContactDetail.tsx  — profile, interactions, life events
    ContactForm.tsx    — create/edit contact (incl. sms_opt_out)
    ContactImport.tsx  — vCard/CSV import flow
    Settings.tsx       — SMS toggle, phone, delivery hour, timezone
    Profile.tsx        — user's own shareable profile
  api/                 — typed fetch wrappers per domain
```
