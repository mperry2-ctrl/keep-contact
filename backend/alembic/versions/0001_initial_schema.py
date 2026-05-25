"""initial_schema

Revision ID: 0001
Revises: 
Create Date: 2026-05-24 00:15:34.798073

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        'contacts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('nickname', sa.String(255)),
        sa.Column('email', sa.String(255)),
        sa.Column('phone', sa.String(50)),
        sa.Column('birthday', sa.Date),
        sa.Column('job_title', sa.String(255)),
        sa.Column('company', sa.String(255)),
        sa.Column('location', sa.String(255)),
        sa.Column('tags', ARRAY(sa.String)),
        sa.Column('general_notes', sa.Text),
        sa.Column('photo_url', sa.String(500)),
        sa.Column('check_in_frequency_days', sa.Integer),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, server_default=sa.text('now()')),
    )
    op.create_index('ix_contacts_user_id', 'contacts', ['user_id'])

    op.create_table(
        'interactions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('medium', sa.String(50), nullable=False),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()')),
    )
    op.create_index('ix_interactions_contact_id', 'interactions', ['contact_id'])

    op.create_table(
        'life_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('event_date', sa.Date),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('is_recurring', sa.Boolean, server_default='false'),
        sa.Column('notes', sa.Text),
        sa.Column('reminder_days_before', sa.Integer),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()')),
    )
    op.create_index('ix_life_events_contact_id', 'life_events', ['contact_id'])

    op.create_table(
        'reminders',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('life_event_id', UUID(as_uuid=True), sa.ForeignKey('life_events.id', ondelete='SET NULL')),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('trigger_date', sa.Date, nullable=False),
        sa.Column('sent_at', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()')),
    )
    op.create_index('ix_reminders_user_id', 'reminders', ['user_id'])


def downgrade() -> None:
    op.drop_table('reminders')
    op.drop_table('life_events')
    op.drop_table('interactions')
    op.drop_table('contacts')
