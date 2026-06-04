"""Add todos table

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'todos',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('category', sa.String(20), nullable=False, server_default='need_to_do'),
        sa.Column('due_date', sa.Date, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_todos_user_id', 'todos', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_todos_user_id', 'todos')
    op.drop_table('todos')
