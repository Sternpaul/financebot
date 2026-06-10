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

import os

# API Provider Rotation state
current_provider_idx = 0

async def fetch_quotes_with_rotation(symbols: List[str]) -> list:
    global current_provider_idx
    if not symbols:
        return []
        
    providers = ["polygon", "finnhub", "yahoo"]
    provider = providers[current_provider_idx % len(providers)]
    current_provider_idx += 1
    
    quotes = []
    
    async with aiohttp.ClientSession() as session:
        if provider == "polygon":
            api_key = os.getenv("POLYGON_API_KEY", "")
            if api_key and api_key != "your_polygon_key":
                try:
                    url = f"https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers={','.join(symbols)}&apiKey={api_key}"
                    async with session.get(url, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            for ticker_data in data.get("tickers", []):
                                quotes.append({
                                    "symbol": ticker_data.get("ticker"),
                                    "regularMarketPrice": ticker_data.get("day", {}).get("c", 0),
                                    "regularMarketChangePercent": ticker_data.get("todaysChangePerc", 0),
                                    "regularMarketVolume": ticker_data.get("day", {}).get("v", 0),
                                    "averageDailyVolume10Day": ticker_data.get("day", {}).get("v", 0) # approximation
                                })
                            return quotes
                        else:
                            logger.error(f"Polygon API Error: {resp.status}. Falling back.")
                except Exception as e:
                    logger.error(f"Polygon Fetch Error: {e}")
            # Fallthrough if Polygon fails or no key
            provider = "finnhub"
            
        if provider == "finnhub":
            api_key = os.getenv("FINNHUB_API_KEY", "")
            if api_key and api_key != "your_finnhub_key":
                try:
                    for symbol in symbols:
                        url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={api_key}"
                        async with session.get(url, timeout=10) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                if "c" in data and data["c"] != 0:
                                    quotes.append({
                                        "symbol": symbol,
                                        "regularMarketPrice": data.get("c", 0),
                                        "regularMarketChangePercent": data.get("dp", 0),
                                        "regularMarketVolume": 0, # Finnhub quote doesn't provide real-time volume in this endpoint
                                        "averageDailyVolume10Day": 1
                                    })
                            else:
                                logger.error(f"Finnhub API Error: {resp.status} for {symbol}. Falling back.")
                                provider = "yahoo"
                                break
                    if provider == "finnhub": # Success
                        return quotes
                except Exception as e:
                    logger.error(f"Finnhub Fetch Error: {e}")
            # Fallthrough if Finnhub fails
            provider = "yahoo"
            
        if provider == "yahoo":
            try:
                url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={','.join(symbols)}"
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                async with session.get(url, headers=headers, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("quoteResponse", {}).get("result", [])
                    else:
                        logger.error(f"Yahoo API error: {resp.status}")
            except Exception as e:
                logger.error(f"Failed to fetch quotes from Yahoo: {e}")
                
    return quotes

async def run_technical_alerts_check(redis_client: Redis):
    """
    Polls market data and detects custom alert conditions:
    1. PERCENTAGE_CHANGE (Gain > X% or Loss < -X%)
    2. PRICE_TARGET (Crossed above/below configured Y)
    * With optional volume spike requirements.
    """
    logger.info("Running technical alerts check...")
    
    async with get_session() as session:
        stmt = select(Watchlist)
        result = await session.execute(stmt)
        watchlists = result.scalars().all()
        
        if not watchlists:
            logger.info("No tickers in watchlist.")
            return

        symbols = [w.ticker for w in watchlists]
        alerts_map = {w.ticker: w.custom_alerts or {} for w in watchlists}
        
        quotes = await fetch_quotes_with_rotation(symbols)
        
        for quote in quotes:
            symbol = quote.get("symbol")
            price = quote.get("regularMarketPrice", 0)
            change_pct = quote.get("regularMarketChangePercent", 0)
            current_volume = quote.get("regularMarketVolume", 0)
            avg_volume_10d = quote.get("averageDailyVolume10Day", 1)
            
            volume_ratio = current_volume / avg_volume_10d if avg_volume_10d else 0
            
            custom_rules = alerts_map.get(symbol, {})
            vol_spike_req = custom_rules.get("vol_spike")
            
            # Check volume modifier if enabled
            if vol_spike_req is not None:
                if volume_ratio < float(vol_spike_req):
                    continue # Volume requirement not met
            
            # Helper to check and fire alerts
            async def fire_alert(alert_type: str, threshold: float):
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

            # Process Percentage Change
            pct_change = custom_rules.get("pct_change")
            if pct_change is not None:
                if change_pct >= float(pct_change):
                    await fire_alert("PERCENTAGE_UP", pct_change)
                elif change_pct <= -abs(float(pct_change)):
                    await fire_alert("PERCENTAGE_DOWN", pct_change)
                    
            # Process Price Target
            price_target = custom_rules.get("price_target")
            price_direction = custom_rules.get("price_direction", "UP")
            
            if price_target is not None:
                if price_direction == "UP" and price >= float(price_target):
                    await fire_alert("TARGET_ABOVE", price_target)
                elif price_direction == "DOWN" and price <= float(price_target):
                    await fire_alert("TARGET_BELOW", price_target)
