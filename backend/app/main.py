from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .config import settings
from .auth import get_current_user
from .routers import contacts, interactions, life_events, dashboard, settings as settings_router, import_contacts
from .jobs.reminder_check import run_reminder_check

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(run_reminder_check, "cron", hour=8, minute=0, id="daily_reminders")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Keep Contact API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(contacts.router)
app.include_router(interactions.router)
app.include_router(life_events.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)
app.include_router(import_contacts.router)




@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"]}
