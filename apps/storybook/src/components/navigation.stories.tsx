import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Alert,
  Button,
  EmptyState,
  IconButton,
  MessageSquareIcon,
  NavList,
  NavListItem,
  PlusIcon,
  Spinner,
  TrashIcon,
} from '@owobilum/ui';
import { useState } from 'react';
import { expect, userEvent } from 'storybook/test';

const meta = {
  title: 'Components/Navigation & feedback',
  component: NavList,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof NavList>;

export default meta;
type Story = StoryObj<typeof meta>;

const initial = [
  { id: '1', title: 'Reversing strings in TypeScript' },
  { id: '2', title: 'Trip ideas for a long weekend in Lisbon with friends' },
  { id: '3', title: 'Explain React Server Components' },
];

function Sidebar() {
  const [items, setItems] = useState(initial);
  const [current, setCurrent] = useState('1');
  return (
    <nav aria-label="Conversations" className="w-64">
      <NavList>
        {items.map((item) => (
          <NavListItem
            key={item.id}
            current={item.id === current}
            onClick={() => setCurrent(item.id)}
            actions={
              <IconButton
                size="sm"
                label={`Delete ${item.title}`}
                icon={<TrashIcon />}
                onClick={() =>
                  setItems((list) => list.filter((i) => i.id !== item.id))
                }
              />
            }
          >
            {item.title}
          </NavListItem>
        ))}
      </NavList>
    </nav>
  );
}

export const List: Story = {
  render: () => <Sidebar />,
  play: async ({ canvas, step }) => {
    await step('Selecting an item marks it current', async () => {
      const item = canvas.getByRole('button', {
        name: 'Explain React Server Components',
      });
      await userEvent.click(item);
      await expect(item).toHaveAttribute('aria-current', 'page');
    });

    await step('Item actions are reachable with Tab', async () => {
      await userEvent.tab();
      await expect(
        canvas.getByRole('button', {
          name: 'Delete Explain React Server Components',
        }),
      ).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(canvas.getAllByRole('listitem')).toHaveLength(2);
    });
  },
};

export const ListDark: Story = {
  ...List,
  play: undefined,
  globals: { theme: 'dark' },
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      icon={<MessageSquareIcon />}
      title="Start a conversation"
      description="Ask a question, paste some code, or brainstorm an idea."
    >
      <Button leadingIcon={<PlusIcon />}>New chat</Button>
    </EmptyState>
  ),
};

export const Alerts: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-3">
      <Alert>Conversations are saved in this browser only.</Alert>
      <Alert
        variant="danger"
        title="Rate limit reached"
        action={
          <Button size="sm" variant="secondary">
            Retry
          </Button>
        }
      >
        The free tier allows a limited number of requests per minute.
      </Alert>
      <Spinner
        label="Loading conversations"
        className="text-muted-foreground"
      />
    </div>
  ),
};

export const AlertsDark: Story = { ...Alerts, globals: { theme: 'dark' } };
