import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CopyButton,
  IconButton,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from '@owobilum/ui';
import { expect, fn, userEvent } from 'storybook/test';

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  args: {
    label: 'New chat',
    icon: <PlusIcon />,
    variant: 'subtle',
    size: 'md',
    loading: false,
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: [
        'primary',
        'secondary',
        'danger',
        'danger-outline',
        'ghost',
        'subtle',
      ],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: false },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvas }) => {
    // The required label is the accessible name.
    await userEvent.click(canvas.getByRole('button', { name: 'New chat' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Variants: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <IconButton {...args} variant="primary" label="Add" />
      <IconButton
        {...args}
        variant="secondary"
        label="Retry"
        icon={<RefreshIcon />}
      />
      <IconButton {...args} variant="ghost" label="Add item" />
      <IconButton
        {...args}
        variant="subtle"
        label="Delete"
        icon={<TrashIcon />}
      />
      <IconButton
        {...args}
        variant="danger-outline"
        label="Delete forever"
        icon={<TrashIcon />}
      />
      <IconButton {...args} label="Saving" loading />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <IconButton {...args} size="sm" />
      <IconButton {...args} size="md" />
      <IconButton {...args} size="lg" />
    </div>
  ),
};

export const DarkTheme: Story = { ...Variants, globals: { theme: 'dark' } };

/** Copies text and announces "Copied" through a live region. */
export const Copy: StoryObj<typeof CopyButton> = {
  render: () => (
    <CopyButton text="npm install @owobilum/ui" label="Copy command" />
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Copy command' });
    // Avoid depending on clipboard permissions in the test browser.
    navigator.clipboard.writeText = fn(async () => undefined);

    await userEvent.click(button);

    await expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'npm install @owobilum/ui',
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('Copied');
  },
};
