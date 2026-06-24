"""Add Phase 2 database indexes

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2026-06-24 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_index('ix_news_articles_posted_at', 'news_articles', ['posted_at'])
    op.create_index('ix_news_articles_source_platform_posted_at', 'news_articles', ['source_platform', 'posted_at'])
    op.create_index('ix_news_articles_is_synthesized', 'news_articles', ['is_synthesized'])
    op.create_index('ix_news_articles_tickers_mentioned', 'news_articles', ['tickers_mentioned'], postgresql_using='gin')

    op.create_index('ix_market_knowledge_ticker_created_at', 'market_knowledge', ['ticker', 'created_at'])
    op.create_index('ix_market_knowledge_is_archived', 'market_knowledge', ['is_archived'])
    
    op.create_index('ix_technical_alerts_ticker_triggered_at', 'technical_alerts', ['ticker', 'triggered_at'])
    
    op.create_index('ix_raw_tweets_is_processed_ingested_at', 'raw_tweets', ['is_processed', 'ingested_at'])
    op.create_index('ix_raw_webcontent_is_processed_scraped_at', 'raw_webcontent', ['is_processed', 'scraped_at'])
    
    op.create_unique_constraint('uq_content_sources_platform_handle', 'content_sources', ['platform', 'handle'])

def downgrade():
    op.drop_constraint('uq_content_sources_platform_handle', 'content_sources', type_='unique')
    
    op.drop_index('ix_raw_webcontent_is_processed_scraped_at', table_name='raw_webcontent')
    op.drop_index('ix_raw_tweets_is_processed_ingested_at', table_name='raw_tweets')
    op.drop_index('ix_technical_alerts_ticker_triggered_at', table_name='technical_alerts')
    op.drop_index('ix_market_knowledge_is_archived', table_name='market_knowledge')
    op.drop_index('ix_market_knowledge_ticker_created_at', table_name='market_knowledge')
    
    op.drop_index('ix_news_articles_tickers_mentioned', table_name='news_articles', postgresql_using='gin')
    op.drop_index('ix_news_articles_is_synthesized', table_name='news_articles')
    op.drop_index('ix_news_articles_source_platform_posted_at', table_name='news_articles')
    op.drop_index('ix_news_articles_posted_at', table_name='news_articles')
