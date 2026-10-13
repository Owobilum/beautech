import { errorCopy, LIMITS } from '@/lib/shared/chat-schema';
import { buildRequestMessages } from '../domain/selectors';
import { isStreaming } from '../domain/reducer';
import type { MessageError, StreamTarget } from '../domain/types';
import type { ChatStore } from '../store/chat-store';
import { ChatRequestError, streamChat } from './stream-client';

export type ChatControllerOptions = {
  fetchImpl?: typeof fetch;
  createId?: () => string;
  now?: () => number;
  /** Batches deltas; defaults to requestAnimationFrame. */
  scheduleFlush?: (flush: () => void) => void;
};

type InFlight = { target: StreamTarget; controller: AbortController };

/**
 * Owns the request lifecycle: sending, streaming into the store, stopping
 * and retrying. Every request is tied to a `StreamTarget`, and the reducer
 * ignores events for any other target, so a request can never write into the
 * wrong conversation or over a newer attempt.
 */
export class ChatController {
  private readonly inFlight = new Map<string, InFlight>();
  private readonly fetchImpl: typeof fetch | undefined;
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly scheduleFlush: (flush: () => void) => void;

  constructor(
    private readonly store: ChatStore,
    options: ChatControllerOptions = {},
  ) {
    this.fetchImpl = options.fetchImpl;
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.now = options.now ?? Date.now;
    this.scheduleFlush =
      options.scheduleFlush ??
      ((flush) =>
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(flush)
          : setTimeout(flush, 16));
  }

  /**
   * Sends a message in the active conversation (creating one for a new
   * chat). Returns the conversation id, or undefined if the message was
   * rejected (empty, too long, or a response is already streaming).
   */
  send(content: string): string | undefined {
    const text = content.trim();
    if (!text || text.length > LIMITS.maxUserMessageChars) return undefined;

    const state = this.store.getState();
    const conversationId = state.activeId ?? this.createId();
    const conversation = state.conversations[conversationId];
    if (conversation && isStreaming(conversation)) return undefined;

    const target: StreamTarget = {
      conversationId,
      messageId: this.createId(),
      requestId: this.createId(),
    };
    this.store.dispatch({
      type: 'messageSubmitted',
      target,
      userMessageId: this.createId(),
      content: text,
      now: this.now(),
    });
    void this.run(target);
    return conversationId;
  }

  /** Stops the response streaming in a conversation, keeping partial text. */
  stop(conversationId: string): void {
    const request = this.inFlight.get(conversationId);
    if (!request) return;
    // Update the UI immediately; the aborted request's own stop is a no-op.
    this.store.dispatch({
      type: 'streamStopped',
      target: request.target,
      now: this.now(),
    });
    request.controller.abort();
  }

  /** Re-requests the latest (failed or stopped) response in place. */
  retry(conversationId: string, messageId: string): void {
    if (this.inFlight.has(conversationId)) return;
    const target: StreamTarget = {
      conversationId,
      messageId,
      requestId: this.createId(),
    };
    const before = this.store.getState();
    this.store.dispatch({ type: 'retryRequested', target, now: this.now() });
    if (this.store.getState() !== before) void this.run(target);
  }

  deleteConversation(conversationId: string): void {
    this.inFlight.get(conversationId)?.controller.abort();
    this.store.dispatch({
      type: 'conversationDeleted',
      conversationId,
      now: this.now(),
    });
  }

  /** Aborts every request (on unmount). */
  dispose(): void {
    for (const { controller } of this.inFlight.values()) controller.abort();
    this.inFlight.clear();
  }

  private async run(target: StreamTarget): Promise<void> {
    const conversation =
      this.store.getState().conversations[target.conversationId];
    if (!conversation) return;

    const controller = new AbortController();
    this.inFlight.set(target.conversationId, { target, controller });

    // Deltas are buffered and applied at most once per frame.
    let buffer = '';
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      if (!buffer) return;
      const text = buffer;
      buffer = '';
      this.store.dispatch({ type: 'deltaReceived', target, text });
    };

    try {
      await streamChat({
        messages: buildRequestMessages(conversation, target.messageId),
        signal: controller.signal,
        fetchImpl: this.fetchImpl,
        onDelta: (text) => {
          buffer += text;
          if (!scheduled) {
            scheduled = true;
            this.scheduleFlush(flush);
          }
        },
      });
      flush();
      this.store.dispatch({ type: 'streamCompleted', target, now: this.now() });
    } catch (error) {
      flush();
      if (controller.signal.aborted) {
        this.store.dispatch({ type: 'streamStopped', target, now: this.now() });
      } else {
        this.store.dispatch({
          type: 'streamFailed',
          target,
          error: toMessageError(error),
          now: this.now(),
        });
      }
    } finally {
      if (this.inFlight.get(target.conversationId)?.target === target) {
        this.inFlight.delete(target.conversationId);
      }
    }
  }
}

export function toMessageError(error: unknown): MessageError {
  const code = error instanceof ChatRequestError ? error.code : 'unknown';
  const message =
    error instanceof ChatRequestError
      ? error.message
      : errorCopy.unknown.message;
  return { code, message, retryable: errorCopy[code].retryable };
}
