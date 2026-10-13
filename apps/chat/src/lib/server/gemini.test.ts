// @vitest-environment node
import { ApiError, type GenerateContentResponse } from '@google/genai';
import { ChatError, describeForLog } from './errors';
import {
  createGeminiProvider,
  DEFAULT_GEMINI_MODELS,
  parseGeminiModels,
  toGeminiChatError,
  toGeminiContents,
} from './gemini';
import type { ChatProvider } from './provider';

describe('toGeminiContents', () => {
  it('maps roles and merges consecutive turns from the same role', () => {
    expect(
      toGeminiContents([
        { role: 'user', content: 'a' },
        { role: 'user', content: 'b' },
        { role: 'assistant', content: 'c' },
        { role: 'user', content: 'd' },
      ]),
    ).toEqual([
      { role: 'user', parts: [{ text: 'a' }, { text: 'b' }] },
      { role: 'model', parts: [{ text: 'c' }] },
      { role: 'user', parts: [{ text: 'd' }] },
    ]);
  });
});

describe('toGeminiChatError', () => {
  const api = (status: number, message = 'x') =>
    new ApiError({ status, message });

  it.each([
    [429, 'rate_limited'],
    [401, 'not_configured'],
    [404, 'not_configured'],
    [403, 'not_configured'],
    [400, 'invalid_request'],
    [500, 'provider_unavailable'],
    [503, 'provider_unavailable'],
  ])('maps HTTP %i to %s', (status, code) => {
    expect(toGeminiChatError(api(status))).toMatchObject({ code });
  });

  it('reads the retry delay from rate-limit errors', () => {
    const error = toGeminiChatError(api(429, '{"retryDelay":"17s"}'));

    expect(error).toMatchObject({ code: 'rate_limited', retryAfter: 17 });
  });

  it('treats network failures as provider_unavailable and passes aborts through', () => {
    const abort = new DOMException('Aborted', 'AbortError');

    expect(toGeminiChatError(new TypeError('fetch failed'))).toMatchObject({
      code: 'provider_unavailable',
    });
    expect(toGeminiChatError(abort)).toBe(abort);
    const known = new ChatError('blocked');
    expect(toGeminiChatError(known)).toBe(known);
  });
});

describe('parseGeminiModels', () => {
  it('defaults to the latest Flash aliases and parses comma-separated lists', () => {
    expect(parseGeminiModels(undefined)).toEqual(DEFAULT_GEMINI_MODELS);
    expect(parseGeminiModels(' ')).toEqual(DEFAULT_GEMINI_MODELS);
    expect(parseGeminiModels('a, b ,')).toEqual(['a', 'b']);
  });
});

describe('createGeminiProvider model fallback', () => {
  const ask = [{ role: 'user' as const, content: 'hi' }];

  function chunks(...texts: string[]): AsyncIterable<GenerateContentResponse> {
    return (async function* () {
      for (const text of texts) {
        yield { text } as GenerateContentResponse;
      }
    })();
  }

  async function collect(provider: ChatProvider) {
    let out = '';
    for await (const text of provider.stream(
      ask,
      new AbortController().signal,
    )) {
      out += text;
    }
    return out;
  }

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it.each([404, 429, 503])(
    'tries the next model when the first fails with %i before streaming',
    async (status) => {
      const generate = vi.fn(async ({ model }: { model: string }) => {
        if (model === 'primary') throw new ApiError({ status, message: 'x' });
        return chunks('from ', 'fallback');
      });
      const provider = createGeminiProvider({
        apiKey: 'k',
        models: ['primary', 'backup'],
        generate,
      });

      await expect(collect(provider)).resolves.toBe('from fallback');
      expect(generate.mock.calls.map(([params]) => params.model)).toEqual([
        'primary',
        'backup',
      ]);
    },
  );

  it('does not fall back for auth errors', async () => {
    const generate = vi.fn(async () => {
      throw new ApiError({ status: 403, message: 'denied' });
    });
    const provider = createGeminiProvider({
      apiKey: 'k',
      models: ['primary', 'backup'],
      generate,
    });

    await expect(collect(provider)).rejects.toMatchObject({
      code: 'not_configured',
    });
    expect(generate).toHaveBeenCalledOnce();
  });

  it('does not fall back once text has streamed', async () => {
    const generate = vi.fn(async () =>
      (async function* () {
        yield { text: 'partial' } as GenerateContentResponse;
        throw new ApiError({ status: 503, message: 'overloaded' });
      })(),
    );
    const provider = createGeminiProvider({
      apiKey: 'k',
      models: ['primary', 'backup'],
      generate,
    });

    await expect(collect(provider)).rejects.toMatchObject({
      code: 'provider_unavailable',
    });
    expect(generate).toHaveBeenCalledOnce();
  });

  it('explains a missing model when every model fails', async () => {
    const generate = vi.fn(async () => {
      throw new ApiError({ status: 404, message: 'no longer available' });
    });
    const provider = createGeminiProvider({
      apiKey: 'k',
      models: ['old-model'],
      generate,
    });

    const error = await collect(provider).catch((e: unknown) => e);

    expect(error).toMatchObject({ code: 'not_configured' });
    expect((error as Error).message).toContain('“old-model” isn’t available');
    expect(describeForLog(error)).toContain('status=404');
  });
});
