import 'server-only';
import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  type Content,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import type { ChatTurn } from '@/lib/shared/chat-schema';
import { ChatError, isAbortError } from './errors';
import type { ChatProvider } from './provider';

/**
 * Tried in order (see shouldTryNextModel). The `-latest` alias tracks
 * Google's newest Flash model, so the chain can't break when a pinned
 * version is retired (as gemini-2.5-flash was for new API keys); but the
 * newest model is often overloaded on the free tier, so a pinned, widely
 * available model follows, then the lite alias.
 */
export const DEFAULT_GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
];

/** `GEMINI_MODEL`: one model or a comma-separated fallback list. */
export function parseGeminiModels(value: string | undefined): string[] {
  const models = (value ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return models.length > 0 ? models : DEFAULT_GEMINI_MODELS;
}

/**
 * Failures worth trying the next model for: missing/retired model (404),
 * per-model quota (429) and overload or outage (5xx). Auth and bad-request
 * errors would fail the same way on every model.
 */
function shouldTryNextModel(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 429 || error.status >= 500)
  );
}

const SYSTEM_INSTRUCTION =
  'You are a helpful assistant. Answer concisely and use Markdown (headings, ' +
  'lists, tables, fenced code blocks with a language) when it aids clarity.';

const BLOCKING_FINISH_REASONS = new Set<FinishReason | undefined>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
  FinishReason.RECITATION,
]);

/**
 * Gemini expects alternating user/model turns; the client can send
 * consecutive user turns (e.g. after a failed reply), so merge them.
 */
export function toGeminiContents(messages: ChatTurn[]): Content[] {
  const contents: Content[] = [];
  for (const message of messages) {
    const role = message.role === 'assistant' ? 'model' : 'user';
    const previous = contents.at(-1);
    if (previous?.role === role && previous.parts) {
      previous.parts.push({ text: message.content });
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }
  return contents;
}

/**
 * Maps SDK and network failures to typed, user-safe errors, keeping the
 * original as `cause` for server logs.
 */
export function toGeminiChatError(
  error: unknown,
  model?: string,
): ChatError | unknown {
  if (error instanceof ChatError || isAbortError(error)) return error;
  const cause = error;
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new ChatError('rate_limited', undefined, {
        retryAfter: parseRetryAfter(error),
        cause,
      });
    }
    if (error.status === 401 || error.status === 403) {
      return new ChatError(
        'not_configured',
        'The server’s Gemini API key was rejected.',
        { cause },
      );
    }
    if (error.status === 404) {
      return new ChatError(
        'not_configured',
        `The Gemini model${model ? ` “${model}”` : ''} isn’t available. Set GEMINI_MODEL to a current model.`,
        { cause },
      );
    }
    if (error.status === 400) {
      return new ChatError('invalid_request', undefined, { cause });
    }
  }
  return new ChatError('provider_unavailable', undefined, { cause });
}

function parseRetryAfter(error: ApiError): number | undefined {
  // Gemini reports e.g. "retryDelay":"17s" in the error details.
  const match = /retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/.exec(error.message);
  return match ? Math.ceil(Number(match[1])) : undefined;
}

type GenerateStream = (
  params: GenerateContentParameters,
) => Promise<AsyncIterable<GenerateContentResponse>>;

export function createGeminiProvider({
  apiKey,
  models = DEFAULT_GEMINI_MODELS,
  generate,
}: {
  apiKey: string;
  models?: string[];
  /** Injected in tests; defaults to the SDK's generateContentStream. */
  generate?: GenerateStream;
}): ChatProvider {
  let generateStream = generate;
  if (!generateStream) {
    const ai = new GoogleGenAI({ apiKey });
    generateStream = (params) => ai.models.generateContentStream(params);
  }

  return {
    async *stream(messages, signal) {
      for (const [index, model] of models.entries()) {
        // Falling back is only safe before any text reached the client.
        let started = false;
        try {
          const response = await generateStream({
            model,
            contents: toGeminiContents(messages),
            config: {
              abortSignal: signal,
              systemInstruction: SYSTEM_INSTRUCTION,
            },
          });
          for await (const chunk of response) {
            if (chunk.promptFeedback?.blockReason) {
              throw new ChatError('blocked');
            }
            const text = chunk.text;
            if (text) {
              started = true;
              yield text;
            }
            const finishReason = chunk.candidates?.[0]?.finishReason;
            if (BLOCKING_FINISH_REASONS.has(finishReason)) {
              throw new ChatError('blocked');
            }
          }
          return;
        } catch (error) {
          // The SDK can surface aborts as generic errors; trust the signal.
          if (signal.aborted) throw signal.reason ?? error;
          const isLast = index === models.length - 1;
          if (!started && !isLast && shouldTryNextModel(error)) {
            console.warn(
              `[api/chat] ${model} failed (${(error as ApiError).status}); trying ${models[index + 1]}`,
            );
            continue;
          }
          throw toGeminiChatError(error, model);
        }
      }
    },
  };
}
