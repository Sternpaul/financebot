from sqlalchemy import Column, BigInteger, String, Float, Boolean, JSON, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    type = Column(String, nullable=False) # 'BUY', 'SELL', 'CASH_ADD', 'CASH_REMOVE'
    ticker = Column(String) # Nullable for cash transfers
    shares = Column(Float)
    price_per_share = Column(Float)
    currency = Column(String, default='USD')
    account = Column(String, default='main')
    date = Column(DateTime(timezone=True), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

class Watchlist(Base):
    __tablename__ = 'watchlist'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticker = Column(String, nullable=False, unique=True)
    name = Column(String)
    asset_type = Column(String)
    sector = Column(String)
    notes = Column(Text)
    alert_news = Column(Boolean, default=True)
    alert_price_change = Column(Float, default=5.0)
    custom_alerts = Column(JSONB, default=dict)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

class ContentSource(Base):
    __tablename__ = 'content_sources'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    platform = Column(String, nullable=False)
    handle = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_core = Column(Boolean, default=False)
    region = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

class NewsArticle(Base):
    __tablename__ = 'news_articles'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_platform = Column(String, nullable=False)
    source_handle = Column(String, nullable=False)
    author_name = Column(String)
    title = Column(String)
    content = Column(Text, nullable=False)
    url = Column(String, unique=True)
    posted_at = Column(DateTime(timezone=True), nullable=False)
    tickers_mentioned = Column(JSONB)
    sentiment = Column(Float)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
    is_synthesized = Column(Boolean, default=False, server_default='false')

class TechnicalAlert(Base):
    __tablename__ = 'technical_alerts'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticker = Column(String, nullable=False)
    alert_type = Column(String, nullable=False)
    price_at_alert = Column(Float, nullable=False)
    pct_change = Column(Float, nullable=False)
    volume_ratio = Column(Float, nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged = Column(Boolean, default=False)

class IngestionLog(Base):
    __tablename__ = 'ingestion_logs'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_platform = Column(String, nullable=False)
    source_handle = Column(String, nullable=False)
    status = Column(String, nullable=False) # 'SUCCESS', 'ERROR', 'NO_NEW_DATA'
    message = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class IdeationDocument(Base):
    __tablename__ = 'ideation_documents'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source = Column(String, nullable=False)
    ticker = Column(String)
    title = Column(String)
    content = Column(Text, nullable=False)
    metadata_json = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to embeddings
    embeddings = relationship("IdeationEmbedding", back_populates="document", cascade="all, delete-orphan")

class IdeationEmbedding(Base):
    __tablename__ = 'ideation_embeddings'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_id = Column(BigInteger, ForeignKey('ideation_documents.id', ondelete='CASCADE'), nullable=False)
    content_chunk = Column(Text, nullable=False)
    embedding = Column(Vector(384))  # 384 dimensions, standard for many small embedding models
    metadata_json = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("IdeationDocument", back_populates="embeddings")

class MarketKnowledge(Base):
    __tablename__ = 'market_knowledge'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticker = Column(String, nullable=True) # Ticker or None for macro
    knowledge_type = Column(String, nullable=False) # e.g., 'sentiment', 'catalyst', 'risk', 'macro'
    content = Column(Text, nullable=False)
    source_article_ids = Column(JSONB, default=list) # List of related NewsArticle IDs
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AlertPerformance(Base):
    __tablename__ = 'alert_performance'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    alert_id = Column(BigInteger, ForeignKey('technical_alerts.id', ondelete='CASCADE'), nullable=False, unique=True)
    forward_3d = Column(Float, nullable=True)
    forward_7d = Column(Float, nullable=True)
    forward_30d = Column(Float, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Optional back-reference if needed
    alert = relationship("TechnicalAlert", backref="performance")

class RawTweet(Base):
    __tablename__ = 'raw_tweets'

    id = Column(String, primary_key=True) # Twitter's native ID string
    author = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    media_urls = Column(JSONB, default=list) # Array of image/video URLs
    url = Column(String, unique=True, nullable=False)
    posted_at = Column(DateTime(timezone=True), nullable=False)
    is_processed = Column(Boolean, default=False, server_default='false')
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())

class LikedTweet(Base):
    __tablename__ = 'liked_tweets'

    id = Column(String, primary_key=True) # Twitter's native ID string
    author = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    media_urls = Column(JSONB, default=list) # Array of image/video URLs
    url = Column(String, unique=True, nullable=False)
    posted_at = Column(DateTime(timezone=True), nullable=False)
    is_processed = Column(Boolean, default=False, server_default='false')
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())

class CuratedWebContent(Base):
    __tablename__ = 'curated_webcontent'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    url = Column(String, unique=True, nullable=False)
    title = Column(String)
    content = Column(Text, nullable=False)
    source = Column(String, default='chrome_extension_hotkey')
    is_processed = Column(Boolean, default=False, server_default='false')
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

class RawWebContent(Base):
    __tablename__ = 'raw_webcontent'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    url = Column(String, unique=True, nullable=False)
    title = Column(String)
    content = Column(Text, nullable=False)
    source = Column(String, default='chrome_extension_auto')
    is_processed = Column(Boolean, default=False, server_default='false')
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
