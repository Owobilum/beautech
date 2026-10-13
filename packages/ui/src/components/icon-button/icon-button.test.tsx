import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it('is named by its label, with the icon hidden from assistive tech', () => {
    render(<IconButton label="Delete" icon={<svg data-testid="icon" />} />);

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveAttribute('title', 'Delete');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('can hide the native tooltip', () => {
    render(<IconButton label="Delete" icon={<svg />} hideTooltip />);

    expect(screen.getByRole('button')).not.toHaveAttribute('title');
  });

  it('activates with click and keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton label="Delete" icon={<svg />} onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('blocks activation while loading but stays focusable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton label="Save" icon={<svg />} loading onClick={onClick} />,
    );
    const button = screen.getByRole('button', { name: 'Save' });

    await user.tab();
    await user.keyboard('{Enter}');

    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('defaults to the subtle variant and type="button"', () => {
    render(<IconButton label="Menu" icon={<svg />} />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('data-variant', 'subtle');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('forwards its ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<IconButton ref={ref} label="Menu" icon={<svg />} />);

    expect(ref.current).toBe(screen.getByRole('button'));
  });
});
