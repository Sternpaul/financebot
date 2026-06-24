"""add podcast tables

Revision ID: a1b2c3d4e5f7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-24 12:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create podcast_episodes table
    op.create_table('podcast_episodes',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('show_name', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('video_id', sa.String(), nullable=False),
    sa.Column('published_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('is_processed', sa.Boolean(), server_default='false', nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('video_id')
    )
    
    # Create podcast_trades table
    op.create_table('podcast_trades',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('episode_id', sa.BigInteger(), nullable=False),
    sa.Column('ticker', sa.String(), nullable=False),
    sa.Column('trade_type', sa.String(), nullable=False),
    sa.Column('thesis', sa.Text(), nullable=False),
    sa.Column('speaker', sa.String(), nullable=True),
    sa.Column('quote', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['episode_id'], ['podcast_episodes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('podcast_trades')
    op.drop_table('podcast_episodes')
