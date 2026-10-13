import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { CopyButton } from '../copy-button/copy-button';

export type CodeBlockProps = Omit<
  ComponentPropsWithRef<'figure'>,
  'children'
> & {
  /** Raw source, used by the copy button (and rendered if no children). */
  code: string;
  /** Language name shown in the header. */
  language?: string;
  /**
   * Rendered code, e.g. syntax-highlighted elements. Placed inside `<pre>`;
   * wrap it in `<code>` yourself. Defaults to `code` as plain text.
   */
  children?: ReactNode;
  /** Accessible name of the copy button. Defaults to "Copy code". */
  copyLabel?: string;
};

/**
 * Code block with a language label and copy button. Long lines scroll
 * horizontally (the region is keyboard-focusable so it can be scrolled
 * without a mouse). Highlighting is up to the consumer.
 */
export function CodeBlock({
  code,
  language,
  children,
  copyLabel = 'Copy code',
  className,
  ...props
}: CodeBlockProps) {
  return (
    <figure
      {...props}
      className={cn(
        'my-4 min-w-0 overflow-hidden rounded-lg border border-border bg-code-background text-code-foreground',
        className,
      )}
    >
      <figcaption className="flex items-center justify-between gap-2 border-b border-border py-1 pr-1 pl-3 font-sans text-xs text-surface-foreground">
        <span>{language || 'text'}</span>
        <CopyButton text={code} label={copyLabel} size="sm" />
      </figcaption>
      <pre
        tabIndex={0}
        className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {children ?? <code>{code}</code>}
      </pre>
    </figure>
  );
}
