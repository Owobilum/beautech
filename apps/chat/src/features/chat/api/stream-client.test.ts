import { createFakeFetch, jsonError } from '@/test/fake-fetch';
import { ChatRequestError, streamChat } from './stream-client';

const messages = [{ role: 'user' as const, content: 'Hi' }];

function start(fetchImpl: typeof fetch, signal = new AbortController().signal) {
  const deltas: string[] = [];
  const done = streamChat({
    messages,
    signal,
    fetchImpl,
    onDelta: (text) => deltas.push(text),
  });
  return { deltas, done };
}

async function nextCall(calls: unknown[]) {
  await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
}

describe('streamChat', () => {
  it('posts the messages and reports deltas until done', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const { deltas, done } = start(fetchImpl);
    await nextCall(calls);
    const { stream, body } = calls[0]!;

    stream.send({ type: 'delta', text: 'Hel' });
    stream.send({ type: 'delta', text: 'lo' });
    stream.send({ type: 'done' });
    stream.close();

    await expect(done).resolves.toBeUndefined();
    expect(deltas).toEqual(['Hel', 'lo']);
    expect(body).toEqual({ messages });
  });

  it('handles events split across chunks', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const { deltas, done } = start(fetchImpl);
    await nextCall(calls);
    const { stream } = calls[0]!;

    stream.raw('{"type":"delta","te');
    stream.raw('xt":"a"}\n{"type":"delta","text":"b"}\n{"type":"do');
    stream.raw('ne"}');
    stream.close();

    await expect(done).resolves.toBeUndefined();
    expect(deltas).toEqual(['a', 'b']);
  });

  it('rejects with the server error event, keeping earlier deltas', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const { deltas, done } = start(fetchImpl);
    await nextCall(calls);
    const { stream } = calls[0]!;

    stream.send({ type: 'delta', text: 'partial' });
    stream.send({ type: 'error', code: 'blocked', message: 'Blocked' });
    stream.close();

    await expect(done).rejects.toMatchObject({
      code: 'blocked',
      message: 'Blocked',
    });
    expect(deltas).toEqual(['partial']);
  });

  it('rejects malformed lines', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const { done } = start(fetchImpl);
    await nextCall(calls);

    calls[0]!.stream.raw('not json\n');

    await expect(done).rejects.toMatchObject({ code: 'malformed_response' });
  });

  it('rejects unknown event shapes', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const { done } = start(fetchImpl);
    await nextCall(calls);

    calls[0]!.stream.raw('{"type":"surprise"}\n');

    await expect(done).rejects.toMatchObject({ code: 'malformed_response' });
  });

  it('treats a stream that ends without done as interrupted', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const { done } = start(fetchImpl);
    await nextCall(calls);

    calls[0]!.stream.send({ type: 'delta', text: 'cut' });
    calls[0]!.stream.close();

    await expect(done).rejects.toMatchObject({ code: 'interrupted' });
  });

  it('treats a dropped connection as interrupted', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const { done } = start(fetchImpl);
    await nextCall(calls);

    calls[0]!.stream.fail(new TypeError('network reset'));

    await expect(done).rejects.toMatchObject({ code: 'interrupted' });
  });

  it('reads JSON error responses', async () => {
    const { fetchImpl } = createFakeFetch(() =>
      jsonError(429, 'rate_limited', 'Slow down'),
    );

    await expect(start(fetchImpl).done).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Slow down',
    });
  });

  it('maps non-JSON error responses by status', async () => {
    const { fetchImpl } = createFakeFetch(
      () => new Response('<html>Bad gateway</html>', { status: 502 }),
    );

    await expect(start(fetchImpl).done).rejects.toMatchObject({
      code: 'provider_unavailable',
    });
  });

  it('reports network failures', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    const error = await start(fetchImpl).done.catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ChatRequestError);
    expect(error).toMatchObject({ code: 'network' });
  });

  it('rejects with an AbortError when cancelled', async () => {
    const { fetchImpl, calls } = createFakeFetch();
    const controller = new AbortController();
    const { done } = start(fetchImpl, controller.signal);
    await nextCall(calls);
    calls[0]!.stream.send({ type: 'delta', text: 'a' });

    controller.abort();

    await expect(done).rejects.toMatchObject({ name: 'AbortError' });
  });
});
