import { errorCopy } from '@/lib/shared/chat-schema';
import { deriveTitle } from './title';
import type {
  AssistantMessage,
  ChatState,
  Conversation,
  MessageError,
  StorageProblem,
  StreamTarget,
} from './types';

export const initialChatState: ChatState = {
  hydrated: false,
  conversations: {},
  activeId: null,
  deleted: {},
  storageProblem: null,
};

export type PersistedChat = Pick<
  ChatState,
  'conversations' | 'activeId' | 'deleted'
>;

export type ChatAction =
  | { type: 'hydrated'; persisted: PersistedChat }
  | { type: 'externalChange'; persisted: PersistedChat }
  | { type: 'storageStatusChanged'; problem: StorageProblem | null }
  | { type: 'newChat' }
  | { type: 'conversationSelected'; conversationId: string }
  | { type: 'conversationDeleted'; conversationId: string; now: number }
  | {
      type: 'messageSubmitted';
      target: StreamTarget;
      userMessageId: string;
      content: string;
      now: number;
    }
  | { type: 'deltaReceived'; target: StreamTarget; text: string }
  | { type: 'streamCompleted'; target: StreamTarget; now: number }
  | {
      type: 'streamFailed';
      target: StreamTarget;
      error: MessageError;
      now: number;
    }
  | { type: 'streamStopped'; target: StreamTarget; now: number }
  | { type: 'retryRequested'; target: StreamTarget; now: number };

/**
 * Pure state transitions. Stream actions (delta/completed/failed/stopped)
 * only apply to a message that is still streaming for the same request, so
 * stale or late events — after a stop, a retry, or a deletion — are no-ops.
 * Unchanged state is returned by reference, so subscribers skip re-renders.
 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'hydrated':
      return { ...state, ...action.persisted, hydrated: true };

    case 'externalChange':
      return mergeExternal(state, action.persisted);

    case 'storageStatusChanged':
      return state.storageProblem === action.problem
        ? state
        : { ...state, storageProblem: action.problem };

    case 'newChat':
      return state.activeId === null ? state : { ...state, activeId: null };

    case 'conversationSelected':
      return state.conversations[action.conversationId] &&
        state.activeId !== action.conversationId
        ? { ...state, activeId: action.conversationId }
        : state;

    case 'conversationDeleted': {
      const { conversationId: id, now } = action;
      if (!state.conversations[id]) return state;
      const { [id]: _removed, ...conversations } = state.conversations;
      return {
        ...state,
        conversations,
        activeId: state.activeId === id ? null : state.activeId,
        deleted: { ...state.deleted, [id]: now },
      };
    }

    case 'messageSubmitted': {
      const { target, userMessageId, content, now } = action;
      const existing = state.conversations[target.conversationId];
      // One response at a time per conversation.
      if (existing && isStreaming(existing)) return state;
      if (!existing && state.deleted[target.conversationId]) return state;

      const conversation: Conversation = existing ?? {
        id: target.conversationId,
        title: deriveTitle(content),
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      const assistant: AssistantMessage = {
        id: target.messageId,
        role: 'assistant',
        content: '',
        createdAt: now,
        status: 'streaming',
        requestId: target.requestId,
      };
      return {
        ...state,
        activeId: target.conversationId,
        conversations: {
          ...state.conversations,
          [target.conversationId]: {
            ...conversation,
            updatedAt: now,
            messages: [
              ...conversation.messages,
              { id: userMessageId, role: 'user', content, createdAt: now },
              assistant,
            ],
          },
        },
      };
    }

    case 'deltaReceived':
      if (!action.text) return state;
      return updateStreaming(state, action.target, undefined, (message) => ({
        ...message,
        content: message.content + action.text,
      }));

    case 'streamCompleted':
      return updateStreaming(state, action.target, action.now, (message) =>
        message.content.trim()
          ? { ...message, status: 'complete' }
          : {
              ...message,
              status: 'error',
              error: { code: 'empty_response', ...errorCopy.empty_response },
            },
      );

    case 'streamFailed':
      return updateStreaming(state, action.target, action.now, (message) => ({
        ...message,
        status: 'error',
        error: action.error,
      }));

    case 'streamStopped':
      return updateStreaming(state, action.target, action.now, (message) => ({
        ...message,
        status: 'stopped',
      }));

    case 'retryRequested': {
      const { target, now } = action;
      const conversation = state.conversations[target.conversationId];
      const last = conversation?.messages.at(-1);
      // Only the latest response can be retried, and only once it settled.
      if (
        !conversation ||
        last?.role !== 'assistant' ||
        last.id !== target.messageId ||
        (last.status !== 'error' && last.status !== 'stopped')
      ) {
        return state;
      }
      const retried: AssistantMessage = {
        id: last.id,
        role: 'assistant',
        content: '',
        createdAt: last.createdAt,
        status: 'streaming',
        requestId: target.requestId,
      };
      return replaceConversation(state, {
        ...conversation,
        updatedAt: now,
        messages: [...conversation.messages.slice(0, -1), retried],
      });
    }
  }
}

export function isStreaming(conversation: Conversation): boolean {
  const last = conversation.messages.at(-1);
  return last?.role === 'assistant' && last.status === 'streaming';
}

function updateStreaming(
  state: ChatState,
  target: StreamTarget,
  now: number | undefined,
  update: (message: AssistantMessage) => AssistantMessage,
): ChatState {
  const conversation = state.conversations[target.conversationId];
  if (!conversation) return state;
  const index = conversation.messages.findIndex(
    (m) => m.id === target.messageId,
  );
  const message = conversation.messages[index];
  if (
    message?.role !== 'assistant' ||
    message.status !== 'streaming' ||
    message.requestId !== target.requestId
  ) {
    return state;
  }
  const messages = conversation.messages.slice();
  messages[index] = update(message);
  return replaceConversation(state, {
    ...conversation,
    messages,
    updatedAt: now ?? conversation.updatedAt,
  });
}

function replaceConversation(
  state: ChatState,
  conversation: Conversation,
): ChatState {
  return {
    ...state,
    conversations: { ...state.conversations, [conversation.id]: conversation },
  };
}

/**
 * Merges state written by another tab: per conversation, the newer
 * `updatedAt` wins; deletions (tombstones) win over older copies. Keeps
 * local objects on ties, and returns `state` itself when nothing changed, so
 * tabs don't ping-pong saves.
 */
export function mergeExternal(
  state: ChatState,
  incoming: PersistedChat,
): ChatState {
  const deleted = { ...state.deleted };
  let changed = false;
  for (const [id, at] of Object.entries(incoming.deleted)) {
    if ((deleted[id] ?? 0) < at) {
      deleted[id] = at;
      changed = true;
    }
  }

  const conversations: Record<string, Conversation> = {};
  const ids = new Set([
    ...Object.keys(state.conversations),
    ...Object.keys(incoming.conversations),
  ]);
  for (const id of ids) {
    const local = state.conversations[id];
    const remote = incoming.conversations[id];
    const winner =
      !local || (remote && remote.updatedAt > local.updatedAt) ? remote : local;
    if (!winner || (deleted[id] ?? -1) >= winner.updatedAt) {
      if (local) changed = true;
      continue;
    }
    if (winner !== local) changed = true;
    conversations[id] = winner;
  }

  if (!changed) return state;
  const activeId =
    state.activeId && conversations[state.activeId] ? state.activeId : null;
  return { ...state, conversations, deleted, activeId };
}
