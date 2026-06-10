import os
import asyncio
import logging
from datetime import datetime, timezone
from telethon import TelegramClient
from sqlalchemy import select

from bot.db.database import AsyncSessionLocal
from bot.db.models import ContentSource, NewsArticle, Watchlist
from bot.services.news import extract_tickers_aggressively

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_ID = os.getenv("TELEGRAM_API_ID")
API_HASH = os.getenv("TELEGRAM_API_HASH")

from redis.asyncio import Redis
from bot.telegram_client import get_telegram_client

async def get_active_tickers(session):
    result = await session.execute(select(Watchlist.ticker))
    return [r for r in result.scalars().all()]

async def backfill(handles_to_backfill: list[str] = None):
    client = get_telegram_client()
    if not client:
        logger.error("Telegram client is not initialized.")
        return
        
    if not client.is_connected():
        await client.connect()
        
    if not await client.is_user_authorized():
        logger.error("Session is not authorized. Please log in using login_telegram.py first.")
        return
    
    async with AsyncSessionLocal() as session:
        if handles_to_backfill is None:
            result = await session.execute(select(ContentSource).where(ContentSource.platform == 'telegram', ContentSource.is_active == True))
            sources = result.scalars().all()
            source_handles = [s.handle for s in sources]
        else:
            source_handles = handles_to_backfill
        
        active_tickers = await get_active_tickers(session)
        
        for source_handle in source_handles:
            logger.info(f"Backfilling {source_handle}...")
            try:
                # get entity
                entity = await client.get_entity(source_handle)
                count = 0
                async for message in client.iter_messages(entity, limit=20):
                    if not message.text:
                        continue
                    
                    content_text = message.text[:2000]
                    found_tickers = extract_tickers_aggressively(content_text, active_tickers)
                    
                    # Check if already exists (naive check by time/content)
                    check_stmt = select(NewsArticle.id).where(
                        NewsArticle.source_platform == 'telegram',
                        NewsArticle.source_handle == source_handle,
                        NewsArticle.posted_at == message.date
                    )
                    exists = await session.execute(check_stmt)
                    if exists.scalars().first():
                        continue
                        
                    article = NewsArticle(
                        source_platform='telegram',
                        source_handle=source_handle,
                        author_name=source_handle,
                        title='',
                        content=content_text,
                        url=f"https://t.me/{source_handle}/{message.id}",
                        posted_at=message.date,
                        tickers_mentioned=found_tickers if found_tickers else None
                    )
                    try:
                        session.add(article)
                        await session.commit()
                        count += 1
                    except Exception:
                        await session.rollback()
                
                if count > 0:
                    logger.info(f"Inserted {count} new messages for {source_handle}")
                    from bot.services.news import log_ingestion
                    await log_ingestion('telegram', source_handle, 'SUCCESS', f"Inserted {count} new messages.")
            except Exception as e:
                logger.error(f"Failed to poll {source_handle}: {e}")
                from bot.services.news import log_ingestion
                await log_ingestion('telegram', source_handle, 'ERROR', str(e))
        # Do not disconnect client as it's shared with streaming

async def run_telegram_backfill_check(redis: Redis = None):
    logger.info("Running Telegram backfill check for new/reactivated channels...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ContentSource).where(ContentSource.platform == 'telegram', ContentSource.is_active == True))
        active_sources = result.scalars().all()
        active_handles = [s.handle for s in active_sources]
    
    handles_to_poll = active_handles

    if handles_to_poll:
        logger.info(f"Polling latest messages for {len(handles_to_poll)} Telegram channels...")
        await backfill(handles_to_poll)

if __name__ == "__main__":
    asyncio.run(backfill())
