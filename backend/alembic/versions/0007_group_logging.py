"""group_id and group_participant_names on interactions and life_events

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('interactions', sa.Column('group_id', UUID(as_uuid=True), nullable=True))
    op.add_column('interactions', sa.Column('group_participant_names', sa.Text(), nullable=True))
    op.add_column('life_events', sa.Column('group_id', UUID(as_uuid=True), nullable=True))
    op.add_column('life_events', sa.Column('group_participant_names', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('life_events', 'group_participant_names')
    op.drop_column('life_events', 'group_id')
    op.drop_column('interactions', 'group_participant_names')
    op.drop_column('interactions', 'group_id')
