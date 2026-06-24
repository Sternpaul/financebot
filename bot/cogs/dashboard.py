import discord
from discord.ext import commands
from discord import app_commands
import logging
import os
from bot.ui.views import DashboardView
from bot.services.market import MarketDataService
from bot.config import get_bot_config

logger = logging.getLogger(__name__)
config = get_bot_config()

# The Discord user ID authorized to manage the bot (set via DISCORD_OWNER_ID env var)
OWNER_ID = int(os.getenv("DISCORD_OWNER_ID", "0"))

class DashboardCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.market_service = MarketDataService(
            massive_api_key=config.massive_api_key or config.polygon_api_key,
            finnhub_api_key=config.finnhub_api_key
        )

    @app_commands.command(name="setup", description="Deploy the main FinanceBot dashboard")
    async def setup(self, interaction: discord.Interaction):
        if OWNER_ID and interaction.user.id != OWNER_ID:
            await interaction.response.send_message(
                "⛔ You are not authorized to use this command.", ephemeral=True
            )
            return

        view = DashboardView(market_service=self.market_service)
        embed = discord.Embed(
            title="FinanceBot Dashboard", 
            description="Welcome to FinanceBot. Click a button below to get started.",
            color=discord.Color.brand_green()
        )
        await interaction.response.send_message(embed=embed, view=view)

async def setup(bot: commands.Bot):
    await bot.add_cog(DashboardCog(bot))

