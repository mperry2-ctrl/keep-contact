"""sms_opt_out on contacts, reminder_hour + timezone on user_settings

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-01
"""
from alembic import op
import sqlalchemy as sa

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('contacts', sa.Column('sms_opt_out', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user_settings', sa.Column('reminder_hour', sa.Integer(), nullable=False, server_default='8'))
    op.add_column('user_settings', sa.Column('timezone', sa.String(50), nullable=False, server_default='America/New_York'))


def downgrade() -> None:
    op.drop_column('user_settings', 'timezone')
    op.drop_column('user_settings', 'reminder_hour')
    op.drop_column('contacts', 'sms_opt_out')
