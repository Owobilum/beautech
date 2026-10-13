import { z } from 'zod';

/**
 * Wire format shared by the Route Handler and the browser client.
 *
 * Request:  POST /api/chat  { messages: { role, content }[] }
 * Response: errors before streaming starts are JSON (`ErrorResponse`) with an
 *           HTTP status; otherwise `application/x-ndjson`, one `StreamEvent`
 *           per line, ending with `done` or `error`.
 */

export const LIMITS = {
  /** Longest message a user can send. */
  maxUserMessageChars: 8_000,
  /** Longest single message accepted (assistant replies can be long). */
  maxMessageChars: 32_000,
  /** Most messages sent as context. Older ones are dropped by the client. */
  maxMessages: 50,
  /** Total characters of context. Older messages are dropped by the client. */
  maxTotalChars: 60_000,
} as const;

export const chatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatTurnSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const chatRequestSchema = z.object({
  messages: z
    .array(chatTurnSchema)
    .min(1)
    .refine((messages) => messages.at(-1)?.role === 'user', {
      message: 'The last message must be from the user',
    }),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatErrorCodes = [
  'invalid_request',
  'too_large',
  'rate_limited',
  'not_configured',
  'provider_unavailable',
  'blocked',
  'empty_response',
  'interrupted',
  'malformed_response',
  'network',
  'unknown',
] as const;
export const chatErrorCodeSchema = z.enum(chatErrorCodes);
export type ChatErrorCode = z.infer<typeof chatErrorCodeSchema>;

export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done') }),
  z.object({
    type: z.literal('error'),
    code: chatErrorCodeSchema,
    message: z.string(),
  }),
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: chatErrorCodeSchema,
    message: z.string(),
    /** Seconds until a retry may succeed (rate limits). */
    retryAfter: z.number().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Returns the limit a validated request exceeds, if any. Separate from the
 * schema so oversized requests get 413 rather than a generic 400.
 */
export function findLimitViolation(messages: ChatTurn[]): string | undefined {
  if (messages.length > LIMITS.maxMessages) {
    return `Too many messages (max ${LIMITS.maxMessages})`;
  }
  let total = 0;
  for (const message of messages) {
    const max =
      message.role === 'user'
        ? LIMITS.maxUserMessageChars
        : LIMITS.maxMessageChars;
    if (message.content.length > max) {
      return `A ${message.role} message exceeds ${max} characters`;
    }
    total += message.content.length;
  }
  if (total > LIMITS.maxTotalChars) {
    return `Conversation exceeds ${LIMITS.maxTotalChars} characters`;
  }
  return undefined;
}

/** User-facing copy for each error, and whether retrying can help. */
export const errorCopy: Record<
  ChatErrorCode,
  { message: string; retryable: boolean }
> = {
  invalid_request: {
    message: 'The message could not be sent.',
    retryable: false,
  },
  too_large: {
    message: 'This conversation is too long to send. Start a new chat.',
    retryable: false,
  },
  rate_limited: {
    message: 'Too many requests right now. Wait a moment and try again.',
    retryable: true,
  },
  not_configured: {
    message: 'The assistant is not configured. Check the server API key.',
    retryable: false,
  },
  provider_unavailable: {
    message: 'The assistant is unavailable right now. Try again.',
    retryable: true,
  },
  blocked: {
    message: 'The response was blocked by the provider’s safety filters.',
    retryable: true,
  },
  empty_response: {
    message: 'The assistant returned an empty response.',
    retryable: true,
  },
  interrupted: {
    message: 'The response was interrupted.',
    retryable: true,
  },
  malformed_response: {
    message: 'The response could not be read.',
    retryable: true,
  },
  network: {
    message: 'Network error. Check your connection and try again.',
    retryable: true,
  },
  unknown: { message: 'Something went wrong. Try again.', retryable: true },
};
