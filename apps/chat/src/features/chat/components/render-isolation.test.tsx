import { act, render } from '@testing-library/react';
import { Profiler } from 'react';
import { createFakeFetch } from '@/test/fake-fetch';
import { ChatController } from '../api/chat-controller';
import { initialChatState } from '../domain/reducer';
import { ChatControllerContext, ChatStoreContext } from '../store/chat-context';
import { createChatStore } from '../store/chat-store';
import { MessageItem } from './MessageItem';
import { Sidebar } from './Sidebar';

describe('render isolation while streaming', () => {
  it('re-renders only the streaming message, not the sidebar or earlier messages', async () => {
    const store = createChatStore({ ...initialChatState, hydrated: true });
    const { fetchImpl, calls } = createFakeFetch();
    const controller = new ChatController(store, {
      fetchImpl,
      scheduleFlush: (flush) => flush(),
    });
    const conversationId = controller.send('Question')!;
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    const renders: Record<string, number> = {};
    const onRender = (id: string) => {
      renders[id] = (renders[id] ?? 0) + 1;
    };
    render(
      <ChatStoreContext value={store}>
        <ChatControllerContext value={controller}>
          <Profiler id="sidebar" onRender={onRender}>
            <Sidebar />
          </Profiler>
          <Profiler id="user-message" onRender={onRender}>
            <MessageItem
              conversationId={conversationId}
              index={0}
              isLast={false}
              onRetry={vi.fn()}
            />
          </Profiler>
          <Profiler id="reply" onRender={onRender}>
            <MessageItem
              conversationId={conversationId}
              index={1}
              isLast
              onRetry={vi.fn()}
            />
          </Profiler>
        </ChatControllerContext>
      </ChatStoreContext>,
    );
    const before = { ...renders };

    for (const text of ['one ', 'two ', 'three']) {
      await act(async () => {
        calls[0]!.stream.send({ type: 'delta', text });
        await vi.waitFor(() =>
          expect(
            store.getState().conversations[conversationId]?.messages[1]
              ?.content,
          ).toContain(text),
        );
      });
    }

    expect(renders.sidebar).toBe(before.sidebar);
    expect(renders['user-message']).toBe(before['user-message']);
    expect(renders.reply).toBeGreaterThanOrEqual((before.reply ?? 0) + 3);
  });
});
