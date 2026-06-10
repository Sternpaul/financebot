import asyncio
import logging
from datetime import datetime, timezone
from telethon import TelegramClient
from sqlalchemy import select

from bot.config import settings
from bot.db.database import AsyncSessionLocal
from bot.db.models import ContentSource, NewsArticle
from bot.services.news import extract_tickers_aggressively, get_active_tickers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def backfill():
    client = TelegramClient(
        'sessions/financebot', 
        settings.telegram_api_id, 
        settings.telegram_api_hash
    )
    
    await client.connect()
    if not await client.is_user_authorized():
        logger.error("Session is not authorized. Please log in using login_telegram.py first.")
        return
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ContentSource).where(ContentSource.platform == 'telegram', ContentSource.is_active == True))
        sources = result.scalars().all()
        
        active_tickers = await get_active_tickers()
        
        for source in sources:
            logger.info(f"Backfilling {source.handle}...")
            try:
                # get entity
                entity = await client.get_entity(source.handle)
                count = 0
                async for message in client.iter_messages(entity, limit=20):
                    if not message.text:
                        continue
                    
                    content_text = message.text[:2000]
                    found_tickers = extract_tickers_aggressively(content_text, active_tickers)
                    
                    # Check if already exists (naive check by time/content)
                    check_stmt = select(NewsArticle.id).where(
                        NewsArticle.source_platform == 'telegram',
                        NewsArticle.source_handle == source.handle,
                        NewsArticle.posted_at == message.date
                    )
                    exists = await session.execute(check_stmt)
                    if exists.scalars().first():
                        continue
                        
                    article = NewsArticle(
                        source_platform='telegram',
                        source_handle=source.handle,
                        author_name=source.handle,
                        title='',
                        content=content_text,
                        url=f"https://t.me/{source.handle}/{message.id}",
                        posted_at=message.date,
                        tickers_mentioned=found_tickers if found_tickers else None
                    )
                    session.add(article)
                    count += 1
                
                await session.commit()
                logger.info(f"Inserted {count} new messages for {source.handle}")
            except Exception as e:
                logger.error(f"Failed to backfill {source.handle}: {e}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(backfill())
