"""user_profiles table and linked_profile_id on contacts

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_profiles',
        sa.Column('user_id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('birthday', sa.Date(), nullable=True),
        sa.Column('job_title', sa.String(255), nullable=True),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('city', sa.String(255), nullable=True),
        sa.Column('state', sa.String(255), nullable=True),
        sa.Column('country_code', sa.String(2), nullable=True),
        sa.Column('postal_code', sa.String(20), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('photo_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.add_column(
        'contacts',
        sa.Column('linked_profile_id', UUID(as_uuid=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('contacts', 'linked_profile_id')
    op.drop_table('user_profiles')
