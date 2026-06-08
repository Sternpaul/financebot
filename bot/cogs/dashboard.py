import discord
from discord.ext import commands
from discord import app_commands
import logging
from bot.ui.views import DashboardView
from bot.services.market import MarketDataService
from bot.config import get_bot_config

logger = logging.getLogger(__name__)
config = get_bot_config()

class DashboardCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.market_service = MarketDataService(
            massive_api_key=config.massive_api_key or config.polygon_api_key,
            finnhub_api_key=config.finnhub_api_key
        )

    @app_commands.command(name="setup", description="Deploy the main FinanceBot dashboard")
    async def setup(self, interaction: discord.Interaction):
        view = DashboardView(market_service=self.market_service)
        embed = discord.Embed(
            title="FinanceBot Dashboard", 
            description="Welcome to FinanceBot. Click a button below to get started.",
            color=discord.Color.brand_green()
        )
        await interaction.response.send_message(embed=embed, view=view)

async def setup(bot: commands.Bot):
    await bot.add_cog(DashboardCog(bot))
