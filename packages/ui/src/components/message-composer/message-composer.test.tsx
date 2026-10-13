import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageComposer, type MessageComposerProps } from './message-composer';

function Harness(props: Partial<MessageComposerProps>) {
  const [value, setValue] = useState('');
  return (
    <MessageComposer
      value={value}
      onValueChange={setValue}
      onSubmit={() => setValue('')}
      {...props}
    />
  );
}

describe('MessageComposer', () => {
  it('submits on Enter and inserts a newline on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'Message' });

    await user.type(box, 'line one{Shift>}{Enter}{/Shift}line two');
    expect(box).toHaveValue('line one\nline two');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('line one\nline two');
  });

  it('submits with the send button', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox'), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSubmit).toHaveBeenCalledWith('Hello');
  });

  it('does not submit blank messages', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox'), '   {Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('ignores Enter while an IME composition is active', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox');
    await userEvent.type(box, 'nihao');

    box.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        isComposing: true,
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('while busy, blocks submission but keeps typing and offers stop', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    render(<Harness busy onSubmit={onSubmit} onStop={onStop} />);
    const box = screen.getByRole('textbox');

    await user.type(box, 'next question{Enter}');
    expect(box).toHaveValue('next question');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Stop response' }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('keeps focus on the action button when it switches from send to stop', async () => {
    const user = userEvent.setup();
    function Busy() {
      const [value, setValue] = useState('Hi');
      const [busy, setBusy] = useState(false);
      return (
        <MessageComposer
          value={value}
          onValueChange={setValue}
          busy={busy}
          onSubmit={() => setBusy(true)}
        />
      );
    }
    render(<Busy />);

    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getByRole('button', { name: 'Stop response' })).toHaveFocus();
  });

  it('shows a counter near the limit and blocks submission over it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness maxLength={10} onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox');

    await user.type(box, '123456789');
    expect(box).toHaveAccessibleDescription('9 / 10');

    await user.type(box, '01{Enter}');
    expect(box).toHaveAccessibleDescription('Too long: 11 / 10');
    expect(box).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables everything when disabled', () => {
    render(<Harness disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
