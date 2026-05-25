"""user_settings table

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_settings',
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email_reminders_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sms_reminders_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sms_phone', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('user_settings')
