"""standardize_location_phone

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-24 15:38:33.185884

"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # rename country → country_code to make ISO 3166-1 alpha-2 standard explicit
    op.alter_column('contacts', 'country', new_column_name='country_code')
    # add comment to phone to document E.164 format expectation
    op.alter_column('contacts', 'phone', comment='E.164 format e.g. +12125551234')
    # add postal_code for precise geocoding
    op.add_column('contacts', sa.Column('postal_code', sa.String(20)))


def downgrade() -> None:
    op.drop_column('contacts', 'postal_code')
    op.alter_column('contacts', 'country_code', new_column_name='country')
    op.alter_column('contacts', 'phone', comment=None)
