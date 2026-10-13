import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeFetch, jsonError, type FakeCall } from '@/test/fake-fetch';
import { STORAGE_KEY } from '../persistence/storage';
import { ChatApp } from './ChatApp';

function setup(respond?: Parameters<typeof createFakeFetch>[0]) {
  const user = userEvent.setup();
  const fake = createFakeFetch(respond);
  const view = render(<ChatApp fetchImpl={fake.fetchImpl} />);
  return { user, ...fake, ...view };
}

const composer = () => screen.getByRole('textbox', { name: 'Message' });
const conversations = () =>
  screen.getAllByRole('navigation', { name: 'Conversations' })[0]!;
const status = () =>
  screen
    .getAllByRole('status')
    .find((el) => el.getAttribute('aria-live') === 'polite')!;

async function finish(call: FakeCall, text: string) {
  act(() => {
    call.stream.send({ type: 'delta', text });
    call.stream.send({ type: 'done' });
    call.stream.close();
  });
  // Rendered Markdown can split text across elements: match by substring.
  await waitFor(() =>
    expect(
      screen
        .queryAllByRole('article', { name: 'Assistant' })
        .some((article) => article.textContent?.includes(text)),
    ).toBe(true),
  );
}

async function waitForHydration() {
  await waitFor(() => expect(composer()).toBeEnabled());
}

describe('ChatApp', () => {
  it('shows the empty state, then sends a message and streams the reply', async () => {
    const { user, calls } = setup();
    await waitForHydration();
    expect(
      screen.getByRole('heading', { name: 'How can I help?' }),
    ).toBeInTheDocument();

    await user.type(composer(), 'What is a closure?{Enter}');

    expect(screen.getByRole('article', { name: 'You' })).toHaveTextContent(
      'What is a closure?',
    );
    expect(composer()).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Stop response' }),
    ).toBeInTheDocument();
    expect(
      within(conversations()).getByRole('button', {
        name: 'What is a closure?',
      }),
    ).toHaveAttribute('aria-current', 'page');
    await waitFor(() =>
      expect(status()).toHaveTextContent('Assistant is responding'),
    );

    act(() =>
      calls[0]!.stream.send({ type: 'delta', text: 'A closure **captures** ' }),
    );
    expect(await screen.findByText('captures')).toBeInTheDocument();
    await finish(calls[0]!, 'variables.');

    expect(
      screen.getByRole('article', { name: 'Assistant' }),
    ).toHaveTextContent('A closure captures variables.');
    await waitFor(() =>
      expect(status()).toHaveTextContent('Response complete.'),
    );
    expect(
      screen.getByRole('button', { name: 'Send message' }),
    ).toBeInTheDocument();
  });

  it('inserts a newline with Shift+Enter instead of sending', async () => {
    const { user, calls } = setup();
    await waitForHydration();

    await user.type(composer(), 'line 1{Shift>}{Enter}{/Shift}line 2');

    expect(composer()).toHaveValue('line 1\nline 2');
    expect(calls).toHaveLength(0);
  });

  it('stops a response, keeping the partial text and allowing a retry', async () => {
    const { user, calls } = setup();
    await waitForHydration();
    await user.type(composer(), 'Tell me a story{Enter}');
    act(() => calls[0]!.stream.send({ type: 'delta', text: 'Once upon' }));
    await screen.findByText('Once upon');

    await user.click(screen.getByRole('button', { name: 'Stop response' }));

    expect(calls[0]!.signal.aborted).toBe(true);
    const reply = screen.getByRole('article', { name: 'Assistant' });
    expect(within(reply).getByText('Response stopped.')).toBeInTheDocument();
    expect(within(reply).getByText('Once upon')).toBeInTheDocument();
    expect(composer()).toHaveFocus();
    await waitFor(() =>
      expect(status()).toHaveTextContent('Response stopped.'),
    );

    await user.click(
      screen.getByRole('button', { name: 'Regenerate response' }),
    );
    await waitFor(() => expect(calls).toHaveLength(2));
    await finish(calls[1]!, 'A new story.');
    expect(screen.getAllByRole('article', { name: 'Assistant' })).toHaveLength(
      1,
    );
  });

  it('shows a failed request with a retry that does not duplicate messages', async () => {
    const { user, calls } = setup((_call, index) =>
      index === 0
        ? jsonError(429, 'rate_limited', 'Too many requests.')
        : undefined,
    );
    await waitForHydration();
    await user.type(composer(), 'Hello{Enter}');

    expect(await screen.findByText('Too many requests.')).toBeInTheDocument();
    await waitFor(() =>
      expect(status()).toHaveTextContent('Response failed: Too many requests.'),
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    await finish(calls[1]!, 'Hi again.');

    expect(screen.queryByText('Too many requests.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article', { name: 'You' })).toHaveLength(1);
    expect(screen.getAllByRole('article', { name: 'Assistant' })).toHaveLength(
      1,
    );
  });

  it('keeps partial text when the stream is interrupted', async () => {
    const { user, calls } = setup();
    await waitForHydration();
    await user.type(composer(), 'Hello{Enter}');

    act(() => {
      calls[0]!.stream.send({ type: 'delta', text: 'Half an answer' });
      calls[0]!.stream.close();
    });

    expect(
      await screen.findByText('The response was interrupted.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Half an answer')).toBeInTheDocument();
    expect(
      screen.getByText('The partial response is shown above.'),
    ).toBeInTheDocument();
  });

  it('switches between conversations without mixing responses', async () => {
    const { user, calls } = setup();
    await waitForHydration();
    await user.type(composer(), 'First topic{Enter}');

    await user.click(screen.getAllByRole('button', { name: 'New chat' })[0]!);
    expect(
      screen.getByRole('heading', { name: 'How can I help?' }),
    ).toBeInTheDocument();
    await user.type(composer(), 'Second topic{Enter}');

    // The first response finishes in the background.
    await act(async () => {
      calls[0]!.stream.send({ type: 'delta', text: 'Answer for first' });
      calls[0]!.stream.send({ type: 'done' });
      calls[0]!.stream.close();
    });
    expect(screen.queryByText('Answer for first')).not.toBeInTheDocument();
    await finish(calls[1]!, 'Answer for second');

    await user.click(
      within(conversations()).getByRole('button', { name: 'First topic' }),
    );
    expect(await screen.findByText('Answer for first')).toBeInTheDocument();
    expect(screen.queryByText('Answer for second')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'First topic',
    );
  });

  it('deletes a conversation', async () => {
    const { user, calls } = setup();
    await waitForHydration();
    await user.type(composer(), 'Disposable{Enter}');
    await finish(calls[0]!, 'Reply');

    await user.click(
      within(conversations()).getByRole('button', {
        name: 'Delete “Disposable”',
      }),
    );

    expect(
      within(conversations()).queryByText('Disposable'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'How can I help?' }),
    ).toBeInTheDocument();
  });

  it('restores conversations after a reload', async () => {
    const first = setup();
    await waitForHydration();
    await first.user.type(composer(), 'Remember me{Enter}');
    await finish(first.calls[0]!, 'Remembered.');
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Remembered.'),
    );
    first.unmount();

    setup();
    await waitForHydration();

    expect(
      within(conversations()).getByRole('button', { name: 'Remember me' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Remembered.')).toBeInTheDocument();
  });

  it('restores a response that was streaming at reload as stopped', async () => {
    const first = setup();
    await waitForHydration();
    await first.user.type(composer(), 'Long answer please{Enter}');
    act(() =>
      first.calls[0]!.stream.send({ type: 'delta', text: 'Partial text' }),
    );
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Partial text'),
    );
    first.unmount();

    setup();
    await waitForHydration();

    const reply = screen.getByRole('article', { name: 'Assistant' });
    expect(within(reply).getByText('Partial text')).toBeInTheDocument();
    expect(within(reply).getByText('Response stopped.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send message' }),
    ).toBeInTheDocument();
  });
});
