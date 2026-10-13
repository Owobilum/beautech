'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatState } from '../domain/types';
import { useChatSelector } from '../store/chat-context';

type Snapshot = {
  conversationId: string | null;
  attempt: string | null;
  status: string | null;
  error: string | null;
};

function selectSnapshot(state: ChatState): Snapshot {
  const conversation = state.activeId
    ? state.conversations[state.activeId]
    : undefined;
  const last = conversation?.messages.at(-1);
  return last?.role === 'assistant'
    ? {
        conversationId: state.activeId,
        attempt: `${last.id}:${last.requestId}`,
        status: last.status,
        error: last.error?.message ?? null,
      }
    : {
        conversationId: state.activeId,
        attempt: null,
        status: null,
        error: null,
      };
}

const sameSnapshot = (a: Snapshot, b: Snapshot) =>
  a.conversationId === b.conversationId &&
  a.attempt === b.attempt &&
  a.status === b.status &&
  a.error === b.error;

/**
 * Announces response lifecycle changes in the open conversation through a
 * polite live region: started, finished, stopped, failed. Never individual
 * tokens, and nothing when merely switching conversations.
 */
export function StatusAnnouncer() {
  const snapshot = useChatSelector(selectSnapshot, sameSnapshot);
  const previous = useRef(snapshot);
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });

  useEffect(() => {
    const before = previous.current;
    previous.current = snapshot;
    // Switching conversations announces nothing. Sending the first message
    // of a new chat (null → new id) is not a switch.
    if (
      before.conversationId !== null &&
      before.conversationId !== snapshot.conversationId
    ) {
      return;
    }

    let text: string | undefined;
    if (
      snapshot.status === 'streaming' &&
      before.attempt !== snapshot.attempt
    ) {
      text = 'Assistant is responding…';
    } else if (
      before.attempt === snapshot.attempt &&
      before.status !== snapshot.status
    ) {
      if (snapshot.status === 'complete') text = 'Response complete.';
      else if (snapshot.status === 'stopped') text = 'Response stopped.';
      else if (snapshot.status === 'error') {
        text = `Response failed: ${snapshot.error ?? 'unknown error'}`;
      }
    }
    if (text) {
      const message = text;
      setAnnouncement((current) => ({ id: current.id + 1, text: message }));
    }
  }, [snapshot]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {/* A fresh node per announcement, so repeats are read again. */}
      {announcement.text && <p key={announcement.id}>{announcement.text}</p>}
    </div>
  );
}
