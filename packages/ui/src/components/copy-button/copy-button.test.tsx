import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './copy-button';

describe('CopyButton', () => {
  it('copies the text and announces success', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(
      <CopyButton text="npm install" label="Copy command" onCopy={onCopy} />,
    );

    await user.click(screen.getByRole('button', { name: 'Copy command' }));

    await expect(navigator.clipboard.readText()).resolves.toBe('npm install');
    expect(onCopy).toHaveBeenCalledWith('npm install');
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
    // The name stays stable while the icon changes.
    expect(
      screen.getByRole('button', { name: 'Copy command' }),
    ).toHaveAttribute('data-state', 'copied');
  });

  it('reads lazy text at click time', async () => {
    const user = userEvent.setup();
    let value = 'first';
    render(<CopyButton text={() => value} />);
    value = 'second';

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    await expect(navigator.clipboard.readText()).resolves.toBe('second');
  });

  it('announces a failure when the clipboard rejects', async () => {
    const user = userEvent.setup();
    const onCopyError = vi.fn();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
      new Error('denied'),
    );
    render(<CopyButton text="x" onCopyError={onCopyError} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
    expect(onCopyError).toHaveBeenCalled();
  });

  it('returns to its idle state after resetAfter', async () => {
    const user = userEvent.setup();
    render(<CopyButton text="x" resetAfter={50} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied');

    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveAttribute('data-state', 'idle'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
