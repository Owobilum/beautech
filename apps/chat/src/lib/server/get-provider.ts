import 'server-only';
import { ChatError } from './errors';
import { createGeminiProvider, parseGeminiModels } from './gemini';
import { createMockProvider } from './mock-provider';
import type { ChatProvider } from './provider';

let cached: { key: string; provider: ChatProvider } | undefined;

/**
 * The configured provider, from server-only environment variables:
 * `AI_PROVIDER=mock` for the scripted mock, otherwise Gemini with
 * `GEMINI_API_KEY` (and optional `GEMINI_MODEL`, a model or a comma-separated
 * fallback list).
 */
export function getProvider(): ChatProvider {
  const kind = process.env.AI_PROVIDER === 'mock' ? 'mock' : 'gemini';
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  const key = `${kind}:${apiKey}:${model}`;
  if (cached?.key === key) return cached.provider;

  let provider: ChatProvider;
  if (kind === 'mock') {
    provider = createMockProvider();
  } else {
    if (!apiKey) {
      throw new ChatError(
        'not_configured',
        'GEMINI_API_KEY is not set on the server.',
      );
    }
    provider = createGeminiProvider({
      apiKey,
      models: parseGeminiModels(model),
    });
  }
  cached = { key, provider };
  return provider;
}
