import uuid
from datetime import date, datetime, timezone

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

from sqlalchemy import String, Text, Boolean, Integer, Date, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    birthday: Mapped[date | None] = mapped_column(Date)
    job_title: Mapped[str | None] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(255))
    state: Mapped[str | None] = mapped_column(String(255))
    country_code: Mapped[str | None] = mapped_column(String(2))   # ISO 3166-1 alpha-2
    postal_code: Mapped[str | None] = mapped_column(String(20))
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    general_notes: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    check_in_frequency_days: Mapped[int | None] = mapped_column(Integer)
    linked_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    interactions: Mapped[list["Interaction"]] = relationship(back_populates="contact", cascade="all, delete-orphan")
    life_events: Mapped[list["LifeEvent"]] = relationship(back_populates="contact", cascade="all, delete-orphan")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="contact", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str | None] = mapped_column(String(255))
    bio: Mapped[str | None] = mapped_column(Text)
    birthday: Mapped[date | None] = mapped_column(Date)
    job_title: Mapped[str | None] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(255))
    state: Mapped[str | None] = mapped_column(String(255))
    country_code: Mapped[str | None] = mapped_column(String(2))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    medium: Mapped[str] = mapped_column(String(50), nullable=False)  # in-person, call, text, email, social, other
    notes: Mapped[str | None] = mapped_column(Text)
    group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    group_participant_names: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    contact: Mapped["Contact"] = relationship(back_populates="interactions")


class LifeEvent(Base):
    __tablename__ = "life_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    event_date: Mapped[date | None] = mapped_column(Date)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # birthday, trip, milestone, meeting, other
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    reminder_days_before: Mapped[int | None] = mapped_column(Integer)
    reminder_days_after: Mapped[int | None] = mapped_column(Integer)
    group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    group_participant_names: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    contact: Mapped["Contact"] = relationship(back_populates="life_events")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="life_event", cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email_reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    sms_reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    sms_phone: Mapped[str | None] = mapped_column(String(50))  # user's own phone for receiving texts
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False)
    life_event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("life_events.id"))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_date: Mapped[date] = mapped_column(Date, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    contact: Mapped["Contact"] = relationship(back_populates="reminders")
    life_event: Mapped["LifeEvent | None"] = relationship(back_populates="reminders")
