"""Add reminder_days_after to life_events

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-27
"""
from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('life_events', sa.Column('reminder_days_after', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('life_events', 'reminder_days_after')
