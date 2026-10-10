import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, type ButtonVariant } from './button';

describe('Button', () => {
  it('renders an accessible button with its label', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('defaults to type="button" so it does not submit forms', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('allows submit buttons', async () => {
    const onSubmit = vi.fn((e: SubmitEvent) => e.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button type="submit">Send</Button>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('calls onClick when clicked or activated with Enter / Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole('button'));
    await user.tab();
    await user.tab({ shift: true });
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('does not respond to interaction when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button');

    await user.click(button);
    await user.tab();

    expect(button).toBeDisabled();
    expect(button).not.toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
  });

  describe('loading', () => {
    it('is announced as busy and keeps its accessible name', () => {
      render(<Button loading>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });

      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('stays focusable but ignores activation', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      const button = screen.getByRole('button');

      await user.tab();
      expect(button).toHaveFocus();
      await user.keyboard('{Enter}');
      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not submit its form', async () => {
      const onSubmit = vi.fn((e: SubmitEvent) => e.preventDefault());
      render(
        <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
          <Button type="submit" loading>
            Send
          </Button>
        </form>,
      );

      await userEvent.click(screen.getByRole('button'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('replaces the trailing icon with a spinner', () => {
      render(
        <Button loading trailingIcon={<svg data-testid="trailing" />}>
          Save
        </Button>,
      );

      expect(screen.queryByTestId('trailing')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button').querySelector('[data-slot="spinner"]'),
      ).toBeInTheDocument();
    });
  });

  it('renders icons as decorative content that does not change the name', () => {
    render(
      <Button
        leadingIcon={<svg data-testid="leading" />}
        trailingIcon={<svg data-testid="trailing" />}
      >
        Upload
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(screen.getByTestId('leading').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByTestId('trailing').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('supports an accessible name for icon-only usage', () => {
    render(<Button aria-label="Search" leadingIcon={<svg />} />);

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('forwards its ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Save</Button>);

    expect(ref.current).toBe(screen.getByRole('button'));
  });

  it('passes through native attributes', () => {
    render(
      <Button id="save" name="intent" value="save" data-testid="save-button">
        Save
      </Button>,
    );
    const button = screen.getByTestId('save-button');

    expect(button).toHaveAttribute('id', 'save');
    expect(button).toHaveAttribute('name', 'intent');
    expect(button).toHaveAttribute('value', 'save');
  });

  it('lets a consumer className override conflicting utilities', () => {
    render(<Button className="px-10">Save</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('px-10');
    expect(button).not.toHaveClass('px-4');
  });

  it('defaults to the primary variant at medium size', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute(
      'data-variant',
      'primary',
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'md');
  });

  it.each<ButtonVariant>([
    'primary',
    'secondary',
    'danger',
    'danger-outline',
    'ghost',
  ])('exposes the %s variant as a styling hook', (variant) => {
    render(<Button variant={variant}>Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
  });
});
