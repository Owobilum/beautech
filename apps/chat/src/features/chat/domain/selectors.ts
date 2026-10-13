import { LIMITS, type ChatTurn } from '@/lib/shared/chat-schema';
import type { ChatState, Conversation } from './types';

export type ConversationSummary = { id: string; title: string };

/** Sidebar entries, most recently active first. */
export function selectConversationList(
  state: ChatState,
): ConversationSummary[] {
  return Object.values(state.conversations)
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
    .map(({ id, title }) => ({ id, title }));
}

export function sameSummaries(
  a: ConversationSummary[],
  b: ConversationSummary[],
): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => item.id === b[i]?.id && item.title === b[i]?.title)
  );
}

export function selectActiveConversation(
  state: ChatState,
): Conversation | undefined {
  return state.activeId ? state.conversations[state.activeId] : undefined;
}

export function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * The context sent for the response `assistantMessageId`: every earlier
 * message, minus failed or empty assistant replies, trimmed from the oldest
 * end to fit the request limits. Always starts with a user message.
 */
export function buildRequestMessages(
  conversation: Conversation,
  assistantMessageId: string,
): ChatTurn[] {
  const end = conversation.messages.findIndex(
    (m) => m.id === assistantMessageId,
  );
  const history = conversation.messages
    .slice(0, end === -1 ? undefined : end)
    .filter(
      (m) =>
        m.role === 'user' ||
        ((m.status === 'complete' || m.status === 'stopped') &&
          m.content.trim() !== ''),
    )
    .map(({ role, content }) => ({ role, content }));

  const turns: ChatTurn[] = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (!turn) continue;
    if (
      turns.length >= LIMITS.maxMessages ||
      (turns.length > 0 && total + turn.content.length > LIMITS.maxTotalChars)
    ) {
      break;
    }
    turns.unshift(turn);
    total += turn.content.length;
  }
  while (turns[0]?.role === 'assistant') turns.shift();
  return turns;
}
