import { chatRequestSchema, findLimitViolation, LIMITS } from './chat-schema';

describe('chat request validation', () => {
  it('accepts a conversation ending with a user message', () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Thanks' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ['no messages', { messages: [] }],
    [
      'an assistant message last',
      { messages: [{ role: 'assistant', content: 'x' }] },
    ],
    ['an unknown role', { messages: [{ role: 'system', content: 'x' }] }],
    ['empty content', { messages: [{ role: 'user', content: '' }] }],
    ['a missing messages field', {}],
  ])('rejects %s', (_case, body) => {
    expect(chatRequestSchema.safeParse(body).success).toBe(false);
  });

  it('flags oversized messages and conversations', () => {
    const user = (length: number) => ({
      role: 'user' as const,
      content: 'x'.repeat(length),
    });

    expect(
      findLimitViolation([user(LIMITS.maxUserMessageChars)]),
    ).toBeUndefined();
    expect(findLimitViolation([user(LIMITS.maxUserMessageChars + 1)])).toMatch(
      /exceeds/,
    );
    expect(
      findLimitViolation(
        Array.from({ length: LIMITS.maxMessages + 1 }, () => user(1)),
      ),
    ).toMatch(/Too many/);
    expect(
      findLimitViolation(
        Array.from({ length: 8 }, () => user(LIMITS.maxUserMessageChars)),
      ),
    ).toMatch(/Conversation exceeds/);
  });
});
