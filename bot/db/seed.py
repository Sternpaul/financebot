import logging
from sqlalchemy import select
from bot.db.database import get_session
from bot.db.models import ContentSource

logger = logging.getLogger(__name__)

# Includes regional indices and specific alpha sources
CORE_SOURCES = [
    {'platform': 'yfinance', 'handle': 'SPY', 'region': 'US', 'display_name': 'S&P 500', 'is_core': True},
    {'platform': 'yfinance', 'handle': 'QQQ', 'region': 'US', 'display_name': 'NASDAQ', 'is_core': True},
    {'platform': 'yfinance', 'handle': 'DIA', 'region': 'US', 'display_name': 'Dow Jones', 'is_core': True},
    {'platform': 'yfinance', 'handle': '^GDAXI', 'region': 'EU', 'display_name': 'DAX', 'is_core': True},
    {'platform': 'yfinance', 'handle': '^STOXX50E', 'region': 'EU', 'display_name': 'Euro Stoxx 50', 'is_core': True},
    {'platform': 'yfinance', 'handle': '^FTSE', 'region': 'EU', 'display_name': 'FTSE 100', 'is_core': True},
    {'platform': 'yfinance', 'handle': '000001.SS', 'region': 'Asia', 'display_name': 'SSE Composite', 'is_core': True},
    {'platform': 'yfinance', 'handle': '^N225', 'region': 'Asia', 'display_name': 'Nikkei 225', 'is_core': True},
    {'platform': 'yfinance', 'handle': '^KS11', 'region': 'Asia', 'display_name': 'KOSPI', 'is_core': True},
    {'platform': 'yfinance', 'handle': '^NSEI', 'region': 'Emerging Markets', 'display_name': 'Nifty 50', 'is_core': True},
    {'platform': 'yfinance', 'handle': '^BVSP', 'region': 'Emerging Markets', 'display_name': 'Bovespa', 'is_core': True},
    {'platform': 'yfinance', 'handle': 'GeneralMarket', 'region': 'Global', 'display_name': 'General Market', 'is_core': True},
    {'platform': 'telegram', 'handle': 'whale_alert', 'region': None, 'display_name': 'Whale Alert', 'is_core': True},
    {'platform': 'telegram', 'handle': 'cointelegraph', 'region': None, 'display_name': 'Cointelegraph', 'is_core': True},
    {'platform': 'telegram', 'handle': 'infinityhedge', 'region': None, 'display_name': 'Infinity Hedge', 'is_core': True},
    {'platform': 'telegram', 'handle': 'RunnerXBT_Insights', 'region': None, 'display_name': 'RunnerXBT', 'is_core': True},
    {'platform': 'telegram', 'handle': 'WalterBloomberg', 'region': None, 'display_name': 'Walter Bloomberg', 'is_core': True},
    {'platform': 'substack', 'handle': 'cryptohayes', 'region': None, 'display_name': 'Arthur Hayes', 'is_core': True},
    {'platform': 'substack', 'handle': 'thebearcave', 'region': None, 'display_name': 'The Bear Cave', 'is_core': True}
]

async def seed_core_sources():
    """Ensures that all core macro regional sources exist in the database."""
    logger.info("Checking and seeding core regional sources...")
    try:
        async with get_session() as session:
            # Get existing core handles
            stmt = select(ContentSource)
            result = await session.execute(stmt)
            existing_sources = {f"{row.platform}:{row.handle}": row for row in result.scalars().all()}
            
            added_count = 0
            updated_count = 0
            
            for s in CORE_SOURCES:
                key = f"{s['platform']}:{s['handle']}"
                if key not in existing_sources:
                    source = ContentSource(
                        platform=s['platform'],
                        handle=s['handle'],
                        is_active=True,  # Default to active
                        is_core=s['is_core'],
                        region=s['region'],
                        display_name=s['display_name']
                    )
                    session.add(source)
                    added_count += 1
                else:
                    # Update existing sources if they lack region/display_name
                    existing = existing_sources[key]
                    needs_update = False
                    if existing.region != s['region']:
                        existing.region = s['region']
                        needs_update = True
                    if existing.display_name != s['display_name']:
                        existing.display_name = s['display_name']
                        needs_update = True
                    
                    if needs_update:
                        updated_count += 1
            
            if added_count > 0 or updated_count > 0:
                await session.commit()
                logger.info(f"Successfully seeded {added_count} new core sources and updated {updated_count} existing sources.")
            else:
                logger.info("All core sources are already present and up to date.")
                
    except Exception as e:
        logger.error(f"Failed to seed core sources: {e}")
