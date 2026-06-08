import aiohttp
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class MarketDataService:
    """
    Service for interacting with financial APIs.
    """
    def __init__(self, massive_api_key: str = None, finnhub_api_key: str = None):
        # We prefer massive_api_key but fallback to polygon_api_key if the user used the old name in env
        self.massive_api_key = massive_api_key
        self.finnhub_api_key = finnhub_api_key
        
        # Massive.com (formerly Polygon.io)
        self.massive_base_url = "https://api.massive.com"
        self.polygon_base_url = "https://api.polygon.io"
        
        self.finnhub_base_url = "https://finnhub.io/api/v1"
        self.hyperliquid_base_url = "https://api.hyperliquid.xyz"

    async def _get_massive_url(self, endpoint: str) -> str:
        """Helper to try massive.com first, fallback to polygon.io if massive DNS isn't fully propagated"""
        return f"{self.massive_base_url}{endpoint}"

    async def get_stock_quote_massive(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Fetch previous day close/quote from Massive (Polygon)."""
        if not self.massive_api_key:
            logger.error("No Massive/Polygon API key configured.")
            return None
            
        endpoint = f"/v2/aggs/ticker/{ticker.upper()}/prev"
        url = await self._get_massive_url(endpoint)
        params = {"apiKey": self.massive_api_key}
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("results") and len(data["results"]) > 0:
                            return data["results"][0]
                    else:
                        # Fallback to polygon.io if massive.com is unavailable
                        url = f"{self.polygon_base_url}{endpoint}"
                        async with session.get(url, params=params) as fb_resp:
                            if fb_resp.status == 200:
                                data = await fb_resp.json()
                                if data.get("results") and len(data["results"]) > 0:
                                    return data["results"][0]
                            else:
                                logger.error(f"Massive API error: {fb_resp.status} - {await fb_resp.text()}")
            except Exception as e:
                logger.error(f"Exception calling Massive API: {e}")
        return None

    async def get_stock_quote_finnhub(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Fetch real-time quote from Finnhub."""
        if not self.finnhub_api_key:
            logger.error("No Finnhub API key configured.")
            return None
            
        url = f"{self.finnhub_base_url}/quote"
        params = {"symbol": ticker.upper(), "token": self.finnhub_api_key}
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    else:
                        logger.error(f"Finnhub API error: {resp.status} - {await resp.text()}")
            except Exception as e:
                logger.error(f"Exception calling Finnhub API: {e}")
        return None

    async def get_crypto_perp_hyperliquid(self, coin: str) -> Optional[Dict[str, Any]]:
        """Fetch crypto perp info from Hyperliquid."""
        url = f"{self.hyperliquid_base_url}/info"
        headers = {"Content-Type": "application/json"}
        # MetaAndAssetCtxs gives all asset contexts including mark px
        payload = {"type": "metaAndAssetCtxs"}
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(url, headers=headers, json=payload) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        # data is typically a list: [universe_info, asset_ctxs]
                        if len(data) >= 2:
                            universe = data[0].get("universe", [])
                            ctxs = data[1]
                            for idx, asset in enumerate(universe):
                                if asset.get("name") == coin.upper():
                                    return ctxs[idx]
                    else:
                        logger.error(f"Hyperliquid API error: {resp.status}")
            except Exception as e:
                logger.error(f"Exception calling Hyperliquid API: {e}")
        return None
