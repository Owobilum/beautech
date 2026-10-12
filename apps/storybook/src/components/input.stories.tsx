import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input, Textarea } from '@owobilum/ui';
import type { ReactNode } from 'react';
import { expect, fn, userEvent } from 'storybook/test';

const meta = {
  title: 'Components/Input',
  component: Input,
  args: {
    label: 'Company name',
    placeholder: 'Acme Corporation',
    description: 'Enter your registered company name.',
    disabled: false,
    onChange: fn(),
    className: 'w-96',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'url'],
    },
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Company name' });

    await userEvent.type(input, 'Acme');
    await expect(input).toHaveValue('Acme');
    await expect(args.onChange).toHaveBeenCalledTimes(4);
    await expect(input).toHaveAccessibleDescription(
      'Enter your registered company name.',
    );
  },
};

export const Focused: Story = {
  args: {
    label: 'Work email',
    type: 'email',
    defaultValue: 'sarah@acme.io',
    placeholder: undefined,
    description: "We'll send your verification link here.",
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText('Work email'));
    await expect(canvas.getByRole('textbox')).toHaveFocus();
  },
};

export const ErrorState: Story = {
  name: 'Error',
  args: {
    label: 'Subdomain',
    defaultValue: 'acme corp!',
    placeholder: undefined,
    description: undefined,
    error: 'Only lowercase letters and hyphens are allowed.',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Subdomain' });

    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription(
      'Only lowercase letters and hyphens are allowed.',
    );
  },
};

export const Disabled: Story = {
  args: {
    label: 'Account ID',
    defaultValue: 'ACM-00291-XZ',
    placeholder: undefined,
    description: 'Auto-assigned. Cannot be changed.',
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox')).toBeDisabled();
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    defaultValue: 'correct-horse-battery',
    placeholder: undefined,
    description: 'Minimum 8 characters required.',
  },
  play: async ({ canvas, step }) => {
    const input = canvas.getByLabelText('Password');
    const toggle = canvas.getByRole('button', { name: 'Show password' });

    await step('The value is masked by default', async () => {
      await expect(input).toHaveAttribute('type', 'password');
    });

    await step('The toggle reveals and hides it again', async () => {
      await userEvent.click(toggle);
      await expect(input).toHaveAttribute('type', 'text');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(toggle);
      await expect(input).toHaveAttribute('type', 'password');
    });
  },
};

export const TextareaField: Story = {
  name: 'Textarea',
  render: () => (
    <Textarea
      className="w-96"
      label="Description"
      placeholder="Describe your use case..."
      description="Max 500 characters."
      maxLength={500}
    />
  ),
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox', { name: 'Description' });

    await userEvent.type(textarea, 'Internal dashboards{Enter}for ops');
    await expect(textarea).toHaveValue('Internal dashboards\nfor ops');
  },
};

/**
 * The Figma "Form Inputs" sheet. The focused state is forced via Headless
 * UI's data attribute.
 */
export const DesignReference: Story = {
  parameters: { layout: 'padded' },
  render: () => {
    const card = (title: string, field: ReactNode) => (
      <section className="space-y-3">
        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {title}
        </h3>
        <div className="rounded-xl border border-border bg-surface p-6">
          {field}
        </div>
      </section>
    );

    return (
      <div className="grid max-w-4xl gap-6 sm:grid-cols-2">
        {card(
          'Default state',
          <Input
            label="Company name"
            placeholder="Acme Corporation"
            description="Enter your registered company name."
          />,
        )}
        {card(
          'Focused state',
          <Input
            label="Work email"
            type="email"
            defaultValue="sarah@acme.io"
            description="We'll send your verification link here."
            data-focus=""
          />,
        )}
        {card(
          'Error state',
          <Input
            label="Subdomain"
            defaultValue="acme corp!"
            error="Only lowercase letters and hyphens are allowed."
          />,
        )}
        {card(
          'Disabled state',
          <Input
            label="Account ID"
            defaultValue="ACM-00291-XZ"
            description="Auto-assigned. Cannot be changed."
            disabled
          />,
        )}
        {card(
          'Password input',
          <Input
            label="Password"
            type="password"
            defaultValue="correct-horse-battery"
            description="Minimum 8 characters required."
          />,
        )}
        {card(
          'Textarea',
          <Textarea
            label="Description"
            placeholder="Describe your use case..."
            description="Max 500 characters."
          />,
        )}
      </div>
    );
  },
};
