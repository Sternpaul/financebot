import logging
import aiohttp
from typing import Optional
from bot.config import get_worker_config

logger = logging.getLogger(__name__)

async def compress_with_scaledown(context: str, prompt: str) -> str:
    """
    Compresses context and prompt using the ScaleDown API.
    Falls back to combining them directly if ScaleDown fails.
    """
    config = get_worker_config()
    fallback_prompt = f"{prompt}\n\nContext:\n{context}"
    
    if not config.scaledown_api_key:
        return fallback_prompt

    # Truncate context just in case to a reasonable safe limit before compressing to avoid massive payloads
    safe_context = context[:100000]

    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "context": safe_context,
                "prompt": prompt,
                "scaledown": {
                    "rate": "auto"
                }
            }
            headers = {
                "x-api-key": config.scaledown_api_key,
                "Content-Type": "application/json"
            }
            async with session.post("https://api.scaledown.xyz/compress/raw/", json=payload, headers=headers, timeout=15) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("successful"):
                        compressed = data.get("compressed_prompt", "")
                        if compressed:
                            logger.info(f"ScaleDown success: {data.get('original_prompt_tokens')} -> {data.get('compressed_prompt_tokens')} tokens.")
                            return compressed
                else:
                    err_text = await response.text()
                    logger.warning(f"ScaleDown API failed: {response.status} - {err_text}. Falling back.")
    except Exception as e:
        logger.warning(f"ScaleDown compression failed: {e}. Falling back.")
        
    return fallback_prompt

async def generate_completion(prompt: str, system_prompt: str = "You are a helpful financial AI assistant.") -> Optional[dict]:
    """
    Sends a request to OpenRouter using the configured LLM.
    Returns a dictionary containing 'content' and 'usage' (prompt_tokens, completion_tokens).
    """
    config = get_worker_config()
    if not config.llm_api_key:
        logger.error("No LLM API key configured.")
        return None
        
    models_to_try = [config.llm_model] + config.fallback_models_list
    
    async with aiohttp.ClientSession() as session:
        for model in models_to_try:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                }
                headers = {
                    "Authorization": f"Bearer {config.llm_api_key}",
                    "HTTP-Referer": "https://github.com/Sternpaul/financebot",
                    "Content-Type": "application/json"
                }
                async with session.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers, timeout=60) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data['choices'][0]['message']['content']
                        usage = data.get('usage', {})
                        return {
                            "content": content,
                            "usage": usage
                        }
                    else:
                        err_text = await response.text()
                        logger.warning(f"OpenRouter API failed for model {model}: {response.status} - {err_text}")
            except Exception as e:
                logger.warning(f"OpenRouter generation failed for model {model}: {e}")
                
        logger.error("All OpenRouter fallback models failed.")
        return None
