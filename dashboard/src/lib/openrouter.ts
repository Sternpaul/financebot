/**
 * Shared OpenRouter helper with model fallback.
 * Mirrors the backend's ai.py fallback pattern:
 *   try primary model -> try each fallback in order -> throw if all fail.
 *
 * Reads:
 *   OPENROUTER_API_KEY  — required, the OpenRouter API key
 *   LLM_MODEL           — primary model slug (default: google/gemini-2.5-flash-preview-05-20)
 *   LLM_FALLBACK_MODELS — comma-separated fallback slugs
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }
  return key;
}

function getModelsToTry(): string[] {
  const primary = process.env.LLM_MODEL || 'openrouter/owl-alpha';
  const fallbacksRaw = process.env.LLM_FALLBACK_MODELS || 'nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free,google/gemini-2.5-flash-free';
  const fallbacks = fallbacksRaw.split(',').map(m => m.trim()).filter(Boolean);
  return [primary, ...fallbacks];
}

/**
 * Call OpenRouter with automatic model fallback.
 * Tries the primary model first, then each fallback in order.
 * Returns the first successful Response object.
 */
export async function fetchWithFallback(
  messages: Array<{ role: string; content: string }>,
  stream: boolean = true
): Promise<Response> {
  const apiKey = getApiKey();
  const models = getModelsToTry();

  let lastError = '';

  for (const model of models) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/Sternpaul/financebot',
          'X-Title': 'FinanceBot Dashboard',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, stream }),
      });

      if (response.ok) {
        return response;
      }

      // Model-specific failure — log and try next
      const errText = await response.text();
      console.warn(`OpenRouter model ${model} failed (${response.status}): ${errText}`);
      lastError = errText;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`OpenRouter network error for model ${model}: ${msg}`);
      lastError = msg;
    }
  }

  throw new Error(`All OpenRouter models failed. Last error: ${lastError}`);
}
