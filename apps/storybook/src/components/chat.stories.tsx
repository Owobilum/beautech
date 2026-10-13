import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Alert,
  Button,
  ChatMessage,
  CodeBlock,
  CopyButton,
  MessageComposer,
  RefreshIcon,
  Spinner,
  IconButton,
} from '@owobilum/ui';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';

/**
 * Presentational building blocks for chat interfaces. They hold no chat
 * state: the app owns messages, streaming and persistence.
 */
const meta = {
  title: 'Components/Chat',
  component: ChatMessage,
  parameters: { layout: 'padded' },
  args: { from: 'assistant', children: 'Hello! How can I help?' },
  argTypes: {
    from: { control: 'inline-radio', options: ['user', 'assistant'] },
  },
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

const avatar = (
  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
    AI
  </span>
);

export const Message: Story = {
  args: { avatar },
};

export const Conversation: Story = {
  render: () => (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <ChatMessage from="user">
        How do I reverse a string in TypeScript?
      </ChatMessage>
      <ChatMessage
        from="assistant"
        avatar={avatar}
        actions={<CopyButton text="…" label="Copy message" size="sm" />}
      >
        <p className="mb-2">Split it into characters, reverse, and join:</p>
        <CodeBlock
          language="ts"
          code={"const reversed = [...text].reverse().join('');"}
        />
      </ChatMessage>
      <ChatMessage
        from="assistant"
        avatar={avatar}
        status={
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Spinner /> Generating…
          </span>
        }
      >
        Spreading the string handles emoji made of
      </ChatMessage>
      <ChatMessage
        from="assistant"
        avatar={avatar}
        status={
          <Alert
            variant="danger"
            role="status"
            title="The response was interrupted."
            action={
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<RefreshIcon />}
              >
                Retry
              </Button>
            }
          />
        }
      >
        Partial answer before the network dropped
      </ChatMessage>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('article', { name: 'You' })).toBeVisible();
    await expect(
      canvas.getAllByRole('article', { name: 'Assistant' }),
    ).toHaveLength(3);
  },
};

export const ConversationDark: Story = {
  ...Conversation,
  globals: { theme: 'dark' },
};

export const LongContent: Story = {
  args: {
    from: 'user',
    children:
      'A very long unbroken token: ' +
      'https://example.com/'.padEnd(220, 'a') +
      ' wraps instead of overflowing.',
  },
  render: (args) => (
    <div className="w-80 border border-dashed border-border p-2">
      <ChatMessage {...args} />
    </div>
  ),
};

function ComposerDemo({
  busy: initialBusy = false,
  onSubmit,
}: {
  busy?: boolean;
  onSubmit?: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(initialBusy);
  return (
    <div className="mx-auto max-w-2xl">
      <MessageComposer
        value={value}
        onValueChange={setValue}
        busy={busy}
        onSubmit={(v) => {
          onSubmit?.(v);
          setValue('');
          setBusy(true);
        }}
        onStop={() => setBusy(false)}
        placeholder="Ask anything"
        maxLength={200}
        hint="Enter to send, Shift+Enter for a new line"
      />
    </div>
  );
}

export const Composer: StoryObj<typeof MessageComposer> = {
  args: { onSubmit: fn() },
  render: (args) => <ComposerDemo onSubmit={args.onSubmit} />,
  play: async ({ args, canvas, step }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' });

    await step('Shift+Enter inserts a newline', async () => {
      await userEvent.type(box, 'Line one{Shift>}{Enter}{/Shift}Line two');
      await expect(box).toHaveValue('Line one\nLine two');
    });

    await step('Enter submits, and send becomes stop', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(args.onSubmit).toHaveBeenCalledWith('Line one\nLine two');
      await expect(box).toHaveValue('');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Stop response' }),
      );
      await expect(
        canvas.getByRole('button', { name: 'Send message' }),
      ).toBeDisabled();
    });
  },
};

export const ComposerBusy: StoryObj<typeof MessageComposer> = {
  render: () => <ComposerDemo busy />,
};

export const ComposerDark: StoryObj<typeof MessageComposer> = {
  render: () => <ComposerDemo />,
  globals: { theme: 'dark' },
};

export const Code: StoryObj<typeof CodeBlock> = {
  render: () => (
    <div className="max-w-md">
      <CodeBlock
        language="bash"
        code={
          'npx nx run-many -t lint typecheck test build --parallel=3 --output-style=stream-without-prefixes'
        }
      />
    </div>
  ),
  play: async ({ canvas }) => {
    // The scrollable region is reachable by keyboard.
    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: 'Copy code' }),
    ).toHaveFocus();
  },
};

export const IconActions: Story = {
  render: () => (
    <ChatMessage
      from="assistant"
      avatar={avatar}
      actions={
        <>
          <CopyButton text="Hello" label="Copy message" size="sm" />
          <IconButton label="Regenerate" icon={<RefreshIcon />} size="sm" />
        </>
      }
    >
      Message with actions.
    </ChatMessage>
  ),
};
