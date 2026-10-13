import {
  chatRequestSchema,
  findLimitViolation,
  type StreamEvent,
} from '@/lib/shared/chat-schema';
import {
  ChatError,
  describeForLog,
  errorResponse,
  isAbortError,
  toChatError,
} from './errors';
import type { ChatProvider } from './provider';

const encoder = new TextEncoder();
const encode = (event: StreamEvent) =>
  encoder.encode(`${JSON.stringify(event)}\n`);

/**
 * POST /api/chat. Validates the request, then streams the provider's reply
 * as NDJSON. The first chunk is awaited before responding, so failures that
 * happen before any text (bad key, rate limit, empty reply) get a proper
 * HTTP status; later failures arrive as an `error` event.
 *
 * `request.signal` aborts when the client disconnects or cancels, which
 * aborts the upstream provider call.
 */
export async function handleChatRequest(
  request: Request,
  getProvider: () => ChatProvider,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      new ChatError('invalid_request', 'The request body must be JSON.'),
    );
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      new ChatError(
        'invalid_request',
        parsed.error.issues[0]?.message ?? 'Invalid request.',
      ),
    );
  }
  const { messages } = parsed.data;
  const violation = findLimitViolation(messages);
  if (violation) return errorResponse(new ChatError('too_large', violation));

  const { signal } = request;
  let iterator: AsyncIterator<string>;
  let first: IteratorResult<string>;
  try {
    iterator = getProvider().stream(messages, signal)[Symbol.asyncIterator]();
    first = await iterator.next();
  } catch (error) {
    // 499: client closed the request (nobody reads this response).
    if (signal.aborted || isAbortError(error)) {
      return new Response(null, { status: 499 });
    }
    logError(error);
    return errorResponse(toChatError(error));
  }
  if (first.done) return errorResponse(new ChatError('empty_response'));

  let pending: string | undefined = first.value;
  const stream = new ReadableStream<Uint8Array>({
    // pull (rather than a loop in start) applies backpressure: the provider
    // is only read as fast as the client consumes.
    async pull(controller) {
      if (pending !== undefined) {
        controller.enqueue(encode({ type: 'delta', text: pending }));
        pending = undefined;
        return;
      }
      try {
        const result = await iterator.next();
        if (result.done) {
          controller.enqueue(encode({ type: 'done' }));
          controller.close();
        } else if (result.value) {
          controller.enqueue(encode({ type: 'delta', text: result.value }));
        }
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          controller.close();
          return;
        }
        logError(error);
        const chatError = toChatError(error);
        controller.enqueue(
          encode({
            type: 'error',
            code: chatError.code,
            message: chatError.message,
          }),
        );
        controller.close();
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

function logError(error: unknown) {
  // Code and upstream error only: never message content or credentials.
  console.error(`[api/chat] ${describeForLog(error)}`);
}
