import {
  errorCopy,
  type ChatErrorCode,
  type ErrorResponse,
} from '@/lib/shared/chat-schema';

const statusByCode: Record<ChatErrorCode, number> = {
  invalid_request: 400,
  too_large: 413,
  rate_limited: 429,
  not_configured: 503,
  provider_unavailable: 502,
  blocked: 422,
  empty_response: 502,
  interrupted: 502,
  malformed_response: 502,
  network: 502,
  unknown: 500,
};

/**
 * A failure with a known code. `message` is safe to show to the user;
 * `cause` (the upstream error) is only logged on the server.
 */
export class ChatError extends Error {
  readonly retryAfter?: number;

  constructor(
    readonly code: ChatErrorCode,
    message: string = errorCopy[code].message,
    options: { retryAfter?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ChatError';
    this.retryAfter = options.retryAfter;
  }

  get status() {
    return statusByCode[this.code];
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function toChatError(error: unknown): ChatError {
  return error instanceof ChatError ? error : new ChatError('unknown');
}

export function errorResponse(error: ChatError): Response {
  const body: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.retryAfter !== undefined && { retryAfter: error.retryAfter }),
    },
  };
  return Response.json(body, {
    status: error.status,
    headers:
      error.retryAfter !== undefined
        ? { 'Retry-After': String(error.retryAfter) }
        : undefined,
  });
}

/**
 * One-line server log description of a failure: the code plus the upstream
 * status and message (truncated). Never includes request content.
 */
export function describeForLog(error: unknown): string {
  const code = error instanceof ChatError ? error.code : 'unknown';
  const cause = error instanceof ChatError ? error.cause : error;
  if (cause === undefined) return code;
  const status =
    typeof cause === 'object' && cause && 'status' in cause
      ? ` status=${String(cause.status)}`
      : '';
  const message = cause instanceof Error ? cause.message : String(cause);
  return `${code}${status} ${message.replace(/\s+/g, ' ').slice(0, 300)}`;
}
