import logging
import feedparser
import aiohttp
import yfinance as yf
from datetime import datetime, timedelta, timezone
from dateutil import parser
from sqlalchemy import select, delete
from bot.db.database import get_session
from bot.db.models import ContentSource, NewsArticle, Watchlist, RawTweet, LikedTweet
from bot.config import get_worker_config
import re

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
    """Deletes articles older than 365 days to save DB space."""
    async with get_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(days=365)
        stmt = delete(NewsArticle).where(NewsArticle.posted_at < cutoff)
        result = await session.execute(stmt)
        await session.commit()
        if result.rowcount > 0:
            logger.info(f"Cleaned up {result.rowcount} articles older than 365 days.")

async def cleanup_old_raw_tweets():
    """Deletes raw_tweets and liked_tweets older than 30 days to save DB space."""
    async with get_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        stmt_raw = delete(RawTweet).where(RawTweet.posted_at < cutoff)
        res_raw = await session.execute(stmt_raw)
        stmt_liked = delete(LikedTweet).where(LikedTweet.posted_at < cutoff)
        res_liked = await session.execute(stmt_liked)
        await session.commit()
        if res_raw.rowcount > 0 or res_liked.rowcount > 0:
            logger.info(f"Cleaned up {res_raw.rowcount} raw tweets and {res_liked.rowcount} liked tweets older than 30 days.")

def extract_tickers_aggressively(text: str, active_tickers: list[str]) -> list[str]:
    found = set()
    if not text:
        return []
    words = re.findall(r'\b\$?([A-Z]{2,10})\b', text)
    for w in words:
        if w in active_tickers:
            found.add(w)
    return list(found)

from bot.db.models import ContentSource, NewsArticle, Watchlist, IngestionLog

async def log_ingestion(source_platform: str, source_handle: str, status: str, message: str):
    async with get_session() as session:
        log_entry = IngestionLog(
            source_platform=source_platform,
            source_handle=source_handle,
            status=status,
            message=message
        )
        session.add(log_entry)
        await session.commit()

import difflib

def is_duplicate_article(clean_text: str, recent_articles: list, threshold: float = 0.95) -> bool:
    if not clean_text or len(clean_text.strip()) < 10:
        return False # Too short to deduplicate reliably
        
    clean_text = clean_text.lower().strip()
    
    for content, title in recent_articles:
        existing_text = f"{title or ''} {content or ''}".lower().strip()
        
        # Fast length check before running SequenceMatcher
        if not existing_text:
            continue
        if len(clean_text) > len(existing_text) * 1.5 or len(existing_text) > len(clean_text) * 1.5:
            continue
            
        similarity = difflib.SequenceMatcher(None, clean_text, existing_text).ratio()
        if similarity >= threshold:
            return True
            
    return False

async def ingest_custom_sources():
    """Fetches Substack via their RSS feeds. Telegram is handled via real-time Telethon streaming."""
    async with get_session() as session:
        stmt = select(ContentSource).where(
            ContentSource.is_active == True, 
            ContentSource.platform == 'substack'
        )
        result = await session.execute(stmt)
        sources = result.scalars().all()

    if not sources:
        return

    async with get_session() as session:
        result = await session.execute(select(Watchlist.ticker))
        active_tickers = [r for r in result.scalars().all()]

    async with get_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
        result = await session.execute(select(NewsArticle.content, NewsArticle.title).where(NewsArticle.posted_at >= cutoff))
        recent_articles = result.all()

    new_articles = []
    async with aiohttp.ClientSession() as http_session:
        for source in sources:
            clean_handle = sanitize_handle(source.handle, source.platform)
            
            if source.platform == 'substack':
                url = f"https://{clean_handle}.substack.com/feed"
                try:
                    logger.info(f"Fetching Substack feed: {url}")
                    async with http_session.get(url, timeout=30) as resp:
                        if resp.status == 200:
                            xml_data = await resp.text()
                            feed = feedparser.parse(xml_data)
                            
                            if not feed.entries:
                                await log_ingestion('substack', source.handle, 'NO_NEW_DATA', 'Feed successfully parsed but returned 0 entries.')
                                continue
                                
                            new_count = 0
                            dup_count = 0
                            
                            for entry in feed.entries[:20]:
                                try:
                                    posted_at = parser.parse(entry.published)
                                except:
                                    posted_at = datetime.now(timezone.utc)
                                content_text = entry.get('description', '')[:2000]
                                title_text = entry.get('title', '')
                                
                                is_dup = is_duplicate_article(title_text + " " + content_text, recent_articles)
                                if is_dup:
                                    dup_count += 1
                                    continue
                                
                                found_tickers = extract_tickers_aggressively(title_text + " " + content_text, active_tickers)
                                article = NewsArticle(
                                    source_platform=source.platform,
                                    source_handle=source.handle,
                                    author_name=entry.get('author', source.handle),
                                    title=title_text,
                                    content=content_text,
                                    url=entry.link,
                                    posted_at=posted_at,
                                    tickers_mentioned=found_tickers if found_tickers else None
                                )
                                new_articles.append(article)
                                new_count += 1
                                
                            if new_count > 0:
                                await log_ingestion('substack', source.handle, 'SUCCESS', f'Fetched {len(feed.entries)} entries: {new_count} new, {dup_count} duplicates.')
                            elif dup_count > 0:
                                await log_ingestion('substack', source.handle, 'NO_NEW_DATA', f'All {dup_count} entries were duplicates.')
                        else:
                            error_msg = f"Substack feed returned status {resp.status}"
                            logger.error(f"{error_msg} for {source.handle}")
                            await log_ingestion('substack', source.handle, 'ERROR', error_msg)
                except Exception as e:
                    error_msg = f"Error fetching Substack: {type(e).__name__} {e}"
                    logger.error(f"{error_msg} for {source.handle}")
                    await log_ingestion('substack', source.handle, 'ERROR', error_msg)

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

        from bot.db.models import Transaction
        stmt_portfolio = select(Transaction.ticker).where(Transaction.ticker.is_not(None)).distinct()
        res_port = await session.execute(stmt_portfolio)
        portfolio_tickers = res_port.scalars().all()
    
    target_tickers = set(w.ticker for w in watchlists)
    target_tickers.update(portfolio_tickers)
    
    # Check all active general market indices (yfinance platform in content_sources)
    async with get_session() as session:
        stmt = select(ContentSource).where(
            ContentSource.platform == 'yfinance',
            ContentSource.is_active == True
        )
        result = await session.execute(stmt)
        general_active_sources = result.scalars().all()
        
        # Also get active tickers for extraction
        result2 = await session.execute(select(Watchlist.ticker))
        active_tickers = [r for r in result2.scalars().all()]

    async with get_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
        result = await session.execute(select(NewsArticle.content, NewsArticle.title).where(NewsArticle.posted_at >= cutoff))
        recent_articles = result.all()

    async with aiohttp.ClientSession() as http_session:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        
        urls_to_fetch = []
        for ticker in target_tickers:
            urls_to_fetch.append({
                "url": f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US",
                "handle": ticker,
                "base_ticker": [ticker]
            })
            
        for g_source in general_active_sources:
            urls_to_fetch.append({
                "url": f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={g_source.handle}&region=US&lang=en-US",
                "handle": g_source.handle,
                "base_ticker": []
            })
            
        for item in urls_to_fetch:
            url = item["url"]
            handle = item["handle"]
            base_ticker = item["base_ticker"]
            try:
                logger.info(f"Fetching Yahoo feed: {url}")
                async with http_session.get(url, headers=headers, timeout=10) as resp:
                    if resp.status == 200:
                        xml_data = await resp.text()
                        feed = feedparser.parse(xml_data)
                        
                        if not feed.entries:
                            await log_ingestion('yfinance', handle, 'NO_NEW_DATA', 'Feed successfully parsed but returned 0 entries.')
                            continue
                            
                        new_count = 0
                        dup_count = 0
                        new_articles = []
                        
                        for entry in feed.entries[:20]: # Top 20 recent news per feed
                            try:
                                posted_at = parser.parse(entry.published)
                            except:
                                posted_at = datetime.now(timezone.utc)

                            content_text = entry.get('description', '') or entry.get('summary', '') or entry.get('title', '')
                            title_text = entry.get('title', '')
                            
                            is_dup = is_duplicate_article(title_text + " " + content_text, recent_articles)
                            if is_dup:
                                dup_count += 1
                                continue
                            
                            found_tickers = extract_tickers_aggressively(title_text + " " + content_text, active_tickers)
                            combined_tickers = list(set(base_ticker + found_tickers))

                            article = NewsArticle(
                                source_platform='yfinance',
                                source_handle=handle,
                                author_name='Yahoo Finance',
                                title=title_text,
                                content=content_text,
                                url=entry.link,
                                posted_at=posted_at,
                                tickers_mentioned=combined_tickers if combined_tickers else None
                            )
                            new_articles.append(article)
                            new_count += 1
                        
                        if new_count > 0:
                            await log_ingestion('yfinance', handle, 'SUCCESS', f'Fetched {len(feed.entries)} entries: {new_count} new, {dup_count} duplicates.')
                        elif dup_count > 0:
                            await log_ingestion('yfinance', handle, 'NO_NEW_DATA', f'All {dup_count} entries were duplicates.')
                        
                        # Save to database
                        async with get_session() as session:
                            for article in new_articles:
                                try:
                                    session.add(article)
                                    await session.commit()
                                except Exception:
                                    await session.rollback() # Ignores duplicate URLs
                    else:
                        error_msg = f"Yahoo RSS returned status {resp.status}"
                        logger.error(f"{error_msg} for {handle}")
                        await log_ingestion('yfinance', handle, 'ERROR', error_msg)
            except Exception as e:
                error_msg = f"Error fetching Yahoo RSS: {type(e).__name__} {e}"
                logger.error(f"{error_msg} for {handle}")
                await log_ingestion('yfinance', handle, 'ERROR', error_msg)

async def run_news_ingestion():
    logger.info("Starting news ingestion cycle...")
    try:
        logger.info("Running cleanup_old_articles...")
        await cleanup_old_articles()
        logger.info("Running cleanup_old_raw_tweets...")
        await cleanup_old_raw_tweets()
        logger.info("Running ingest_custom_sources...")
        await ingest_custom_sources()
        logger.info("Running ingest_watchlist_news...")
        await ingest_watchlist_news()
        logger.info("News ingestion cycle completed.")
    except Exception as e:
        logger.error(f"News ingestion cycle failed with error: {type(e).__name__} {e}")
