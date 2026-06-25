import asyncio
import logging
import signal
import sys
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from bot.config import get_worker_config
from bot.db.database import AsyncSessionLocal, engine
from bot.db.models import PodcastEpisode, PodcastTranscript, PodcastTrade, IngestionLog
from bot.services.podcast import get_transcript, extract_trades

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

config = get_worker_config()
scheduler = AsyncIOScheduler(
    timezone=config.timezone,
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 60,
    }
)

async def process_pending_transcripts():
    """Fetches transcripts for any unprocessed podcast episodes in the database"""
    logger.info("Local Worker: Checking for pending transcripts...")
    
    try:
        async with AsyncSessionLocal() as session:
            stmt = select(PodcastEpisode).where(PodcastEpisode.is_processed == False)
            result = await session.execute(stmt)
            pending_episodes = result.scalars().all()
            
            if not pending_episodes:
                logger.info("No pending episodes found.")
                return
                
            for ep in pending_episodes:
                logger.info(f"Processing transcript for {ep.title} ({ep.video_id})...")
                
                # 1. Download Transcript using local residential IP
                transcript = await get_transcript(ep.video_id)
                if not transcript:
                    logger.warning(f"Failed to get transcript for {ep.video_id}. Will try again next run.")
                    # We don't mark it processed so it can retry tomorrow
                    continue
                    
                # 2. Save transcript text
                transcript_record = PodcastTranscript(
                    video_id=ep.video_id,
                    transcript_text=transcript
                )
                session.add(transcript_record)
                
                # 3. Extract Trades via AI
                logger.info(f"Extracting trades for {ep.video_id} using AI...")
                trades_json = await extract_trades(transcript)
                
                for trade_data in trades_json:
                    if not trade_data.get("ticker") or not trade_data.get("trade_type"):
                        continue
                        
                    trade = PodcastTrade(
                        episode_id=ep.id,
                        ticker=trade_data["ticker"].upper(),
                        trade_type=trade_data["trade_type"].upper(),
                        thesis=trade_data.get("thesis", ""),
                        speaker=trade_data.get("speaker"),
                        quote=trade_data.get("quote")
                    )
                    session.add(trade)
                    
                ep.is_processed = True
                
                session.add(IngestionLog(
                    source_platform="youtube_podcast_local",
                    source_handle=ep.show_name,
                    status="SUCCESS",
                    message=f"Local worker processed episode {ep.video_id} and found {len(trades_json)} trades."
                ))
                
                await session.commit()
                logger.info(f"Successfully processed {ep.video_id} and found {len(trades_json)} trades.")
                
    except Exception as e:
        logger.error(f"Local worker failed: {e}", exc_info=True)

async def shutdown(sig=None):
    """Graceful shutdown"""
    if sig:
        logger.info(f"Received exit signal {sig.name}...")
    scheduler.shutdown(wait=False)
    await engine.dispose()
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]
    await asyncio.gather(*tasks, return_exceptions=True)
    sys.exit(0)

async def main():
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(shutdown(s)))

    # Run once a day at 02:00 AM
    scheduler.add_job(process_pending_transcripts, 'cron', hour=2, minute=0)
    
    # Run once immediately on startup
    asyncio.create_task(process_pending_transcripts())
    
    scheduler.start()
    logger.info("Local Debian Worker started successfully. Waking up once a day.")
    
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
