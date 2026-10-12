import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, Textarea } from './input';

describe('Input', () => {
  it('associates the label and helper text with the input', () => {
    render(
      <Input
        label="Company name"
        description="Enter your registered company name."
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Company name' });

    expect(input).toHaveAccessibleDescription(
      'Enter your registered company name.',
    );
    expect(input).not.toBeInvalid();
  });

  it('focuses the input when the label is clicked', async () => {
    render(<Input label="Company name" />);

    await userEvent.click(screen.getByText('Company name'));

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('accepts typing and calls onChange', async () => {
    const onChange = vi.fn();
    render(<Input label="Work email" onChange={onChange} />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'sarah@acme.io');

    expect(input).toHaveValue('sarah@acme.io');
    expect(onChange).toHaveBeenCalledTimes('sarah@acme.io'.length);
  });

  it('marks the input invalid and describes it with the error instead of the description', () => {
    render(
      <Input
        label="Subdomain"
        description="Your workspace URL."
        error="Only lowercase letters and hyphens are allowed."
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Subdomain' });

    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription(
      'Only lowercase letters and hyphens are allowed.',
    );
    expect(screen.queryByText('Your workspace URL.')).not.toBeInTheDocument();
  });

  it('disables the input and its field', async () => {
    render(<Input label="Account ID" defaultValue="ACM-00291-XZ" disabled />);
    const input = screen.getByRole('textbox', { name: 'Account ID' });

    await userEvent.type(input, 'x');

    expect(input).toBeDisabled();
    expect(input).toHaveValue('ACM-00291-XZ');
    expect(screen.getByText('Account ID')).toHaveAttribute('data-disabled');
  });

  it('forwards native attributes, ref and inputClassName to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Input
        ref={ref}
        label="Email"
        type="email"
        name="email"
        required
        className="wrapper"
        inputClassName="control"
      />,
    );
    const input = screen.getByRole('textbox');

    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toBeRequired();
    expect(input).toHaveClass('control');
    expect(input.closest('.wrapper')).not.toBeNull();
  });

  it('can be named with aria-label when there is no visible label', () => {
    render(<Input aria-label="Search" />);

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  describe('password', () => {
    it('hides the value until the toggle is pressed', async () => {
      render(<Input label="Password" type="password" defaultValue="secret" />);
      const input = screen.getByLabelText('Password');
      const toggle = screen.getByRole('button', { name: 'Show password' });

      expect(input).toHaveAttribute('type', 'password');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      await userEvent.click(toggle);
      expect(input).toHaveAttribute('type', 'text');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(toggle);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('disables the toggle with the field', () => {
      render(<Input label="Password" type="password" disabled />);

      expect(
        screen.getByRole('button', { name: 'Show password' }),
      ).toBeDisabled();
    });
  });
});

describe('Textarea', () => {
  it('renders a labelled, described multi-line input', async () => {
    render(
      <Textarea
        label="Description"
        description="Max 500 characters."
        maxLength={500}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Description' });

    await userEvent.type(textarea, 'line one{Enter}line two');

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('rows', '3');
    expect(textarea).toHaveAccessibleDescription('Max 500 characters.');
    expect(textarea).toHaveValue('line one\nline two');
  });

  it('supports error and disabled states', () => {
    render(<Textarea label="Notes" error="Required." disabled />);
    const textarea = screen.getByRole('textbox', { name: 'Notes' });

    expect(textarea).toBeInvalid();
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAccessibleDescription('Required.');
  });
});
