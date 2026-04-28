"""Add is_approved and per_class_ap to model_versions

Revision ID: add_is_approved_per_class_ap
Revises: previous_revision
Create Date: 2026-04-22

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_is_approved_per_class_ap'
down_revision = '378735099b9d'  # Previous head revision
branch_labels = None
depends_on = None


def upgrade():
    # Add is_approved column
    op.add_column('model_versions', sa.Column('is_approved', sa.Boolean(), nullable=True, default=False))
    
    # Add per_class_ap column (JSON for per-class AP metrics)
    op.add_column('model_versions', sa.Column('per_class_ap', sa.JSON(), nullable=True))
    
    # Update existing models: mark production models as approved
    op.execute("UPDATE model_versions SET is_approved = true WHERE is_production = true OR is_base = true")


def downgrade():
    op.drop_column('model_versions', 'per_class_ap')
    op.drop_column('model_versions', 'is_approved')
