import discord
from discord.ui import View, Button
import logging
from bot.services.market import MarketDataService

logger = logging.getLogger(__name__)

class DashboardView(View):
    def __init__(self, market_service: MarketDataService):
        super().__init__(timeout=None) # Persistent view
        self.market_service = market_service

    @discord.ui.button(label="Morning Report", style=discord.ButtonStyle.primary, custom_id="dashboard_morning_report")
    async def morning_report_btn(self, interaction: discord.Interaction, button: Button):
        await interaction.response.defer(ephemeral=True)
        # Placeholder for LLM generated report
        await interaction.followup.send("Morning Report coming soon (requires LLM pipeline integration).", ephemeral=True)

    @discord.ui.button(label="Portfolio (AAPL)", style=discord.ButtonStyle.success, custom_id="dashboard_portfolio")
    async def portfolio_btn(self, interaction: discord.Interaction, button: Button):
        await interaction.response.defer(ephemeral=True)
        try:
            quote = await self.market_service.get_stock_quote_finnhub("AAPL")
            if quote:
                c_price = quote.get("c")
                d_price = quote.get("d")
                dp_percent = quote.get("dp")
                msg = f"**AAPL Portfolio Check:**\nCurrent Price: ${c_price}\nChange: ${d_price} ({dp_percent}%)"
            else:
                msg = "Failed to fetch portfolio data. Check your Finnhub API Key."
            await interaction.followup.send(msg, ephemeral=True)
        except Exception as e:
            logger.error(f"Portfolio button error: {e}")
            await interaction.followup.send("An error occurred fetching portfolio.", ephemeral=True)

    @discord.ui.button(label="Alerts Check", style=discord.ButtonStyle.danger, custom_id="dashboard_alerts")
    async def alerts_btn(self, interaction: discord.Interaction, button: Button):
        await interaction.response.defer(ephemeral=True)
        await interaction.followup.send("No new BTFD alerts currently triggered.", ephemeral=True)
