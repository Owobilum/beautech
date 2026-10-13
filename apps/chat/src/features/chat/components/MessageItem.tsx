'use client';

import {
  Alert,
  Button,
  ChatMessage,
  CopyButton,
  IconButton,
  RefreshIcon,
  Spinner,
} from '@owobilum/ui';
import { memo } from 'react';
import type { AssistantMessage } from '../domain/types';
import { useChatSelector } from '../store/chat-context';
import { Markdown } from './Markdown';

type MessageItemProps = {
  conversationId: string;
  index: number;
  isLast: boolean;
  onRetry: (messageId: string) => void;
};

const avatar = (
  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
    AI
  </span>
);

/**
 * One message. Subscribes to its own message only: while a response
 * streams, just this component re-renders.
 */
export const MessageItem = memo(function MessageItem({
  conversationId,
  index,
  isLast,
  onRetry,
}: MessageItemProps) {
  const message = useChatSelector(
    (s) => s.conversations[conversationId]?.messages[index],
  );
  if (!message) return null;

  if (message.role === 'user') {
    return (
      <ChatMessage
        from="user"
        actions={
          <CopyButton text={message.content} label="Copy message" size="sm" />
        }
      >
        {message.content}
      </ChatMessage>
    );
  }

  return (
    <ChatMessage
      from="assistant"
      avatar={avatar}
      aria-busy={message.status === 'streaming' || undefined}
      status={
        <AssistantStatus message={message} isLast={isLast} onRetry={onRetry} />
      }
      actions={
        message.status !== 'streaming' &&
        (message.content || (isLast && message.status === 'stopped')) ? (
          <>
            {message.content && (
              <CopyButton
                text={message.content}
                label="Copy response"
                size="sm"
              />
            )}
            {isLast && message.status === 'stopped' && (
              <IconButton
                size="sm"
                label="Regenerate response"
                icon={<RefreshIcon />}
                onClick={() => onRetry(message.id)}
              />
            )}
          </>
        ) : undefined
      }
    >
      {message.content && <Markdown content={message.content} />}
    </ChatMessage>
  );
});

function AssistantStatus({
  message,
  isLast,
  onRetry,
}: {
  message: AssistantMessage;
  isLast: boolean;
  onRetry: (messageId: string) => void;
}) {
  switch (message.status) {
    case 'streaming':
      return (
        // Visual only: StatusAnnouncer handles screen reader announcements.
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Spinner />
          {message.content ? 'Responding…' : 'Thinking…'}
        </span>
      );
    case 'stopped':
      return <p className="text-muted-foreground">Response stopped.</p>;
    case 'error':
      return (
        // role="note": failures are announced once by StatusAnnouncer, not
        // again for every error restored from storage.
        <Alert
          variant="danger"
          role="note"
          title={message.error?.message ?? 'Something went wrong.'}
          action={
            isLast && message.error?.retryable !== false ? (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<RefreshIcon />}
                onClick={() => onRetry(message.id)}
              >
                Retry
              </Button>
            ) : undefined
          }
        >
          {message.content ? 'The partial response is shown above.' : undefined}
        </Alert>
      );
    default:
      return null;
  }
}
