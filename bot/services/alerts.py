import asyncio
import logging
from typing import List
import aiohttp
from datetime import timedelta
from sqlalchemy import select, func

from bot.db.database import get_session
from bot.db.models import Watchlist, TechnicalAlert
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

async def fetch_yahoo_quotes(symbols: List[str]) -> list:
    if not symbols:
        return []
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={','.join(symbols)}"
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("quoteResponse", {}).get("result", [])
                else:
                    logger.error(f"Yahoo API error: {resp.status}")
        except Exception as e:
            logger.error(f"Failed to fetch quotes: {e}")
    return []

async def run_technical_alerts_check(redis_client: Redis):
    """
    Polls market data and detects BTFD conditions:
    1. Stock dropped beyond threshold.
    2. Volume is spiking > 10-day average.
    """
    logger.info("Running technical alerts (BTFD) check...")
    
    async for session in get_session():
        # 1. Fetch active watchlist tickers
        stmt = select(Watchlist)
        result = await session.execute(stmt)
        watchlists = result.scalars().all()
        
        if not watchlists:
            logger.info("No tickers in watchlist.")
            return

        # Map thresholds
        thresholds = {w.ticker: w.alert_price_change or 5.0 for w in watchlists}
        symbols = list(thresholds.keys())
        
        # 2. Fetch live quotes
        quotes = await fetch_yahoo_quotes(symbols)
        
        for quote in quotes:
            symbol = quote.get("symbol")
            price = quote.get("regularMarketPrice", 0)
            change_pct = quote.get("regularMarketChangePercent", 0)
            current_volume = quote.get("regularMarketVolume", 0)
            avg_volume_10d = quote.get("averageDailyVolume10Day", 1)  # prevent div/0
            
            drop_threshold = -abs(thresholds.get(symbol, 5.0))
            
            if change_pct <= drop_threshold and current_volume > avg_volume_10d:
                volume_ratio = current_volume / avg_volume_10d
                
                # Cooldown: Don't spam if alerted in the last 24h
                cooldown_stmt = select(TechnicalAlert).where(
                    TechnicalAlert.ticker == symbol,
                    TechnicalAlert.triggered_at >= func.now() - timedelta(hours=24)
                )
                cooldown_res = await session.execute(cooldown_stmt)
                if cooldown_res.scalars().first():
                    continue
                    
                logger.info(f"🚨 BTFD ALERT TRIGGERED FOR {symbol}! Dropped {change_pct:.2f}% with {volume_ratio:.1f}x volume.")
                
                # 3. Save to database
                new_alert = TechnicalAlert(
                    ticker=symbol,
                    alert_type="BTFD",
                    price_at_alert=price,
                    pct_change=change_pct,
                    volume_ratio=volume_ratio
                )
                session.add(new_alert)
                await session.commit()
                await session.refresh(new_alert)
                
                # 4. Push to Redis Stream
                if redis_client:
                    payload = {
                        "alert_id": str(new_alert.id),
                        "ticker": symbol,
                        "type": "BTFD",
                        "price": str(price),
                        "change_pct": str(change_pct),
                        "volume_ratio": str(volume_ratio)
                    }
                    await redis_client.xadd("alerts", payload)
                    logger.info(f"Published alert for {symbol} to Redis.")
