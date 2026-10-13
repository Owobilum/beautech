import { render, screen } from '@testing-library/react';
import { ChatMessage } from './chat-message';

describe('ChatMessage', () => {
  it('renders a named article per sender', () => {
    render(
      <>
        <ChatMessage from="user">Hi</ChatMessage>
        <ChatMessage from="assistant">Hello!</ChatMessage>
      </>,
    );

    expect(screen.getByRole('article', { name: 'You' })).toHaveTextContent(
      'Hi',
    );
    expect(
      screen.getByRole('article', { name: 'Assistant' }),
    ).toHaveTextContent('Hello!');
  });

  it('accepts a custom author name', () => {
    render(
      <ChatMessage from="assistant" author="Gemini">
        Hello
      </ChatMessage>,
    );

    expect(screen.getByRole('article', { name: 'Gemini' })).toBeInTheDocument();
  });

  it('renders status and actions slots', () => {
    render(
      <ChatMessage
        from="assistant"
        status={<span>Stopped</span>}
        actions={<button type="button">Copy</button>}
      >
        Partial
      </ChatMessage>,
    );

    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('hides the avatar from assistive tech and omits it for user messages', () => {
    const { rerender } = render(
      <ChatMessage from="assistant" avatar={<span data-testid="avatar" />}>
        Hi
      </ChatMessage>,
    );
    expect(screen.getByTestId('avatar').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    rerender(
      <ChatMessage from="user" avatar={<span data-testid="avatar" />}>
        Hi
      </ChatMessage>,
    );
    expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
  });
});
