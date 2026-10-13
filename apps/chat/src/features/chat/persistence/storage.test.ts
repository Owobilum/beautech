import {
  chatReducer,
  initialChatState,
  mergeExternal,
} from '../domain/reducer';
import type { ChatState } from '../domain/types';
import { parsePersisted, saveState, serialize, STORAGE_KEY } from './storage';

function stateWithStreamingReply(): ChatState {
  const target = { conversationId: 'c1', messageId: 'a1', requestId: 'r1' };
  let state = chatReducer(
    { ...initialChatState, hydrated: true },
    {
      type: 'messageSubmitted',
      target,
      userMessageId: 'u1',
      content: 'Hi',
      now: 1,
    },
  );
  state = chatReducer(state, {
    type: 'deltaReceived',
    target,
    text: 'Partial',
  });
  return state;
}

describe('persistence', () => {
  it('round-trips conversations and the active id', () => {
    const state = stateWithStreamingReply();

    const restored = parsePersisted(serialize(state, 0), {
      interruptStreaming: false,
    });

    expect(restored.conversations).toEqual(state.conversations);
    expect(restored.activeId).toBe('c1');
  });

  it('marks responses that were streaming at reload as stopped, keeping partial text', () => {
    const restored = parsePersisted(serialize(stateWithStreamingReply(), 0), {
      interruptStreaming: true,
    });

    expect(restored.conversations.c1?.messages[1]).toMatchObject({
      status: 'stopped',
      content: 'Partial',
    });
  });

  it.each([
    ['missing', null],
    ['not JSON', '{oops'],
    ['an unknown version', JSON.stringify({ version: 2, conversations: [] })],
    ['the wrong shape', JSON.stringify({ version: 1, conversations: 'x' })],
  ])('starts empty when stored data is %s', (_case, raw) => {
    expect(parsePersisted(raw, { interruptStreaming: true })).toEqual({
      conversations: {},
      activeId: null,
      deleted: {},
    });
  });

  it('drops an active id that points at no conversation', () => {
    const raw = JSON.stringify({
      version: 1,
      activeId: 'gone',
      conversations: [],
      deleted: {},
    });

    expect(
      parsePersisted(raw, { interruptStreaming: true }).activeId,
    ).toBeNull();
  });

  it('merges with stored data instead of overwriting newer state from another tab', () => {
    const storage = window.localStorage;
    const mine = stateWithStreamingReply();
    // Another tab saved a conversation this tab has never seen.
    const other = {
      ...mine,
      conversations: {
        c2: {
          id: 'c2',
          title: 'Other tab',
          createdAt: 5,
          updatedAt: 5,
          messages: [],
        },
      },
    };
    storage.setItem(STORAGE_KEY, serialize(other, 0));

    expect(saveState(storage, mine, mergeExternal, 0)).toEqual({ ok: true });

    const saved = parsePersisted(storage.getItem(STORAGE_KEY), {
      interruptStreaming: false,
    });
    expect(Object.keys(saved.conversations).sort()).toEqual(['c1', 'c2']);
  });

  it('does not revive a conversation deleted in another tab', () => {
    const storage = window.localStorage;
    const stale = stateWithStreamingReply();
    storage.setItem(
      STORAGE_KEY,
      serialize({ ...stale, conversations: {}, deleted: { c1: 100 } }, 0),
    );

    saveState(storage, stale, mergeExternal, 0);

    const saved = parsePersisted(storage.getItem(STORAGE_KEY), {
      interruptStreaming: false,
    });
    expect(saved.conversations.c1).toBeUndefined();
  });

  it('reports a full storage quota', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    } as unknown as Storage;

    expect(
      saveState(storage, stateWithStreamingReply(), mergeExternal, 0),
    ).toEqual({
      ok: false,
      reason: 'quota',
    });
  });

  it('expires old tombstones', () => {
    const state = {
      ...initialChatState,
      deleted: { old: 0, recent: 40 * 864e5 },
    };

    const saved = JSON.parse(serialize(state, 41 * 864e5));

    expect(saved.deleted).toEqual({ recent: 40 * 864e5 });
  });
});
