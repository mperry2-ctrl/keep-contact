import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, case
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..auth import get_current_user
from ..models import Todo
from ..schemas import TodoCreate, TodoUpdate, TodoResponse

router = APIRouter(prefix="/todos", tags=["todos"])

_CATEGORY_RANK = case(
    (Todo.category == "priority", 0),
    (Todo.category == "need_to_do", 1),
    (Todo.category == "wishlist", 2),
    else_=3,
)

_ORDER = [_CATEGORY_RANK, Todo.due_date.asc().nullslast(), Todo.created_at.asc(), Todo.description.asc()]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/", response_model=TodoResponse, status_code=201)
async def create_todo(
    body: TodoCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    todo = Todo(user_id=uuid.UUID(user["id"]), **body.model_dump())
    db.add(todo)
    await db.commit()
    await db.refresh(todo)
    return todo


@router.get("/", response_model=list[TodoResponse])
async def list_todos(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Todo).where(Todo.user_id == uuid.UUID(user["id"])).order_by(*_ORDER)
    )
    return result.scalars().all()


@router.put("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: uuid.UUID,
    body: TodoUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    todo = await db.get(Todo, todo_id)
    if not todo or todo.user_id != uuid.UUID(user["id"]):
        raise HTTPException(404)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(todo, k, v)
    await db.commit()
    await db.refresh(todo)
    return todo


@router.post("/{todo_id}/complete", response_model=TodoResponse)
async def complete_todo(
    todo_id: uuid.UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    todo = await db.get(Todo, todo_id)
    if not todo or todo.user_id != uuid.UUID(user["id"]):
        raise HTTPException(404)
    todo.completed_at = _utcnow()
    await db.commit()
    await db.refresh(todo)
    return todo


@router.post("/{todo_id}/uncomplete", response_model=TodoResponse)
async def uncomplete_todo(
    todo_id: uuid.UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    todo = await db.get(Todo, todo_id)
    if not todo or todo.user_id != uuid.UUID(user["id"]):
        raise HTTPException(404)
    todo.completed_at = None
    await db.commit()
    await db.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204)
async def delete_todo(
    todo_id: uuid.UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    todo = await db.get(Todo, todo_id)
    if not todo or todo.user_id != uuid.UUID(user["id"]):
        raise HTTPException(404)
    await db.delete(todo)
    await db.commit()
