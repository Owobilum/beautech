import { createFakeFetch, jsonError } from '@/test/fake-fetch';
import { initialChatState } from '../domain/reducer';
import type { AssistantMessage } from '../domain/types';
import { createChatStore } from '../store/chat-store';
import { ChatController } from './chat-controller';

function setup(respond?: Parameters<typeof createFakeFetch>[0]) {
  const store = createChatStore({ ...initialChatState, hydrated: true });
  const { fetchImpl, calls } = createFakeFetch(respond);
  let id = 0;
  const controller = new ChatController(store, {
    fetchImpl,
    createId: () => `id${++id}`,
    now: () => id,
    // Flush deltas synchronously so tests can observe each update.
    scheduleFlush: (flush) => flush(),
  });
  const reply = (conversationId: string) =>
    store.getState().conversations[conversationId]?.messages.at(-1) as
      AssistantMessage | undefined;
  return { store, controller, calls, reply };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ChatController', () => {
  it('sends a message and streams the reply incrementally', async () => {
    const { controller, calls, reply } = setup();

    const conversationId = controller.send('  Hello  ')!;
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.body.messages).toEqual([
      { role: 'user', content: 'Hello' },
    ]);

    calls[0]!.stream.send({ type: 'delta', text: 'Hi ' });
    await vi.waitFor(() => expect(reply(conversationId)?.content).toBe('Hi '));
    calls[0]!.stream.send({ type: 'delta', text: 'there' });
    await vi.waitFor(() =>
      expect(reply(conversationId)?.content).toBe('Hi there'),
    );
    calls[0]!.stream.send({ type: 'done' });
    calls[0]!.stream.close();

    await vi.waitFor(() =>
      expect(reply(conversationId)?.status).toBe('complete'),
    );
  });

  it('ignores blank, oversized and duplicate submissions', async () => {
    const { controller, calls } = setup();

    expect(controller.send('   ')).toBeUndefined();
    expect(controller.send('x'.repeat(8_001))).toBeUndefined();
    controller.send('first');
    expect(controller.send('second')).toBeUndefined();
    await settle();

    expect(calls).toHaveLength(1);
  });

  it('stops a response, aborting the request and keeping partial text', async () => {
    const { controller, calls, reply } = setup();
    const conversationId = controller.send('Hello')!;
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    calls[0]!.stream.send({ type: 'delta', text: 'Partial' });
    await vi.waitFor(() =>
      expect(reply(conversationId)?.content).toBe('Partial'),
    );

    controller.stop(conversationId);

    expect(calls[0]!.signal.aborted).toBe(true);
    expect(reply(conversationId)).toMatchObject({
      status: 'stopped',
      content: 'Partial',
    });
    await settle();
    expect(reply(conversationId)?.status).toBe('stopped');
  });

  it('marks failed responses with a retryable error', async () => {
    const { controller, reply } = setup(() =>
      jsonError(502, 'provider_unavailable', 'Unavailable'),
    );

    const conversationId = controller.send('Hello')!;

    await vi.waitFor(() =>
      expect(reply(conversationId)).toMatchObject({
        status: 'error',
        error: { code: 'provider_unavailable', retryable: true },
      }),
    );
  });

  it('retries in place, resending the same history without duplicating messages', async () => {
    const { controller, calls, reply, store } = setup((_call, index) =>
      index === 0
        ? jsonError(502, 'provider_unavailable', 'Unavailable')
        : undefined,
    );
    const conversationId = controller.send('Hello')!;
    await vi.waitFor(() => expect(reply(conversationId)?.status).toBe('error'));
    const failedId = reply(conversationId)!.id;

    controller.retry(conversationId, failedId);
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1]!.stream.send({ type: 'delta', text: 'Recovered' });
    calls[1]!.stream.send({ type: 'done' });
    calls[1]!.stream.close();

    await vi.waitFor(() =>
      expect(reply(conversationId)?.status).toBe('complete'),
    );
    expect(calls[1]!.body).toEqual(calls[0]!.body);
    const messages = store.getState().conversations[conversationId]!.messages;
    expect(messages).toHaveLength(2);
    expect(messages[1]).toMatchObject({ id: failedId, content: 'Recovered' });
  });

  it('keeps a background response in its own conversation when switching', async () => {
    const { controller, calls, store, reply } = setup();
    const first = controller.send('First chat')!;
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    store.dispatch({ type: 'newChat' });
    const second = controller.send('Second chat')!;
    await vi.waitFor(() => expect(calls).toHaveLength(2));

    calls[0]!.stream.send({ type: 'delta', text: 'answer one' });
    calls[1]!.stream.send({ type: 'delta', text: 'answer two' });
    for (const call of calls) {
      call.stream.send({ type: 'done' });
      call.stream.close();
    }

    await vi.waitFor(() => expect(reply(first)?.status).toBe('complete'));
    await vi.waitFor(() => expect(reply(second)?.status).toBe('complete'));
    expect(reply(first)?.content).toBe('answer one');
    expect(reply(second)?.content).toBe('answer two');
    expect(store.getState().activeId).toBe(second);
  });

  it('aborts the request when its conversation is deleted', async () => {
    const { controller, calls, store } = setup();
    const conversationId = controller.send('Hello')!;
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    controller.deleteConversation(conversationId);
    await settle();

    expect(calls[0]!.signal.aborted).toBe(true);
    expect(store.getState().conversations[conversationId]).toBeUndefined();
  });

  it('aborts everything on dispose', async () => {
    const { controller, calls, store } = setup();
    controller.send('one');
    store.dispatch({ type: 'newChat' });
    controller.send('two');
    await vi.waitFor(() => expect(calls).toHaveLength(2));

    controller.dispose();

    expect(calls.every((call) => call.signal.aborted)).toBe(true);
  });

  it('batches deltas into one store update per flush', async () => {
    const store = createChatStore({ ...initialChatState, hydrated: true });
    const { fetchImpl, calls } = createFakeFetch();
    const flushes: (() => void)[] = [];
    const controller = new ChatController(store, {
      fetchImpl,
      scheduleFlush: (flush) => flushes.push(flush),
    });
    const conversationId = controller.send('Hello')!;
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const listener = vi.fn();
    store.subscribe(listener);

    for (const text of ['a', 'b', 'c'])
      calls[0]!.stream.send({ type: 'delta', text });
    await vi.waitFor(() => expect(flushes).toHaveLength(1));
    await settle();
    flushes[0]!();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(
      store.getState().conversations[conversationId]?.messages.at(-1)?.content,
    ).toBe('abc');
  });
});
