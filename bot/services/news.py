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

def extract_tickers_aggressively(text: str, active_tickers: list[str]) -> list[str]:
    found = set()
    if not text:
        return []
    words = re.findall(r'\b\$?([A-Z]{2,10})\b', text)
    for w in words:
        if w in active_tickers:
            found.add(w)
    return list(found)

async def ingest_custom_sources():
    """Fetches Telegram natively and Substack via their RSS feeds."""
    async with get_session() as session:
        stmt = select(ContentSource).where(
            ContentSource.is_active == True, 
            ContentSource.platform.in_(['telegram', 'substack'])
        )
        result = await session.execute(stmt)
        sources = result.scalars().all()

    if not sources:
        return

    async with get_session() as session:
        result = await session.execute(select(Watchlist.ticker))
        active_tickers = [r for r in result.scalars().all()]

    new_articles = []
    async with aiohttp.ClientSession() as http_session:
        for source in sources:
            clean_handle = sanitize_handle(source.handle, source.platform)
            
            if source.platform == 'substack':
                url = f"https://{clean_handle}.substack.com/feed"
                try:
                    async with http_session.get(url, timeout=30) as resp:
                        if resp.status == 200:
                            xml_data = await resp.text()
                            feed = feedparser.parse(xml_data)
                            for entry in feed.entries[:20]:
                                try:
                                    posted_at = parser.parse(entry.published)
                                except:
                                    posted_at = datetime.now(timezone.utc)
                                content_text = entry.get('description', '')[:2000]
                                title_text = entry.get('title', '')
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
                        else:
                            logger.error(f"Substack feed returned status {resp.status} for {source.handle}")
                except Exception as e:
                    logger.error(f"Error fetching Substack for {source.handle}: {type(e).__name__} {e}")

            elif source.platform == 'telegram':
                url = f"https://t.me/s/{clean_handle}"
                try:
                    async with http_session.get(url, timeout=30) as resp:
                        if resp.status == 200:
                            html_data = await resp.text()
                            # Native regex parsing of Telegram web view
                            messages = re.findall(r'<div class="tgme_widget_message_wrap[^>]*>([\s\S]*?)<\/div>(?=\s*<div class="tgme_widget_message_wrap|$)', html_data)
                            for msg_html in reversed(messages): # Process from oldest to newest in the chunk
                                text_match = re.search(r'<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>', msg_html, re.DOTALL)
                                time_match = re.search(r'<time datetime="([^"]+)"', msg_html)
                                link_match = re.search(r'<a class="tgme_widget_message_date" href="([^"]+)"', msg_html)
                                
                                if text_match and time_match and link_match:
                                    content_text = text_match.group(1).strip()
                                    try:
                                        posted_at = parser.parse(time_match.group(1))
                                    except:
                                        posted_at = datetime.now(timezone.utc)
                                        
                                    found_tickers = extract_tickers_aggressively(content_text, active_tickers)
                                    article = NewsArticle(
                                        source_platform=source.platform,
                                        source_handle=source.handle,
                                        author_name=source.handle,
                                        title="", # Telegram doesn't usually have titles
                                        content=content_text[:2000],
                                        url=link_match.group(1),
                                        posted_at=posted_at,
                                        tickers_mentioned=found_tickers if found_tickers else None
                                    )
                                    new_articles.append(article)
                        else:
                            logger.error(f"Telegram returned status {resp.status} for {source.handle}")
                except Exception as e:
                    logger.error(f"Error fetching Telegram for {source.handle}: {type(e).__name__} {e}")

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

    async with aiohttp.ClientSession() as http_session:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        
        urls_to_fetch = []
        for w in watchlists:
            urls_to_fetch.append({
                "url": f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={w.ticker}&region=US&lang=en-US",
                "handle": w.ticker,
                "base_ticker": [w.ticker]
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
                async with http_session.get(url, headers=headers, timeout=10) as resp:
                    if resp.status == 200:
                        xml_data = await resp.text()
                        feed = feedparser.parse(xml_data)
                        
                        new_articles = []
                        for entry in feed.entries[:20]: # Top 20 recent news per feed
                            try:
                                posted_at = parser.parse(entry.published)
                            except:
                                posted_at = datetime.now(timezone.utc)

                            content_text = entry.get('description', '') or entry.get('summary', '') or entry.get('title', '')
                            title_text = entry.get('title', '')
                            
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
                        
                        # Save to database
                        async with get_session() as session:
                            for article in new_articles:
                                try:
                                    session.add(article)
                                    await session.commit()
                                except Exception:
                                    await session.rollback() # Ignores duplicate URLs
                    else:
                        logger.error(f"Yahoo RSS returned status {resp.status} for {handle}")
            except Exception as e:
                logger.error(f"Error fetching Yahoo RSS for {handle}: {e}")

async def run_news_ingestion():
    logger.info("Starting news ingestion cycle...")
    await cleanup_old_articles()
    await ingest_custom_sources()
    await ingest_watchlist_news()
    logger.info("News ingestion cycle completed.")
