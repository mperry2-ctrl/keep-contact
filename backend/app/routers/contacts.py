import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from ..database import get_db
from ..models import Contact
from ..schemas import ContactCreate, ContactUpdate, ContactResponse
from ..auth import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("/", response_model=list[ContactResponse])
async def list_contacts(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact)
        .where(Contact.user_id == uuid.UUID(user["id"]))
        .order_by(Contact.name)
    )
    return result.scalars().all()


@router.post("/", response_model=ContactResponse, status_code=201)
async def create_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    contact = Contact(**data.model_dump(), user_id=uuid.UUID(user["id"]))
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/search", response_model=list[ContactResponse])
async def search_contacts(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    pattern = f"%{q}%"
    result = await db.execute(
        select(Contact)
        .where(
            Contact.user_id == uuid.UUID(user["id"]),
            or_(
                Contact.name.ilike(pattern),
                Contact.company.ilike(pattern),
                Contact.general_notes.ilike(pattern),
                func.array_to_string(Contact.tags, ",").ilike(pattern),
            ),
        )
        .order_by(Contact.name)
    )
    return result.scalars().all()


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == uuid.UUID(user["id"]))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: uuid.UUID,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == uuid.UUID(user["id"]))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == uuid.UUID(user["id"]))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(contact)
    await db.commit()
