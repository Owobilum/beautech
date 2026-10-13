import type { ChatErrorCode } from '@/lib/shared/chat-schema';

export type MessageError = {
  code: ChatErrorCode;
  message: string;
  retryable: boolean;
};

export type UserMessage = {
  id: string;
  role: 'user';
  content: string;
  createdAt: number;
};

/**
 * - `streaming`: a request is in flight and `content` grows
 * - `complete`: finished normally
 * - `error`: failed; `content` keeps any partial text
 * - `stopped`: cancelled by the user (or interrupted by a reload); `content`
 *   keeps any partial text
 */
export type AssistantStatus = 'streaming' | 'complete' | 'error' | 'stopped';

export type AssistantMessage = {
  id: string;
  role: 'assistant';
  content: string;
  createdAt: number;
  status: AssistantStatus;
  /**
   * Identifies the request currently allowed to write to this message. A
   * retry issues a new one, so late events from an old request are ignored.
   */
  requestId: string;
  error?: MessageError;
};

export type Message = UserMessage | AssistantMessage;

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  /** Bumped when a message is sent or a response settles (not per token). */
  updatedAt: number;
  messages: Message[];
};

export type ChatState = {
  /** False until persisted state has been loaded (always false on the server). */
  hydrated: boolean;
  conversations: Record<string, Conversation>;
  /** The open conversation, or null for a new, not-yet-sent chat. */
  activeId: string | null;
  /** Deleted conversation ids → deletion time, so other tabs can't revive them. */
  deleted: Record<string, number>;
  /** Why history isn't being saved, if it isn't (not persisted itself). */
  storageProblem: StorageProblem | null;
};

export type StorageProblem = 'quota' | 'unavailable';

/** Addresses one response attempt: the target message and its request. */
export type StreamTarget = {
  conversationId: string;
  messageId: string;
  requestId: string;
};
