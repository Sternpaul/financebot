import logging
from sqlalchemy import select
from bot.db.database import get_session
from bot.db.models import ContentSource

logger = logging.getLogger(__name__)

# Must match REGION_MAPPING in SourcesManager.tsx
CORE_SOURCES = [
    'SPY', 'QQQ', 'DIA',            # US
    '^GDAXI', '^STOXX50E', '^FTSE', # EU
    '000001.SS', '^N225', '^KS11',  # Asia
    '^NSEI', '^BVSP'                # Emerging Markets
]

async def seed_core_sources():
    """Ensures that all core macro regional sources exist in the database."""
    logger.info("Checking and seeding core regional sources...")
    try:
        async with get_session() as session:
            # Get existing core yfinance handles
            stmt = select(ContentSource.handle).where(ContentSource.platform == 'yfinance')
            result = await session.execute(stmt)
            existing_handles = {row for row in result.scalars().all()}
            
            new_sources = []
            for handle in CORE_SOURCES:
                if handle not in existing_handles:
                    source = ContentSource(
                        platform='yfinance',
                        handle=handle,
                        is_active=True,  # Default to active
                        is_core=False    # Let the user delete them if they really want, or keep False to match original behavior
                    )
                    new_sources.append(source)
            
            if new_sources:
                for source in new_sources:
                    session.add(source)
                await session.commit()
                logger.info(f"Successfully seeded {len(new_sources)} new core sources.")
            else:
                logger.info("All core sources are already present.")
                
    except Exception as e:
        logger.error(f"Failed to seed core sources: {e}")
