import pytest
from datetime import date
from pydantic import ValidationError
from app.schemas import ContactCreate, LifeEventCreate, InteractionCreate


def test_U12_contact_create_minimal():
    c = ContactCreate(name="Alice")
    assert c.name == "Alice"
    assert c.email is None
    assert c.phone is None


def test_U13_contact_create_requires_name():
    with pytest.raises(ValidationError):
        ContactCreate()


def test_U14_contact_create_invalid_email():
    with pytest.raises(ValidationError):
        ContactCreate(name="Alice", email="not-an-email")


def test_U15_life_event_create_invalid_type():
    with pytest.raises(ValidationError):
        LifeEventCreate(title="Trip", event_type="vacation")


def test_U16_interaction_create_invalid_medium():
    with pytest.raises(ValidationError):
        InteractionCreate(date=date.today(), medium="carrier-pigeon")
