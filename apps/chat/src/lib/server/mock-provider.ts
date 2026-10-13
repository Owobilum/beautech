import { ChatError } from './errors';
import { sleep, type ChatProvider } from './provider';

/**
 * Deterministic provider for e2e tests and offline development
 * (`AI_PROVIDER=mock`). Markers in the last user message script failures:
 *
 * - `[slow]`       streams slowly (time to stop it)
 * - `[error]`      fails before streaming (HTTP 502)
 * - `[fail-once]`  fails the first time a given prompt is sent, then succeeds
 * - `[fail-mid]`   streams part of the answer, then fails
 * - `[empty]`      returns no text
 */
export function createMockProvider({
  delayMs = 25,
  slowDelayMs = 250,
}: { delayMs?: number; slowDelayMs?: number } = {}): ChatProvider {
  const failedOnce = new Set<string>();

  return {
    async *stream(messages, signal) {
      const prompt = messages.at(-1)?.content ?? '';
      const delay = prompt.includes('[slow]') ? slowDelayMs : delayMs;

      await sleep(delay, signal);
      if (prompt.includes('[error]')) {
        throw new ChatError('provider_unavailable');
      }
      if (prompt.includes('[fail-once]') && !failedOnce.has(prompt)) {
        failedOnce.add(prompt);
        throw new ChatError('provider_unavailable');
      }
      if (prompt.includes('[empty]')) return;

      const words = mockReply(prompt, messages.length).split(/(?<= )/);
      for (const [index, word] of words.entries()) {
        if (prompt.includes('[fail-mid]') && index === 6) {
          throw new ChatError('interrupted');
        }
        yield word;
        await sleep(delay, signal);
      }
    },
  };
}

export function mockReply(prompt: string, turn: number): string {
  const topic = prompt.replace(/\[[a-z-]+\]/g, '').trim() || 'that';
  return [
    `Here is a mock answer about **${topic}** (message ${turn}).`,
    '',
    '- It streams word by word',
    '- It renders Markdown',
    '',
    '```ts',
    "const greeting = 'hello';",
    '```',
    '',
    'End of mock response.',
  ].join('\n');
}
