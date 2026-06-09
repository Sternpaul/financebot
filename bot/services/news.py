import logging
import feedparser
import aiohttp
import yfinance as yf
from datetime import datetime, timedelta, timezone
from dateutil import parser
from sqlalchemy import select, delete
from bot.db.database import get_session
from bot.db.models import ContentSource, NewsArticle, Watchlist
from bot.config import get_worker_config

logger = logging.getLogger(__name__)
config = get_worker_config()

def sanitize_handle(handle: str, platform: str) -> str:
    handle = handle.strip()
    if platform == 'telegram':
        if "t.me/" in handle:
            handle = handle.split("t.me/")[-1].split("/")[0]
        handle = handle.lstrip('@')
    elif platform == 'substack':
        if "substack.com" in handle:
            handle = handle.replace("https://", "").replace("http://", "").split(".substack.com")[0]
    return handle

async def cleanup_old_articles():
    """Deletes articles older than 30 days to save DB space."""
    async with get_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        stmt = delete(NewsArticle).where(NewsArticle.posted_at < cutoff)
        result = await session.execute(stmt)
        await session.commit()
        if result.rowcount > 0:
            logger.info(f"Cleaned up {result.rowcount} articles older than 30 days.")

async def ingest_rsshub_sources():
    """Fetches Telegram and Substack feeds via RSSHub."""
    async with get_session() as session:
        stmt = select(ContentSource).where(
            ContentSource.is_active == True, 
            ContentSource.platform.in_(['telegram', 'substack'])
        )
        result = await session.execute(stmt)
        sources = result.scalars().all()

    if not sources:
        return

    new_articles = []
    async with aiohttp.ClientSession() as http_session:
        for source in sources:
            clean_handle = sanitize_handle(source.handle, source.platform)
            if source.platform == 'telegram':
                url = f"{config.rsshub_url}/telegram/channel/{clean_handle}"
            elif source.platform == 'substack':
                url = f"{config.rsshub_url}/substack/newsletters/{clean_handle}"
            else:
                continue
                
            try:
                async with http_session.get(url, timeout=10) as resp:
                    if resp.status == 200:
                        xml_data = await resp.text()
                        feed = feedparser.parse(xml_data)
                        
                        for entry in feed.entries[:5]: # Top 5 recent
                            try:
                                posted_at = parser.parse(entry.published)
                            except:
                                posted_at = datetime.now(timezone.utc)
                            
                            article = NewsArticle(
                                source_platform=source.platform,
                                source_handle=source.handle,
                                author_name=entry.get('author', source.handle),
                                title=entry.get('title', ''),
                                content=entry.get('description', '')[:2000], # Limit content length
                                url=entry.link,
                                posted_at=posted_at
                            )
                            new_articles.append(article)
            except Exception as e:
                logger.error(f"Error fetching RSSHub for {source.handle}: {e}")

    async with get_session() as session:
        for article in new_articles:
            try:
                session.add(article)
                await session.commit()
            except Exception:
                await session.rollback() # Duplicate URL

async def ingest_watchlist_news():
    """Fetches traditional news for tickers in the watchlist using Yahoo Finance RSS feeds."""
    async with get_session() as session:
        stmt = select(Watchlist).where(Watchlist.alert_news == True)
        result = await session.execute(stmt)
        watchlists = result.scalars().all()
    
    if not watchlists:
        return

    async with aiohttp.ClientSession() as http_session:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        for w in watchlists:
            url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={w.ticker}&region=US&lang=en-US"
            try:
                async with http_session.get(url, headers=headers, timeout=10) as resp:
                    if resp.status == 200:
                        xml_data = await resp.text()
                        feed = feedparser.parse(xml_data)
                        
                        new_articles = []
                        for entry in feed.entries[:5]: # Top 5 recent news per ticker
                            try:
                                posted_at = parser.parse(entry.published)
                            except:
                                posted_at = datetime.now(timezone.utc)

                            article = NewsArticle(
                                source_platform='yfinance',
                                source_handle=w.ticker,
                                author_name='Yahoo Finance',
                                title=entry.get('title', ''),
                                content=entry.get('description', '') or entry.get('summary', '') or entry.get('title', ''),
                                url=entry.link,
                                posted_at=posted_at,
                                tickers_mentioned=[w.ticker]
                            )
                            new_articles.append(article)
                        
                        # Save to database
                        async with get_session() as session:
                            for article in new_articles:
                                try:
                                    session.add(article)
                                    await session.commit()
                                except Exception:
                                    await session.rollback() # Ignores duplicate URLs
                    else:
                        logger.error(f"Yahoo RSS returned status {resp.status} for {w.ticker}")
            except Exception as e:
                logger.error(f"Error fetching Yahoo RSS for {w.ticker}: {e}")

async def run_news_ingestion():
    logger.info("Starting news ingestion cycle...")
    await cleanup_old_articles()
    await ingest_rsshub_sources()
    await ingest_watchlist_news()
    logger.info("News ingestion cycle completed.")
