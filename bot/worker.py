import asyncio
import logging
import signal
import sys
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from redis.asyncio import Redis

from bot.config import get_worker_config
from bot.db.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

config = get_worker_config()
redis: Redis = None
scheduler = AsyncIOScheduler(timezone=config.timezone)

async def run_market_check():
    """Example scheduled job."""
    logger.info("Running market check...")
    if redis:
        # Produce to Redis Stream
        await redis.xadd(
            "alerts",
            {"ticker": "BTC", "type": "info", "message": "Market check completed."}
        )

async def send_morning_report():
    """Example morning report job."""
    logger.info("Generating morning report...")
    if redis:
        await redis.xadd(
            "reports",
            {"date": "2026-06-07", "content": "The market is looking great today."}
        )

async def shutdown(sig=None):
    """Graceful shutdown"""
    if sig:
        logger.info(f"Received exit signal {sig.name}...")
    
    scheduler.shutdown(wait=False)
    
    if redis:
        await redis.aclose()
        
    await engine.dispose()
        
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]
    await asyncio.gather(*tasks, return_exceptions=True)
    sys.exit(0)

async def main():
    global redis
    redis = Redis.from_url(config.redis_url)

    # Setup signal handlers
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(shutdown(s)))

    # Add jobs to scheduler
    # Run market check every 15 minutes during market hours
    # scheduler.add_job(run_market_check, 'cron', day_of_week='mon-fri', hour='9-17', minute='*/15')
    
    # For testing, run every minute
    # scheduler.add_job(run_market_check, 'interval', minutes=1)
    
    # Morning report
    # scheduler.add_job(send_morning_report, 'cron', day_of_week='mon-fri', hour='07', minute='30')

    scheduler.start()
    logger.info("Worker started. Press Ctrl+C to exit.")
    
    # Keep the event loop running
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
