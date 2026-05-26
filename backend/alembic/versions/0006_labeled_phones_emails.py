"""Replace phone/email strings with labeled JSONB arrays

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # contacts: add phones/emails JSONB, migrate from single string columns, drop old columns
    op.add_column('contacts', sa.Column('phones', JSONB, nullable=True))
    op.add_column('contacts', sa.Column('emails', JSONB, nullable=True))

    op.execute("""
        UPDATE contacts
        SET phones = jsonb_build_array(jsonb_build_object('value', phone, 'label', 'mobile'))
        WHERE phone IS NOT NULL AND phone != ''
    """)
    op.execute("""
        UPDATE contacts
        SET emails = jsonb_build_array(jsonb_build_object('value', email, 'label', 'personal'))
        WHERE email IS NOT NULL AND email != ''
    """)

    op.drop_column('contacts', 'phone')
    op.drop_column('contacts', 'email')

    # user_profiles: migrate phones/emails from ARRAY(String) to JSONB
    op.add_column('user_profiles', sa.Column('phones_new', JSONB, nullable=True))
    op.add_column('user_profiles', sa.Column('emails_new', JSONB, nullable=True))

    op.execute("""
        UPDATE user_profiles
        SET phones_new = (
            SELECT jsonb_agg(jsonb_build_object('value', p, 'label', 'mobile'))
            FROM unnest(phones) p
        )
        WHERE phones IS NOT NULL AND array_length(phones, 1) > 0
    """)
    op.execute("""
        UPDATE user_profiles
        SET emails_new = (
            SELECT jsonb_agg(jsonb_build_object('value', e, 'label', 'personal'))
            FROM unnest(emails) e
        )
        WHERE emails IS NOT NULL AND array_length(emails, 1) > 0
    """)

    op.drop_column('user_profiles', 'phones')
    op.drop_column('user_profiles', 'emails')
    op.alter_column('user_profiles', 'phones_new', new_column_name='phones')
    op.alter_column('user_profiles', 'emails_new', new_column_name='emails')


def downgrade() -> None:
    # contacts: restore single phone/email string columns
    op.add_column('contacts', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('contacts', sa.Column('email', sa.String(255), nullable=True))
    op.execute("""
        UPDATE contacts
        SET phone = (phones->0->>'value')
        WHERE phones IS NOT NULL AND jsonb_array_length(phones) > 0
    """)
    op.execute("""
        UPDATE contacts
        SET email = (emails->0->>'value')
        WHERE emails IS NOT NULL AND jsonb_array_length(emails) > 0
    """)
    op.drop_column('contacts', 'phones')
    op.drop_column('contacts', 'emails')

    # user_profiles: restore ARRAY(String) columns
    from sqlalchemy.dialects.postgresql import ARRAY
    op.add_column('user_profiles', sa.Column('phones_old', ARRAY(sa.String()), nullable=True))
    op.add_column('user_profiles', sa.Column('emails_old', ARRAY(sa.String()), nullable=True))
    op.execute("""
        UPDATE user_profiles
        SET phones_old = ARRAY(SELECT elem->>'value' FROM jsonb_array_elements(phones) elem)
        WHERE phones IS NOT NULL
    """)
    op.execute("""
        UPDATE user_profiles
        SET emails_old = ARRAY(SELECT elem->>'value' FROM jsonb_array_elements(emails) elem)
        WHERE emails IS NOT NULL
    """)
    op.drop_column('user_profiles', 'phones')
    op.drop_column('user_profiles', 'emails')
    op.alter_column('user_profiles', 'phones_old', new_column_name='phones')
    op.alter_column('user_profiles', 'emails_old', new_column_name='emails')
