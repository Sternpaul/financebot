import logging
import aiohttp
from typing import Optional
from bot.config import get_worker_config

logger = logging.getLogger(__name__)

async def compress_with_scaledown(text: str) -> str:
    """
    Compresses text using the ScaleDown API to save tokens.
    Falls back to original text if ScaleDown fails or is not configured.
    """
    config = get_worker_config()
    if not config.scaledown_api_key:
        return text

    # Truncate text just in case to a reasonable safe limit before compressing to avoid massive payloads
    # Say, 100k chars ~ 20k tokens
    safe_text = text[:100000]

    try:
        # According to docs, the payload is something like:
        # POST https://api.scaledown.ai/v1/compress
        # Headers: Authorization: Bearer <key>
        # Body: {"text": "...", "compression_ratio": 0.5} or similar.
        # Since we don't have the exact API schema, we will try the official scaledown python API if installed
        # or use HTTP. Let's assume standard HTTP endpoint:
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "text": safe_text
            }
            headers = {
                "Authorization": f"Bearer {config.scaledown_api_key}",
                "Content-Type": "application/json"
            }
            # Many APIs use /v1/compress.
            async with session.post("https://api.scaledown.ai/v1/compress", json=payload, headers=headers, timeout=15) as response:
                if response.status == 200:
                    data = await response.json()
                    # It might return compressed_text or result
                    compressed = data.get("compressed_text", data.get("result", ""))
                    if compressed:
                        logger.info(f"ScaleDown successfully compressed {len(safe_text)} chars to {len(compressed)} chars.")
                        return compressed
                else:
                    err_text = await response.text()
                    logger.warning(f"ScaleDown API failed: {response.status} - {err_text}. Falling back to raw text.")
    except Exception as e:
        logger.warning(f"ScaleDown compression failed: {e}. Falling back to raw text.")
        
    return text

async def generate_completion(prompt: str, system_prompt: str = "You are a helpful financial AI assistant.") -> Optional[str]:
    """
    Generate a chat completion using OpenRouter (or configured LLM provider).
    """
    config = get_worker_config()
    
    if config.llm_provider != "openrouter":
        logger.error(f"Unsupported LLM provider: {config.llm_provider}")
        return None

    if not config.llm_api_key:
        logger.error("No LLM API key configured.")
        return None

    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": config.llm_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
            }
            headers = {
                "Authorization": f"Bearer {config.llm_api_key}",
                "HTTP-Referer": "https://financebot.local", # OpenRouter requires referer
                "X-Title": "FinanceBot",
                "Content-Type": "application/json"
            }
            
            async with session.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers, timeout=60) as response:
                if response.status == 200:
                    data = await response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        return data["choices"][0]["message"]["content"]
                else:
                    err_text = await response.text()
                    logger.error(f"OpenRouter API failed: {response.status} - {err_text}")
    except Exception as e:
        logger.error(f"Error calling OpenRouter: {e}")
        
    return None
