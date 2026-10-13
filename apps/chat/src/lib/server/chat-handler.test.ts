// @vitest-environment node
import type { StreamEvent } from '@/lib/shared/chat-schema';
import { handleChatRequest } from './chat-handler';
import { ChatError } from './errors';
import { createMockProvider } from './mock-provider';
import type { ChatProvider } from './provider';

function post(body: unknown, signal?: AbortSignal) {
  return new Request('http://test/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal,
  });
}

const ask = (content: string) => ({ messages: [{ role: 'user', content }] });

async function readEvents(response: Response): Promise<StreamEvent[]> {
  const text = await response.text();
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamEvent);
}

function providerOf(
  stream: (signal: AbortSignal) => AsyncGenerator<string>,
): () => ChatProvider {
  return () => ({ stream: (_messages, signal) => stream(signal) });
}

const mock = () => createMockProvider({ delayMs: 0, slowDelayMs: 0 });

describe('POST /api/chat', () => {
  it('streams the reply as NDJSON deltas followed by done', async () => {
    const provider = mock();
    const response = await handleChatRequest(
      post(ask('closures')),
      () => provider,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain(
      'application/x-ndjson',
    );
    const events = await readEvents(response);
    expect(events.at(-1)).toEqual({ type: 'done' });
    const text = events.map((e) => (e.type === 'delta' ? e.text : '')).join('');
    expect(text).toContain('mock answer about **closures**');
    expect(events.filter((e) => e.type === 'delta').length).toBeGreaterThan(5);
  });

  it('rejects malformed JSON and invalid payloads with 400', async () => {
    const notJson = await handleChatRequest(post('{nope'), mock);
    const invalid = await handleChatRequest(
      post({ messages: [{ role: 'assistant', content: 'x' }] }),
      mock,
    );

    expect(notJson.status).toBe(400);
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      error: { code: 'invalid_request' },
    });
  });

  it('rejects oversized requests with 413', async () => {
    const response = await handleChatRequest(
      post(ask('x'.repeat(8_001))),
      mock,
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'too_large' },
    });
  });

  it('maps a failure before the first token to an HTTP error', async () => {
    const response = await handleChatRequest(
      post(ask('hi')),
      // eslint-disable-next-line require-yield -- fails before the first chunk
      providerOf(async function* () {
        throw new ChatError('rate_limited', undefined, { retryAfter: 12 });
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('12');
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'rate_limited', retryAfter: 12 },
    });
  });

  it('reports a missing API key as 503 not_configured', async () => {
    const response = await handleChatRequest(post(ask('hi')), () => {
      throw new ChatError('not_configured');
    });

    expect(response.status).toBe(503);
  });

  it('reports an empty reply as empty_response', async () => {
    const response = await handleChatRequest(post(ask('[empty]')), mock);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'empty_response' },
    });
  });

  it('ends with an error event when the provider fails mid-stream', async () => {
    const response = await handleChatRequest(post(ask('[fail-mid]')), mock);

    expect(response.status).toBe(200);
    const events = await readEvents(response);
    expect(events.some((e) => e.type === 'delta')).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'interrupted' });
  });

  it('hides unexpected error details from the client', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handleChatRequest(
      post(ask('hi')),
      // eslint-disable-next-line require-yield -- fails before the first chunk
      providerOf(async function* () {
        throw new Error('secret internal detail');
      }),
    );

    const body = await response.text();
    expect(response.status).toBe(500);
    expect(body).not.toContain('secret');
  });

  it('aborts the provider when the client disconnects', async () => {
    const controller = new AbortController();
    let providerSignal: AbortSignal | undefined;
    let finished = false;
    const response = await handleChatRequest(
      post(ask('hi'), controller.signal),
      providerOf(async function* (signal) {
        providerSignal = signal;
        try {
          yield 'first ';
          await new Promise((_, reject) =>
            signal.addEventListener('abort', () => reject(signal.reason)),
          );
        } finally {
          finished = true;
        }
      }),
    );
    const reader = response.body!.getReader();
    await reader.read();

    controller.abort();
    await reader.cancel();

    expect(providerSignal?.aborted).toBe(true);
    await vi.waitFor(() => expect(finished).toBe(true));
  });

  it('lets a [fail-once] prompt succeed on retry', async () => {
    const provider = mock();
    const first = await handleChatRequest(
      post(ask('[fail-once] q')),
      () => provider,
    );
    const second = await handleChatRequest(
      post(ask('[fail-once] q')),
      () => provider,
    );

    expect(first.status).toBe(502);
    expect(second.status).toBe(200);
  });
});
