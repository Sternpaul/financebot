import asyncio
import logging
import signal
import sys
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from redis.asyncio import Redis

from bot.config import get_worker_config
from bot.db.database import engine
from bot.telegram_client import start_telegram_streaming

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

    from bot.services.news import run_news_ingestion
    from bot.services.alerts import run_technical_alerts_check, evaluate_alert_performance
    from bot.backfill_telegram import run_telegram_backfill_check
    from bot.services.brain import run_brain_synthesis, generate_morning_report, run_daily_compaction
    from bot.db.seed import seed_core_sources
    
    # Initialize core regional sources
    await seed_core_sources()
    
    # Add jobs to scheduler
    # Technical Alerts Engine
    scheduler.add_job(run_technical_alerts_check, 'interval', minutes=config.cron_alerts_interval_minutes, args=[redis])
    
    # Alert Performance Evaluation (Runs daily)
    scheduler.add_job(evaluate_alert_performance, 'cron', hour=1, minute=0)
    
    # News Ingestion Engine
    scheduler.add_job(run_news_ingestion, 'interval', minutes=config.cron_news_interval_minutes)
    
    # Telegram Backup Sync
    scheduler.add_job(run_telegram_backfill_check, 'interval', hours=config.cron_telegram_backup_hours, args=[redis])
    
    # New Phase 5 jobs
    scheduler.add_job(run_brain_synthesis, 'interval', minutes=config.cron_brain_synthesis_minutes)
    
    # Daily Compaction
    scheduler.add_job(run_daily_compaction, 'interval', hours=config.cron_brain_compaction_hours)
    
    # Morning report scheduling
    report_time = config.morning_report_time.split(":")
    scheduler.add_job(generate_morning_report, 'cron', hour=int(report_time[0]), minute=int(report_time[1]))
    
    # Run once immediately on startup so we don't have to wait 1 minute for the first data
    asyncio.create_task(run_news_ingestion())
    asyncio.create_task(run_brain_synthesis())
    
    # Start Telegram Telethon client for real-time WebSockets
    asyncio.create_task(start_telegram_streaming())
    
    # Run an immediate backfill after a short delay to let the streaming client connect first
    async def delayed_backfill():
        await asyncio.sleep(10)  # Give the streaming client time to connect
        logger.info("Running startup Telegram backfill...")
        await run_telegram_backfill_check(redis)
    asyncio.create_task(delayed_backfill())
    
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
