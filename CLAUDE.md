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
- **Email**: Resend (`resend` package)
- **SMS**: Twilio (`twilio` package)
- **Scheduler**: APScheduler (runs daily at 8am)
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
git push   # Vercel auto-deploys frontend; Railway auto-deploys backend
```

## Environment variables
- Backend `.env` has all secrets — do NOT commit it
- Railway has the production copy of all backend env vars
- Vercel has: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL

## Database migrations
```bash
cd backend
source .venv/bin/activate
alembic upgrade head       # apply migrations
alembic revision -m "name" # create new migration
```
Current migrations: 0001 (schema) → 0002 (location) → 0003 (phone/postal) → 0004 (user_settings)

## What's been built (complete)
1. Auth (Supabase)
2. Contacts CRUD (name, phone E.164, location, tags, check-in frequency)
3. Interaction log (date, medium, notes; editable)
4. Life events (trips, milestones, meetings per contact)
5. Dashboard (overdue check-ins + upcoming events in 30 days)
6. Search (filter by name, company, tags, notes)
7. Reminders infrastructure (APScheduler + Resend + Twilio; Settings page with toggles)
8. Deploy (Railway + Vercel)

## Reminders — known issues to resolve
- **Email**: Resend sandbox only allows sending to the signup email (keepcontactnotifications@gmail.com). Needs a verified domain to send to any address.
- **SMS**: Twilio trial requires toll-free number configuration. User has Twilio account (ACfe647...) and number (+18665133920) but toll-free config is incomplete.
- Both toggles should stay OFF until these are resolved.

## Next steps (in priority order)

### 1. Fix reminders (text + email)
- Email: verify a domain at resend.com/domains, update FROM_EMAIL env var
- SMS: complete Twilio toll-free number registration at twilio.com/console

### 2. Contact import (Step 11)
Import from vCard (.vcf) and CSV (LinkedIn/Google Contacts).
- Backend: `POST /contacts/import` endpoint — parse vCard with `vobject` library, parse CSV manually
- Frontend: file upload page with field mapping preview and confirm before save
- Install: `pip install vobject` in backend

### 3. Map visualizer
Show a world/country map with pins for where contacts are located.
- Contacts have city/state/country_code/postal_code fields
- Option A: Use a geocoding API (Google Maps, Mapbox) to convert location → lat/lng, store on contact
- Option B: Use country_code only and render a choropleth map (simpler, no API needed)
- Recommended library: `react-simple-maps` (lightweight, no API key needed for country-level)
- New page: `/map`

### 4. Shareable profile card
User creates their own profile (name, email, phone, job, social links) and gets a public shareable URL they can send to contacts instead of manually entering info.
- New table: `user_profiles` (user_id, name, email, phone, job_title, company, bio, linkedin, twitter, public_slug)
- Public endpoint (no auth): `GET /p/{slug}` returns profile JSON
- Public page: `/p/:slug` — renders profile card
- Private page: `/profile` — edit your own profile
- "Share" button copies the public URL

### 5. Analytics dashboard (admin)
Usage metrics: user signups, contacts created, interactions logged, active users.
- This implies multi-user awareness — the app currently has no admin concept
- Options: (a) add a simple admin flag to user_settings, (b) use Supabase's built-in auth analytics, (c) instrument with PostHog (free, easy to add)
- Recommended: add PostHog — one script tag on frontend, gives sessions, clicks, page views, funnels automatically
- Install: `npm install posthog-js` in frontend

## Key files
```
backend/app/
  main.py          — FastAPI app, APScheduler wiring
  models.py        — SQLAlchemy models
  schemas.py       — Pydantic schemas
  routers/
    contacts.py    — CRUD + search
    dashboard.py   — overdue + upcoming logic
    settings.py    — reminder preferences
  jobs/
    reminder_check.py — daily digest job

frontend/src/
  App.tsx          — routes + nav
  pages/
    Dashboard.tsx  — home page
    Contacts.tsx   — list + search
    ContactDetail.tsx — profile, interactions, life events
    ContactForm.tsx   — create/edit contact
    Settings.tsx   — reminder toggles + phone
  api/             — typed fetch wrappers per domain
```
