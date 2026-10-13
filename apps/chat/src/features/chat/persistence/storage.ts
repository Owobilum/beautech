import { z } from 'zod';
import { chatErrorCodeSchema } from '@/lib/shared/chat-schema';
import type { PersistedChat } from '../domain/reducer';
import type { ChatState, Conversation, StorageProblem } from '../domain/types';

export const STORAGE_KEY = 'owobilum-chat:v1';
/** Tombstones older than this are dropped; no stale tab lives that long. */
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const messageSchema = z.discriminatedUnion('role', [
  z.object({
    id: z.string(),
    role: z.literal('user'),
    content: z.string(),
    createdAt: z.number(),
  }),
  z.object({
    id: z.string(),
    role: z.literal('assistant'),
    content: z.string(),
    createdAt: z.number(),
    status: z.enum(['streaming', 'complete', 'error', 'stopped']),
    requestId: z.string(),
    error: z
      .object({
        code: chatErrorCodeSchema,
        message: z.string(),
        retryable: z.boolean(),
      })
      .optional(),
  }),
]);

const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  messages: z.array(messageSchema),
});

const persistedSchema = z.object({
  version: z.literal(1),
  activeId: z.string().nullable(),
  conversations: z.array(conversationSchema),
  deleted: z.record(z.string(), z.number()),
});
type PersistedV1 = z.infer<typeof persistedSchema>;

export const emptyPersisted: PersistedChat = {
  conversations: {},
  activeId: null,
  deleted: {},
};

/**
 * Parses stored state. Corrupt or unknown data yields an empty state rather
 * than an error: losing local history is better than a broken app.
 * `interruptStreaming` marks responses that were streaming when the page
 * closed as stopped (their request is gone); leave it off when reading
 * another live tab's state, whose requests may still be running.
 */
export function parsePersisted(
  raw: string | null,
  { interruptStreaming }: { interruptStreaming: boolean },
): PersistedChat {
  if (!raw) return emptyPersisted;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyPersisted;
  }
  const parsed = persistedSchema.safeParse(json);
  if (!parsed.success) return emptyPersisted;

  const conversations: Record<string, Conversation> = {};
  for (const conversation of parsed.data.conversations) {
    conversations[conversation.id] = interruptStreaming
      ? {
          ...conversation,
          messages: conversation.messages.map((m) =>
            m.role === 'assistant' && m.status === 'streaming'
              ? { ...m, status: 'stopped' as const }
              : m,
          ),
        }
      : conversation;
  }
  const activeId =
    parsed.data.activeId && conversations[parsed.data.activeId]
      ? parsed.data.activeId
      : null;
  return { conversations, activeId, deleted: parsed.data.deleted };
}

export function serialize(state: PersistedChat, now: number): string {
  const deleted = Object.fromEntries(
    Object.entries(state.deleted).filter(
      ([, at]) => now - at < TOMBSTONE_TTL_MS,
    ),
  );
  const data: PersistedV1 = {
    version: 1,
    activeId: state.activeId,
    conversations: Object.values(state.conversations).sort(
      (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    ),
    deleted,
  };
  return JSON.stringify(data);
}

export type SaveResult = { ok: true } | { ok: false; reason: StorageProblem };

/**
 * Writes `state` merged with what is already stored, so a tab holding stale
 * data can never overwrite newer conversations (or revive deleted ones)
 * written by another tab. Skips the write when nothing changed.
 */
export function saveState(
  storage: Storage,
  state: ChatState,
  merge: (state: ChatState, stored: PersistedChat) => ChatState,
  now: number,
): SaveResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    const stored = parsePersisted(raw, { interruptStreaming: false });
    const merged = merge(state, stored);
    const next = serialize(merged, now);
    if (next !== raw) storage.setItem(STORAGE_KEY, next);
    return { ok: true };
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22);
    return { ok: false, reason: quota ? 'quota' : 'unavailable' };
  }
}

/** localStorage, or null where it is missing or blocked (e.g. privacy modes). */
export function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
