import 'server-only';
import { GeminiProvider, type AIProvider } from '@calorie/core';

/**
 * Server-only AI provider. Returns null when no real key is configured, so
 * callers can degrade gracefully ("AI logging isn't set up yet"). Swap the
 * provider here (Claude/GPT-4o) without touching any caller.
 */
export function getAIProvider(): AIProvider | null {
  const provider = process.env.AI_PROVIDER ?? 'gemini';
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.length < 10 || key.startsWith('your-')) return null;

  if (provider === 'gemini') {
    return new GeminiProvider(key, process.env.GEMINI_MODEL || 'gemini-2.0-flash');
  }
  return null;
}
