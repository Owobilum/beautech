import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select, type SelectOption } from '@owobilum/ui';
import { useState } from 'react';
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test';

const roles: SelectOption<string>[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access to all settings',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage members and billing',
  },
  { value: 'member', label: 'Member', description: 'Can view and comment' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

const meta = {
  title: 'Components/Select',
  component: Select<string>,
  args: {
    label: 'Member role',
    options: roles,
    defaultValue: 'member',
    disabled: false,
    onChange: fn(),
  },
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    options: { control: false },
  },
  decorators: [
    (Story) => (
      // Leaves room below for the open options panel.
      <div className="h-96 w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: /Member role/ });

    await userEvent.click(button);
    // The options panel is portalled to <body>, outside the story canvas.
    await userEvent.click(await screen.findByRole('option', { name: /Admin/ }));

    await expect(args.onChange).toHaveBeenCalledWith('admin');
    await expect(button).toHaveTextContent('Admin');
  },
};

/** Open with the selected option highlighted, as in the Figma. */
export const Expanded: Story = {
  args: { defaultValue: 'admin' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Member role/ }));

    const selected = await screen.findByRole('option', {
      name: /Admin/,
      selected: true,
    });
    await waitFor(() => expect(selected).toHaveAttribute('data-focus'));
  },
};

export const KeyboardInteraction: Story = {
  args: { defaultValue: 'owner' },
  play: async ({ args, canvas, step }) => {
    const button = canvas.getByRole('button', { name: /Member role/ });

    await step('Tab focuses the button', async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
    });

    await step('Space opens the list on the selected option', async () => {
      await userEvent.keyboard(' ');
      await expect(
        await screen.findByRole('option', { name: /Owner/, selected: true }),
      ).toHaveAttribute('data-focus');
    });

    await step('Arrows move, Enter selects and closes', async () => {
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      await expect(args.onChange).toHaveBeenCalledWith('member');
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
      await expect(button).toHaveFocus();
    });

    await step('Escape closes without changing the value', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await screen.findByRole('listbox');
      await userEvent.keyboard('{ArrowDown}{Escape}');
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
      await expect(args.onChange).toHaveBeenCalledOnce();
      await expect(button).toHaveTextContent('Member');
    });
  },
};

export const Placeholder: Story = {
  args: { defaultValue: undefined, placeholder: 'Choose a role' },
};

export const ErrorState: Story = {
  name: 'Error',
  args: { defaultValue: undefined, error: 'Choose a role for this member.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button')).toHaveAccessibleDescription(
      'Choose a role for this member.',
    );
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: 'viewer',
    description: 'Role cannot be changed for this account type.',
    disabled: true,
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button');

    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(screen.queryByRole('listbox')).toBeNull();
  },
};

export const Controlled: Story = {
  render: function Render(args) {
    const [role, setRole] = useState('viewer');
    return (
      <div className="space-y-3">
        <Select {...args} value={role} onChange={setRole} />
        <p className="text-sm text-muted-foreground">
          Selected: <output>{role}</output>
        </p>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Member role/ }));
    await userEvent.click(await screen.findByRole('option', { name: /Owner/ }));

    await expect(canvas.getByRole('status')).toHaveTextContent('owner');
  },
};
