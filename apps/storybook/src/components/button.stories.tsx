import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@owobilum/ui';
import type { ReactNode } from 'react';
import { ArrowRight, Search, Trash2, Upload } from 'lucide-react';
import { expect, fn, userEvent } from 'storybook/test';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'danger', 'danger-outline', 'ghost'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    leadingIcon: { control: false },
    trailingIcon: { control: false },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Button' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="danger">
        Danger
      </Button>
      <Button {...args} variant="danger-outline">
        Outline Danger
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
      <Button {...args} size="xl">
        XL
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} leadingIcon={<Upload />}>
        Upload
      </Button>
      <Button {...args} variant="secondary" leadingIcon={<Search />}>
        Search
      </Button>
      <Button {...args} variant="ghost" trailingIcon={<ArrowRight />}>
        Continue
      </Button>
      {/* Not spreading args: they include a text label. */}
      <Button
        variant="danger-outline"
        aria-label="Delete"
        leadingIcon={<Trash2 />}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    // Icons are decorative; the accessible name comes from the label.
    await expect(canvas.getByRole('button', { name: 'Upload' })).toBeVisible();
    // Icon-only buttons are named via aria-label.
    await expect(canvas.getByRole('button', { name: 'Delete' })).toBeVisible();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button');

    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Loading: Story = {
  args: { loading: true, children: 'Saving' },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Saving' });

    await expect(button).toHaveAttribute('aria-busy', 'true');
    // Unlike disabled, a loading button keeps keyboard focus…
    await userEvent.tab();
    await expect(button).toHaveFocus();
    // …but ignores activation.
    await userEvent.keyboard('{Enter}');
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const KeyboardInteraction: Story = {
  args: { children: 'Save' },
  play: async ({ args, canvas, step }) => {
    const button = canvas.getByRole('button', { name: 'Save' });

    await step('Tab moves focus and shows the focus ring', async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
      await expect(button).toHaveAttribute('data-focus');
    });

    await step('Enter and Space activate the button', async () => {
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};

/**
 * Every variant and interaction state side by side, mirroring the Figma
 * sheet. Hover and focus are forced via Headless UI's data attributes.
 */
export const DesignReference: Story = {
  parameters: { layout: 'padded' },
  render: () => {
    const forced = (state: 'hover' | 'focus') => ({ [`data-${state}`]: '' });
    const row = (title: string, buttons: ReactNode) => (
      <section className="space-y-3">
        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-6">
          {buttons}
        </div>
      </section>
    );

    return (
      <div className="space-y-6">
        {row(
          'Primary — solid indigo',
          <>
            <Button>Default</Button>
            <Button {...forced('hover')}>Hover</Button>
            <Button {...forced('focus')}>Focused</Button>
            <Button disabled>Disabled</Button>
            <Button leadingIcon={<Upload />}>With Icon</Button>
            <Button loading>Loading</Button>
          </>,
        )}
        {row(
          'Secondary — outline slate',
          <>
            <Button variant="secondary">Default</Button>
            <Button variant="secondary" {...forced('hover')}>
              Hover
            </Button>
            <Button variant="secondary" {...forced('focus')}>
              Focused
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
            <Button variant="secondary" leadingIcon={<Search />}>
              With Icon
            </Button>
          </>,
        )}
        {row(
          'Danger — solid rose',
          <>
            <Button variant="danger">Default</Button>
            <Button variant="danger" {...forced('hover')}>
              Hover
            </Button>
            <Button variant="danger" {...forced('focus')}>
              Focused
            </Button>
            <Button variant="danger" disabled>
              Disabled
            </Button>
            <Button variant="danger-outline">Outline Danger</Button>
          </>,
        )}
        {row(
          'Ghost & size variants',
          <>
            <Button variant="ghost">Ghost</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">XL</Button>
          </>,
        )}
      </div>
    );
  },
};
