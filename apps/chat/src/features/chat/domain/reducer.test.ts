import {
  chatReducer,
  initialChatState,
  mergeExternal,
  type ChatAction,
} from './reducer';
import type { AssistantMessage, ChatState, StreamTarget } from './types';

const hydrated: ChatState = { ...initialChatState, hydrated: true };

function run(state: ChatState, ...actions: ChatAction[]) {
  return actions.reduce(chatReducer, state);
}

const target = (
  conversationId = 'c1',
  messageId = 'a1',
  requestId = 'r1',
): StreamTarget => ({
  conversationId,
  messageId,
  requestId,
});

const submit = (
  t: StreamTarget,
  content = 'Hello there',
  now = 1,
): ChatAction => ({
  type: 'messageSubmitted',
  target: t,
  userMessageId: `u-${t.messageId}`,
  content,
  now,
});

function assistant(state: ChatState, conversationId = 'c1', messageId = 'a1') {
  return state.conversations[conversationId]?.messages.find(
    (m) => m.id === messageId,
  ) as AssistantMessage | undefined;
}

describe('chatReducer', () => {
  describe('sending', () => {
    it('creates a conversation titled from the first message', () => {
      const state = run(hydrated, submit(target(), 'What is a closure?'));
      const conversation = state.conversations.c1;

      expect(state.activeId).toBe('c1');
      expect(conversation?.title).toBe('What is a closure?');
      expect(conversation?.messages.map((m) => m.role)).toEqual([
        'user',
        'assistant',
      ]);
      expect(assistant(state)).toMatchObject({
        status: 'streaming',
        content: '',
      });
    });

    it('keeps the title when more messages are sent', () => {
      const state = run(hydrated, submit(target(), 'First question'), {
        type: 'streamCompleted',
        target: target(),
        now: 2,
      });
      const afterDelta = run(state, {
        type: 'deltaReceived',
        target: target(),
        text: 'x',
      });
      const next = run(
        { ...afterDelta },
        submit(target('c1', 'a2', 'r2'), 'Second question', 3),
      );

      expect(next.conversations.c1?.title).toBe('First question');
      expect(next.conversations.c1?.messages).toHaveLength(4);
    });

    it('rejects a second message while a response is streaming', () => {
      const state = run(hydrated, submit(target()));

      expect(run(state, submit(target('c1', 'a2', 'r2')))).toBe(state);
    });

    it('does not recreate a deleted conversation', () => {
      const state = run(hydrated, submit(target()), {
        type: 'conversationDeleted',
        conversationId: 'c1',
        now: 5,
      });

      expect(run(state, submit(target('c1', 'a2', 'r2')))).toBe(state);
    });
  });

  describe('streaming', () => {
    it('appends deltas in order and completes', () => {
      const state = run(
        hydrated,
        submit(target()),
        { type: 'deltaReceived', target: target(), text: 'Hel' },
        { type: 'deltaReceived', target: target(), text: 'lo' },
        { type: 'streamCompleted', target: target(), now: 9 },
      );

      expect(assistant(state)).toMatchObject({
        content: 'Hello',
        status: 'complete',
      });
      expect(state.conversations.c1?.updatedAt).toBe(9);
    });

    it('treats a completed response with no text as an error', () => {
      const state = run(hydrated, submit(target()), {
        type: 'streamCompleted',
        target: target(),
        now: 2,
      });

      expect(assistant(state)).toMatchObject({
        status: 'error',
        error: { code: 'empty_response' },
      });
    });

    it('keeps partial text when a response fails or is stopped', () => {
      const partial = run(hydrated, submit(target()), {
        type: 'deltaReceived',
        target: target(),
        text: 'Partial',
      });
      const failed = run(partial, {
        type: 'streamFailed',
        target: target(),
        error: { code: 'network', message: 'Network error', retryable: true },
        now: 2,
      });
      const stopped = run(partial, {
        type: 'streamStopped',
        target: target(),
        now: 2,
      });

      expect(assistant(failed)).toMatchObject({
        status: 'error',
        content: 'Partial',
      });
      expect(assistant(stopped)).toMatchObject({
        status: 'stopped',
        content: 'Partial',
      });
    });

    it('ignores events from a stale request', () => {
      const state = run(hydrated, submit(target()));
      const stale = target('c1', 'a1', 'old-request');

      expect(
        run(state, { type: 'deltaReceived', target: stale, text: 'x' }),
      ).toBe(state);
      expect(
        run(state, { type: 'streamCompleted', target: stale, now: 2 }),
      ).toBe(state);
    });

    it('ignores late deltas after a stop', () => {
      const stopped = run(hydrated, submit(target()), {
        type: 'streamStopped',
        target: target(),
        now: 2,
      });

      expect(
        run(stopped, { type: 'deltaReceived', target: target(), text: 'late' }),
      ).toBe(stopped);
    });

    it('ignores events for a deleted conversation', () => {
      const deleted = run(hydrated, submit(target()), {
        type: 'conversationDeleted',
        conversationId: 'c1',
        now: 2,
      });

      expect(
        run(deleted, { type: 'deltaReceived', target: target(), text: 'x' }),
      ).toBe(deleted);
    });

    it('never writes a response into another conversation', () => {
      const state = run(
        hydrated,
        submit(target('c1', 'a1', 'r1'), 'one'),
        submit(target('c2', 'a2', 'r2'), 'two'),
        {
          type: 'deltaReceived',
          target: target('c1', 'a1', 'r1'),
          text: 'for one',
        },
        {
          type: 'deltaReceived',
          target: target('c2', 'a2', 'r2'),
          text: 'for two',
        },
      );

      expect(assistant(state, 'c1', 'a1')?.content).toBe('for one');
      expect(assistant(state, 'c2', 'a2')?.content).toBe('for two');
      expect(state.activeId).toBe('c2');
    });
  });

  describe('retry', () => {
    const failed = run(
      hydrated,
      submit(target()),
      { type: 'deltaReceived', target: target(), text: 'Partial' },
      {
        type: 'streamFailed',
        target: target(),
        error: { code: 'network', message: 'Network error', retryable: true },
        now: 2,
      },
    );

    it('restarts the same message with a new request, without duplicating', () => {
      const retried = run(failed, {
        type: 'retryRequested',
        target: target('c1', 'a1', 'r2'),
        now: 3,
      });
      const messages = retried.conversations.c1?.messages ?? [];

      expect(messages).toHaveLength(2);
      expect(assistant(retried)).toMatchObject({
        status: 'streaming',
        content: '',
        requestId: 'r2',
      });
      expect(assistant(retried)?.error).toBeUndefined();
      // The failed attempt can no longer write.
      expect(
        run(retried, { type: 'deltaReceived', target: target(), text: 'x' }),
      ).toBe(retried);
    });

    it('only retries the latest settled response', () => {
      const streaming = run(hydrated, submit(target()));

      expect(
        run(streaming, {
          type: 'retryRequested',
          target: target('c1', 'a1', 'r2'),
          now: 3,
        }),
      ).toBe(streaming);
      expect(
        run(failed, {
          type: 'retryRequested',
          target: target('c1', 'nope', 'r2'),
          now: 3,
        }),
      ).toBe(failed);
    });
  });

  describe('conversation management', () => {
    const twoChats = run(
      hydrated,
      submit(target('c1', 'a1', 'r1'), 'one'),
      { type: 'streamCompleted', target: target('c1', 'a1', 'r1'), now: 1 },
      { type: 'deltaReceived', target: target('c1', 'a1', 'r1'), text: '' },
      submit(target('c2', 'a2', 'r2'), 'two', 2),
    );

    it('switches the active conversation', () => {
      const state = run(twoChats, {
        type: 'conversationSelected',
        conversationId: 'c1',
      });

      expect(state.activeId).toBe('c1');
      expect(
        run(state, { type: 'conversationSelected', conversationId: 'missing' }),
      ).toBe(state);
    });

    it('starts a new chat without creating an empty conversation', () => {
      const state = run(twoChats, { type: 'newChat' });

      expect(state.activeId).toBeNull();
      expect(Object.keys(state.conversations)).toHaveLength(2);
      expect(run(state, { type: 'newChat' })).toBe(state);
    });

    it('deletes a conversation and records a tombstone', () => {
      const state = run(twoChats, {
        type: 'conversationDeleted',
        conversationId: 'c2',
        now: 10,
      });

      expect(state.conversations.c2).toBeUndefined();
      expect(state.activeId).toBeNull();
      expect(state.deleted.c2).toBe(10);
    });
  });
});

describe('mergeExternal', () => {
  const base = run(hydrated, submit(target('c1', 'a1', 'r1'), 'one', 1), {
    type: 'streamCompleted',
    target: target('c1', 'a1', 'r1'),
    now: 1,
  });

  it('returns the same state when nothing is newer', () => {
    expect(
      mergeExternal(base, {
        conversations: { ...base.conversations },
        activeId: null,
        deleted: {},
      }),
    ).toBe(base);
  });

  it('takes newer conversations from another tab, and keeps newer local ones', () => {
    const local = base.conversations.c1!;
    const newerRemote = { ...local, title: 'Renamed', updatedAt: 50 };
    const olderRemote = { ...local, title: 'Stale', updatedAt: 0 };

    expect(
      mergeExternal(base, {
        conversations: { c1: newerRemote },
        activeId: null,
        deleted: {},
      }).conversations.c1?.title,
    ).toBe('Renamed');
    expect(
      mergeExternal(base, {
        conversations: { c1: olderRemote },
        activeId: null,
        deleted: {},
      }),
    ).toBe(base);
  });

  it('applies deletions from another tab and never revives deleted conversations', () => {
    const deletedElsewhere = mergeExternal(base, {
      conversations: {},
      activeId: null,
      deleted: { c1: 100 },
    });
    const staleCopy = mergeExternal(deletedElsewhere, {
      conversations: { c1: base.conversations.c1! },
      activeId: 'c1',
      deleted: {},
    });

    expect(deletedElsewhere.conversations.c1).toBeUndefined();
    expect(deletedElsewhere.activeId).toBeNull();
    expect(staleCopy.conversations.c1).toBeUndefined();
  });
});
