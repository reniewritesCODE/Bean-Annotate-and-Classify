"""Add DatasetVersion model

Revision ID: 3f8c9d2e5b1a
Revises: aeebbaa5be36
Create Date: 2026-04-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f8c9d2e5b1a'
down_revision: Union[str, Sequence[str], None] = 'aeebbaa5be36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('dataset_versions',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('project_id', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('train_split', sa.Integer(), nullable=False),
    sa.Column('val_split', sa.Integer(), nullable=False),
    sa.Column('test_split', sa.Integer(), nullable=False),
    sa.Column('image_size', sa.Integer(), nullable=False),
    sa.Column('preprocessing', sa.JSON(), nullable=False),
    sa.Column('augmentations', sa.JSON(), nullable=False),
    sa.Column('total_images', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('dataset_versions')
