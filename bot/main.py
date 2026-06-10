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

class FinanceBot(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    async def setup_hook(self) -> None:
        # Load cogs
        await self.load_extension("bot.cogs.dashboard")
        
        # Instantiate services for the persistent view
        from bot.services.market import MarketDataService
        from bot.ui.views import DashboardView
        market_service = MarketDataService(
            massive_api_key=config.massive_api_key or config.polygon_api_key,
            finnhub_api_key=config.finnhub_api_key
        )
        self.add_view(DashboardView(market_service=market_service))
        
        # Sync slash commands
        try:
            if config.discord_guild_id:
                guild = discord.Object(id=config.discord_guild_id)
                self.tree.copy_global_to(guild=guild)
                await self.tree.sync(guild=guild)
                logger.info(f"Synced commands to guild {config.discord_guild_id}")
            else:
                await self.tree.sync()
                logger.info("Synced commands globally")
        except discord.errors.Forbidden:
            logger.error("Failed to sync commands: 403 Forbidden. Make sure you invited the bot with the 'applications.commands' scope!")
        except Exception as e:
            logger.error(f"Failed to sync commands: {e}")

# Discord bot setup
intents = discord.Intents.default()
intents.message_content = True
bot = FinanceBot(command_prefix="!", intents=intents)

# Redis client for streams
redis: Redis = None

@bot.event
async def on_ready():
    logger.info(f"Bot logged in as {bot.user}")

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
                        channel = bot.get_channel(config.discord_channel_id)
                        
                        if channel and stream == "alerts":
                            try:
                                alert_data = {k.decode('utf-8'): v.decode('utf-8') for k, v in data.items()}
                                ticker = alert_data.get("ticker", "UNKNOWN")
                                alert_type = alert_data.get("type", "ALERT")
                                price = float(alert_data.get("price", 0))
                                change_pct = float(alert_data.get("change_pct", 0))
                                
                                is_bearish = "BTFD" in alert_type or "TARGET_BELOW" in alert_type
                                color = discord.Color.red() if is_bearish else discord.Color.green()
                                
                                embed = discord.Embed(
                                    title=f"🚨 {alert_type}: {ticker}",
                                    description=f"**{ticker}** has triggered your {alert_type} alert rule.",
                                    color=color
                                )
                                embed.add_field(name="Current Price", value=f"${price:,.2f}", inline=True)
                                embed.add_field(name="Daily Change", value=f"{change_pct:+.2f}%", inline=True)
                                
                                if "volume_ratio" in alert_data:
                                    embed.add_field(name="Volume Spike", value=f"{float(alert_data['volume_ratio']):.1f}x Avg", inline=True)
                                
                                from bot.ui.views import AlertView
                                view = AlertView(alert_id=alert_data.get("alert_id", "0"))
                                
                                await channel.send(embed=embed, view=view)
                            except Exception as e:
                                logger.error(f"Error parsing alert payload: {e}")
                                
                        elif channel and stream == "reports":
                            try:
                                report_data = {k.decode('utf-8'): v.decode('utf-8') for k, v in data.items()}
                                title = report_data.get("title", "Report")
                                content = report_data.get("content", "")
                                
                                # Discord embeds have a 4096 character limit for descriptions
                                if len(content) > 4000:
                                    content = content[:4000] + "..."
                                
                                embed = discord.Embed(
                                    title=title,
                                    description=content,
                                    color=discord.Color.blue()
                                )
                                await channel.send(embed=embed)
                            except Exception as e:
                                logger.error(f"Error parsing report payload: {e}")
                        
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
