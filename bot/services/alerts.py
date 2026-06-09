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
    Polls market data and detects custom alert conditions:
    1. BTFD (Dump > X%)
    2. Breakout (Pump > X%)
    3. Target Above (Price crossed above Y)
    4. Target Below (Price crossed below Y)
    """
    logger.info("Running technical alerts check...")
    
    async for session in get_session():
        stmt = select(Watchlist)
        result = await session.execute(stmt)
        watchlists = result.scalars().all()
        
        if not watchlists:
            logger.info("No tickers in watchlist.")
            return

        symbols = [w.ticker for w in watchlists]
        # Build mapping of ticker to custom_alerts
        alerts_map = {w.ticker: w.custom_alerts or {} for w in watchlists}
        
        quotes = await fetch_yahoo_quotes(symbols)
        
        for quote in quotes:
            symbol = quote.get("symbol")
            price = quote.get("regularMarketPrice", 0)
            change_pct = quote.get("regularMarketChangePercent", 0)
            current_volume = quote.get("regularMarketVolume", 0)
            avg_volume_10d = quote.get("averageDailyVolume10Day", 1)
            
            volume_ratio = current_volume / avg_volume_10d if avg_volume_10d else 0
            
            custom_rules = alerts_map.get(symbol, {})
            
            # Helper to check and fire alerts
            async def fire_alert(alert_type: str, threshold: float):
                # 24h Cooldown logic per alert type
                cooldown_stmt = select(TechnicalAlert).where(
                    TechnicalAlert.ticker == symbol,
                    TechnicalAlert.alert_type == alert_type,
                    TechnicalAlert.triggered_at >= func.now() - timedelta(hours=24)
                )
                cooldown_res = await session.execute(cooldown_stmt)
                if cooldown_res.scalars().first():
                    return # Already alerted today
                
                logger.info(f"🚨 {alert_type} ALERT TRIGGERED FOR {symbol}! Price: {price}, Change: {change_pct:.2f}%")
                
                new_alert = TechnicalAlert(
                    ticker=symbol,
                    alert_type=alert_type,
                    price_at_alert=price,
                    pct_change=change_pct,
                    volume_ratio=volume_ratio
                )
                session.add(new_alert)
                await session.commit()
                await session.refresh(new_alert)
                
                if redis_client:
                    payload = {
                        "alert_id": str(new_alert.id),
                        "ticker": symbol,
                        "type": alert_type,
                        "price": str(price),
                        "change_pct": str(change_pct),
                        "volume_ratio": str(volume_ratio),
                        "threshold_value": str(threshold)
                    }
                    await redis_client.xadd("alerts", payload)
                    logger.info(f"Published {alert_type} alert for {symbol} to Redis.")

            # Process BTFD (Drop > X% and volume spike)
            btfd_threshold = custom_rules.get("btfd")
            if btfd_threshold is not None:
                drop_threshold = -abs(float(btfd_threshold))
                if change_pct <= drop_threshold and current_volume > avg_volume_10d:
                    await fire_alert("BTFD", btfd_threshold)
                    
            # Process Breakout (Pump > X% and volume spike)
            breakout_threshold = custom_rules.get("breakout")
            if breakout_threshold is not None:
                pump_threshold = abs(float(breakout_threshold))
                if change_pct >= pump_threshold and current_volume > avg_volume_10d:
                    await fire_alert("BREAKOUT", breakout_threshold)
                    
            # Process Target Above
            target_above = custom_rules.get("target_above")
            if target_above is not None:
                if price >= float(target_above):
                    await fire_alert("TARGET_ABOVE", target_above)
                    
            # Process Target Below
            target_below = custom_rules.get("target_below")
            if target_below is not None:
                if price <= float(target_below):
                    await fire_alert("TARGET_BELOW", target_below)
