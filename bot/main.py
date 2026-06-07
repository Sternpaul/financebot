import asyncio
import logging
import signal
import sys
import discord
from discord.ext import commands
from redis.asyncio import Redis

from bot.config import get_bot_config

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

config = get_bot_config()

# Discord bot setup
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Redis client for streams
redis: Redis = None

@bot.event
async def on_ready():
    logger.info(f"Bot logged in as {bot.user}")
    # Here you would register persistent UI Views
    # bot.add_view(MyPersistentView())

    # Start the Redis Stream consumer loop in the background
    bot.loop.create_task(consume_redis_streams())

async def consume_redis_streams():
    """Consume alerts and reports from worker."""
    global redis
    try:
        # Create consumer group if it doesn't exist
        try:
            await redis.xgroup_create("alerts", "bot_group", id="0", mkstream=True)
            await redis.xgroup_create("reports", "bot_group", id="0", mkstream=True)
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                logger.error(f"Error creating Redis groups: {e}")

        logger.info("Started Redis Streams consumer.")
        while not bot.is_closed():
            # Block for 1 second, read from alerts and reports
            streams = {"alerts": ">", "reports": ">"}
            response = await redis.xreadgroup("bot_group", "bot_consumer", streams, count=10, block=1000)
            
            if response:
                for stream_name, messages in response:
                    stream = stream_name.decode('utf-8')
                    for message_id, data in messages:
                        logger.info(f"Received from {stream}: {data}")
                        # Example: Send to Discord channel
                        channel = bot.get_channel(config.discord_channel_id)
                        if channel:
                            # Process data depending on stream
                            # ...
                            await channel.send(f"**New {stream} event:** {data}")
                        
                        # Acknowledge message
                        await redis.xack(stream_name, "bot_group", message_id)
    except asyncio.CancelledError:
        logger.info("Redis consumer task cancelled.")
    except Exception as e:
        logger.error(f"Redis consumer error: {e}")

async def shutdown(sig=None):
    """Graceful shutdown"""
    if sig:
        logger.info(f"Received exit signal {sig.name}...")
    
    if redis:
        await redis.aclose()
    
    if not bot.is_closed():
        await bot.close()
        
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

    async with bot:
        await bot.start(config.discord_token)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
