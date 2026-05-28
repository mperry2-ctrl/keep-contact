import uuid
from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr

InteractionMedium = Literal["in-person", "call", "text", "email", "social", "other"]


class ContactCreate(BaseModel):
    name: str
    nickname: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None  # stored in E.164 format e.g. +12125551234
    birthday: Optional[date] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country_code: Optional[str] = None   # ISO 3166-1 alpha-2 e.g. "US"
    postal_code: Optional[str] = None
    tags: Optional[list[str]] = None
    general_notes: Optional[str] = None
    check_in_frequency_days: Optional[int] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    birthday: Optional[date] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    tags: Optional[list[str]] = None
    general_notes: Optional[str] = None
    check_in_frequency_days: Optional[int] = None


class ContactResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[date] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    tags: Optional[list[str]] = None
    general_notes: Optional[str] = None
    photo_url: Optional[str] = None
    check_in_frequency_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


EventType = Literal["birthday", "trip", "milestone", "meeting", "other"]


class LifeEventCreate(BaseModel):
    title: str
    event_type: EventType
    event_date: Optional[date] = None
    is_recurring: bool = False
    notes: Optional[str] = None
    reminder_days_before: Optional[int] = None
    reminder_days_after: Optional[int] = None


class LifeEventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[EventType] = None
    event_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    notes: Optional[str] = None
    reminder_days_before: Optional[int] = None
    reminder_days_after: Optional[int] = None


class LifeEventResponse(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    title: str
    event_type: str
    event_date: Optional[date] = None
    is_recurring: bool
    notes: Optional[str] = None
    reminder_days_before: Optional[int] = None
    reminder_days_after: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OverdueContact(BaseModel):
    id: uuid.UUID
    name: str
    check_in_frequency_days: int
    last_interaction_date: Optional[date] = None
    days_overdue: int

    model_config = {"from_attributes": True}


class UpcomingEvent(BaseModel):
    contact_id: uuid.UUID
    contact_name: str
    title: str
    event_type: str
    event_date: date
    days_until: int
    is_recurring: bool


class UserSettingsUpdate(BaseModel):
    email_reminders_enabled: Optional[bool] = None
    sms_reminders_enabled: Optional[bool] = None
    sms_phone: Optional[str] = None


class UserSettingsResponse(BaseModel):
    email_reminders_enabled: bool
    sms_reminders_enabled: bool
    sms_phone: Optional[str] = None

    model_config = {"from_attributes": True}


class UserProfileUpsert(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    birthday: Optional[date] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: uuid.UUID
    name: Optional[str] = None
    bio: Optional[str] = None
    birthday: Optional[date] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ImportContactPreview(BaseModel):
    name: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[date] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    tags: Optional[list[str]] = None
    general_notes: Optional[str] = None
    duplicate_of: Optional[uuid.UUID] = None
    duplicate_name: Optional[str] = None


ImportAction = Literal["import", "skip", "merge"]


class ImportConfirmItem(BaseModel):
    contact: ImportContactPreview
    action: ImportAction = "import"
    merge_into: Optional[uuid.UUID] = None


class ImportConfirmRequest(BaseModel):
    contacts: list[ImportConfirmItem]


class ImportConfirmResult(BaseModel):
    imported: int
    merged: int
    skipped: int


class InteractionCreate(BaseModel):
    date: date
    medium: InteractionMedium
    notes: Optional[str] = None


class InteractionResponse(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    date: date
    medium: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
