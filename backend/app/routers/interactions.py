import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Contact, Interaction
from ..schemas import InteractionCreate, InteractionResponse
from ..auth import get_current_user

router = APIRouter(prefix="/contacts/{contact_id}/interactions", tags=["interactions"])


async def _get_contact(contact_id: uuid.UUID, user_id: str, db: AsyncSession) -> Contact:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == uuid.UUID(user_id))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get("/", response_model=list[InteractionResponse])
async def list_interactions(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    result = await db.execute(
        select(Interaction)
        .where(Interaction.contact_id == contact_id)
        .order_by(Interaction.date.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=InteractionResponse, status_code=201)
async def create_interaction(
    contact_id: uuid.UUID,
    data: InteractionCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    interaction = Interaction(**data.model_dump(), contact_id=contact_id)
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)
    return interaction


@router.put("/{interaction_id}", response_model=InteractionResponse)
async def update_interaction(
    contact_id: uuid.UUID,
    interaction_id: uuid.UUID,
    data: InteractionCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    result = await db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.contact_id == contact_id,
        )
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    for key, value in data.model_dump().items():
        setattr(interaction, key, value)
    await db.commit()
    await db.refresh(interaction)
    return interaction


@router.delete("/{interaction_id}", status_code=204)
async def delete_interaction(
    contact_id: uuid.UUID,
    interaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await _get_contact(contact_id, user["id"], db)
    result = await db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.contact_id == contact_id,
        )
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    await db.delete(interaction)
    await db.commit()
