import { LIMITS } from '@/lib/shared/chat-schema';
import {
  buildRequestMessages,
  sameSummaries,
  selectConversationList,
} from './selectors';
import type {
  AssistantMessage,
  ChatState,
  Conversation,
  Message,
} from './types';

let id = 0;
const user = (content: string): Message => ({
  id: `m${++id}`,
  role: 'user',
  content,
  createdAt: id,
});
const reply = (
  content: string,
  status: AssistantMessage['status'] = 'complete',
): Message => ({
  id: `m${++id}`,
  role: 'assistant',
  content,
  createdAt: id,
  status,
  requestId: 'r',
});

const conversation = (messages: Message[]): Conversation => ({
  id: 'c',
  title: 't',
  createdAt: 0,
  updatedAt: 0,
  messages,
});

describe('buildRequestMessages', () => {
  it('sends the history before the target response', () => {
    const pending = reply('', 'streaming');
    const messages = [user('a'), reply('b'), user('c'), pending];

    expect(buildRequestMessages(conversation(messages), pending.id)).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ]);
  });

  it('drops failed or empty replies but keeps stopped partial text', () => {
    const pending = reply('', 'streaming');
    const messages = [
      user('a'),
      reply('broken', 'error'),
      user('b'),
      reply('partial', 'stopped'),
      user('c'),
      pending,
    ];

    expect(
      buildRequestMessages(conversation(messages), pending.id).map(
        (m) => m.content,
      ),
    ).toEqual(['a', 'b', 'partial', 'c']);
  });

  it('trims the oldest messages to fit the limits, starting with a user turn', () => {
    const big = 'x'.repeat(LIMITS.maxUserMessageChars);
    const pending = reply('', 'streaming');
    const messages = [
      ...Array.from({ length: 6 }, () => [user(big), reply(big)]).flat(),
      user('latest'),
      pending,
    ];

    const turns = buildRequestMessages(conversation(messages), pending.id);
    const total = turns.reduce((sum, t) => sum + t.content.length, 0);

    expect(total).toBeLessThanOrEqual(LIMITS.maxTotalChars);
    expect(turns[0]?.role).toBe('user');
    expect(turns.at(-1)?.content).toBe('latest');
  });
});

describe('selectConversationList', () => {
  it('orders by most recent activity and compares by id and title', () => {
    const state = {
      conversations: {
        a: { ...conversation([]), id: 'a', title: 'A', updatedAt: 1 },
        b: { ...conversation([]), id: 'b', title: 'B', updatedAt: 2 },
      },
    } as unknown as ChatState;

    const list = selectConversationList(state);

    expect(list).toEqual([
      { id: 'b', title: 'B' },
      { id: 'a', title: 'A' },
    ]);
    expect(sameSummaries(list, selectConversationList(state))).toBe(true);
  });
});
