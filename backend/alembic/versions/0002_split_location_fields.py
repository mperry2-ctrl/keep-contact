"""split_location_fields

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-24 15:27:19.022857

"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('contacts', sa.Column('city', sa.String(255)))
    op.add_column('contacts', sa.Column('state', sa.String(255)))
    op.add_column('contacts', sa.Column('country', sa.String(255)))
    op.drop_column('contacts', 'location')


def downgrade() -> None:
    op.add_column('contacts', sa.Column('location', sa.String(255)))
    op.drop_column('contacts', 'city')
    op.drop_column('contacts', 'state')
    op.drop_column('contacts', 'country')
