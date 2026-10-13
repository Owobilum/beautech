import {
  errorCopy,
  errorResponseSchema,
  streamEventSchema,
  type ChatErrorCode,
  type ChatTurn,
} from '@/lib/shared/chat-schema';

/** A failed response, with a code the UI can explain. */
export class ChatRequestError extends Error {
  constructor(
    readonly code: ChatErrorCode,
    message: string = errorCopy[code].message,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ChatRequestError';
  }
}

export type StreamChatOptions = {
  messages: ChatTurn[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

/**
 * Sends a chat request and calls `onDelta` for each streamed chunk. Resolves
 * when the server signals completion; rejects with `ChatRequestError` on
 * failure, or with the abort reason (an AbortError) when `signal` aborts.
 */
export async function streamChat({
  messages,
  signal,
  onDelta,
  fetchImpl = fetch,
  endpoint = '/api/chat',
}: StreamChatOptions): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (error) {
    throw signal.aborted
      ? abortReason(signal, error)
      : new ChatRequestError('network');
  }

  if (!response.ok) throw await readErrorResponse(response);
  if (!response.body) throw new ChatRequestError('malformed_response');

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let done = false;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new ChatRequestError('malformed_response');
    }
    const event = streamEventSchema.safeParse(json);
    if (!event.success) throw new ChatRequestError('malformed_response');
    switch (event.data.type) {
      case 'delta':
        onDelta(event.data.text);
        break;
      case 'done':
        done = true;
        break;
      case 'error':
        throw new ChatRequestError(event.data.code, event.data.message);
    }
  };

  try {
    while (!done) {
      const { value, done: ended } = await reader.read();
      if (ended) break;
      buffer += value;
      // Chunks can split lines anywhere; keep the incomplete tail.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        handleLine(line);
        if (done) break;
      }
    }
    if (!done) handleLine(buffer);
  } catch (error) {
    if (signal.aborted) throw abortReason(signal, error);
    if (error instanceof ChatRequestError) throw error;
    throw new ChatRequestError('interrupted');
  } finally {
    reader.cancel().catch(() => undefined);
  }

  // The body ended without `done` or `error`: the connection dropped.
  if (!done) {
    if (signal.aborted) throw abortReason(signal);
    throw new ChatRequestError('interrupted');
  }
}

async function readErrorResponse(
  response: Response,
): Promise<ChatRequestError> {
  try {
    const parsed = errorResponseSchema.safeParse(await response.json());
    if (parsed.success) {
      const { code, message, retryAfter } = parsed.data.error;
      return new ChatRequestError(code, message, retryAfter);
    }
  } catch {
    // Not JSON (e.g. a proxy error page): fall back to the status.
  }
  if (response.status === 429) return new ChatRequestError('rate_limited');
  if (response.status >= 500)
    return new ChatRequestError('provider_unavailable');
  return new ChatRequestError('unknown');
}

function abortReason(signal: AbortSignal, fallback?: unknown): unknown {
  return signal.reason ?? fallback ?? new DOMException('Aborted', 'AbortError');
}
