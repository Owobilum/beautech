import { act, screen, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { STORAGE_KEY } from '../persistence/storage';
import { ChatApp } from './ChatApp';

describe('hydration', () => {
  it('hydrates server HTML without mismatches, then shows saved conversations', async () => {
    // Server render: no window storage involved, initial state only.
    const html = renderToString(<ChatApp />);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeId: 'c1',
        deleted: {},
        conversations: [
          {
            id: 'c1',
            title: 'Saved chat',
            createdAt: 1,
            updatedAt: 1,
            messages: [
              { id: 'u1', role: 'user', content: 'Hello', createdAt: 1 },
              {
                id: 'a1',
                role: 'assistant',
                content: 'Restored reply',
                createdAt: 1,
                status: 'complete',
                requestId: 'r1',
              },
            ],
          },
        ],
      }),
    );
    localStorage.setItem('owobilum-chat:theme', 'dark');
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, 'error');

    const root = await act(async () =>
      hydrateRoot(container, <ChatApp />, { onRecoverableError }),
    );

    await waitFor(() =>
      expect(screen.getByText('Restored reply')).toBeInTheDocument(),
    );
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(
      consoleError.mock.calls.filter(([message]) =>
        /hydrat|didn't match/i.test(String(message)),
      ),
    ).toEqual([]);
    act(() => root.unmount());
    container.remove();
  });
});
