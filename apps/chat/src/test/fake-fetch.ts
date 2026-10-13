import type { StreamEvent } from '@/lib/shared/chat-schema';

const encoder = new TextEncoder();

/** A response body the test writes to, one event (or raw text) at a time. */
export function createControlledStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  let closed = false;
  return {
    body,
    send(event: StreamEvent) {
      if (!closed)
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    },
    raw(text: string) {
      if (!closed) controller.enqueue(encoder.encode(text));
    },
    close() {
      if (closed) return;
      closed = true;
      controller.close();
    },
    fail(error: unknown) {
      if (closed) return;
      closed = true;
      controller.error(error);
    },
  };
}

export type FakeCall = {
  body: { messages: { role: string; content: string }[] };
  signal: AbortSignal;
  stream: ReturnType<typeof createControlledStream>;
};

/**
 * A fetch stand-in for /api/chat. Each call gets a controllable NDJSON
 * stream; aborting the request errors the stream, as a real fetch does.
 * `respond` can replace the response for a call (e.g. an error status).
 */
export function createFakeFetch(
  respond?: (call: FakeCall, index: number) => Response | undefined,
) {
  const calls: FakeCall[] = [];
  const fetchImpl = vi.fn(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal ?? new AbortController().signal;
      const stream = createControlledStream();
      const call: FakeCall = {
        body: JSON.parse(String(init?.body)),
        signal,
        stream,
      };
      calls.push(call);
      signal.addEventListener('abort', () =>
        stream.fail(new DOMException('Aborted', 'AbortError')),
      );
      const custom = respond?.(call, calls.length - 1);
      if (custom) return custom;
      return new Response(stream.body, {
        headers: { 'Content-Type': 'application/x-ndjson' },
      });
    },
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
  return { fetchImpl, calls };
}

export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}
