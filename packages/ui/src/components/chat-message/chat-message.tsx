import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ChatMessageFrom = 'user' | 'assistant';

export type ChatMessageProps = Omit<
  ComponentPropsWithRef<'article'>,
  'role'
> & {
  /** Who sent the message; sets alignment and styling. */
  from: ChatMessageFrom;
  /**
   * Accessible name of the message (`aria-label` on the `<article>`).
   * Defaults to "You" / "Assistant".
   */
  author?: string;
  /** Avatar or icon shown beside assistant messages. */
  avatar?: ReactNode;
  /** Status shown under the content, e.g. a streaming indicator or error. */
  status?: ReactNode;
  /** Message actions (copy, retry…), shown under the content. */
  actions?: ReactNode;
};

/**
 * Layout for one message in a conversation: user messages are right-aligned
 * bubbles, assistant messages are full-width with an optional avatar. Purely
 * presentational; content (e.g. rendered Markdown) is passed as children.
 */
export function ChatMessage({
  from,
  author = from === 'user' ? 'You' : 'Assistant',
  avatar,
  status,
  actions,
  className,
  children,
  ...props
}: ChatMessageProps) {
  const isUser = from === 'user';

  return (
    <article
      {...props}
      aria-label={author}
      data-from={from}
      className={cn(
        'flex w-full min-w-0 gap-3',
        isUser && 'justify-end',
        className,
      )}
    >
      {!isUser && avatar && (
        <div aria-hidden="true" className="mt-0.5 flex shrink-0">
          {avatar}
        </div>
      )}
      <div
        className={cn(
          'flex min-w-0 flex-col gap-2',
          isUser ? 'max-w-[85%] items-end' : 'flex-1',
        )}
      >
        <div
          data-slot="content"
          className={cn(
            'min-w-0 max-w-full text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]',
            isUser &&
              'rounded-2xl rounded-br-md bg-primary-muted px-4 py-2.5 whitespace-pre-wrap',
          )}
        >
          {children}
        </div>
        {status && (
          <div data-slot="status" className="w-full text-sm">
            {status}
          </div>
        )}
        {actions && (
          <div
            data-slot="actions"
            className="-ml-1.5 flex items-center gap-0.5"
          >
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}
