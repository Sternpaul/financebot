import asyncio
import os
import sys

# Add parent directory to path so we can import bot
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import get_worker_config
from bot.services.market import MarketDataService
from bot.services.social import SocialScraperService

async def main():
    config = get_worker_config()
    print("Testing MarketDataService...")
    market = MarketDataService(
        massive_api_key=config.massive_api_key or config.polygon_api_key,
        finnhub_api_key=config.finnhub_api_key
    )
    
    print("\n-- Massive.com (Polygon) Quote for AAPL --")
    massive_quote = await market.get_stock_quote_massive("AAPL")
    print(massive_quote)

    print("\n-- Finnhub Quote for AAPL --")
    finnhub_quote = await market.get_stock_quote_finnhub("AAPL")
    print(finnhub_quote)

    print("\n-- Hyperliquid Perp Info for BTC --")
    hl_info = await market.get_crypto_perp_hyperliquid("BTC")
    print(hl_info)

    print("\nTesting SocialScraperService...")
    social = SocialScraperService(rsshub_url=config.rsshub_url)
    
    print("\n-- RSSHub Twitter Feed for Elon Musk (elonmusk) --")
    tweets = await social.fetch_twitter_feed("elonmusk")
    for t in tweets[:2]:
        print(f"[Sentiment: {t['sentiment']}] {t['posted_at']}: {t['content'][:100]}...")

if __name__ == "__main__":
    asyncio.run(main())
