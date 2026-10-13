import type { ChatTurn } from '@/lib/shared/chat-schema';

/**
 * A source of streamed assistant text. Implementations yield non-empty text
 * chunks, throw `ChatError` for known failures, and stop when `signal`
 * aborts (throwing an `AbortError`).
 */
export interface ChatProvider {
  stream(messages: ChatTurn[], signal: AbortSignal): AsyncIterable<string>;
}

/** Waits `ms`, rejecting with an AbortError if `signal` aborts first. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function abortError() {
  return new DOMException('The operation was aborted', 'AbortError');
}
