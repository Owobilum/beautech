import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type NavListProps = ComponentPropsWithRef<'ul'>;

/**
 * Vertical list of navigation items, e.g. a sidebar of documents or
 * conversations. Wrap it in a labelled `<nav>` when it is a landmark.
 */
export function NavList({ className, ...props }: NavListProps) {
  return (
    <ul
      // role="list" restores list semantics Safari drops with list-style: none.
      // eslint-disable-next-line jsx-a11y/no-redundant-roles
      role="list"
      {...props}
      className={cn('flex flex-col gap-0.5', className)}
    />
  );
}

export type NavListItemProps = Omit<
  ComponentPropsWithRef<'button'>,
  'type' | 'children'
> & {
  /** Item label; truncated to one line. */
  children: ReactNode;
  /** The item currently shown (`aria-current="page"`). */
  current?: boolean;
  /**
   * Secondary controls for the item (e.g. a delete IconButton). Always
   * focusable; on pointer devices they appear on hover or focus.
   */
  actions?: ReactNode;
  /** Applied to the `<li>`. */
  className?: string;
};

/** A selectable item in a `NavList`, with optional trailing actions. */
export function NavListItem({
  children,
  current = false,
  actions,
  className,
  ...props
}: NavListItemProps) {
  return (
    <li
      data-current={current || undefined}
      className={cn(
        'group/item relative flex min-w-0 items-center rounded-lg transition-colors',
        'hover:bg-muted data-current:bg-primary-muted',
        className,
      )}
    >
      <button
        {...props}
        type="button"
        aria-current={current ? 'page' : undefined}
        className={cn(
          'min-w-0 flex-1 cursor-pointer truncate rounded-lg px-3 py-2 text-left text-sm text-surface-foreground outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring',
          'group-data-current/item:font-medium group-data-current/item:text-foreground',
        )}
      >
        {children}
      </button>
      {actions && (
        <div
          data-slot="actions"
          className={cn(
            'flex shrink-0 items-center pr-1',
            // Hidden until hover/focus only where hover exists, so touch
            // users always see the actions.
            '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/item:opacity-100',
            '[@media(hover:hover)]:group-focus-within/item:opacity-100 [@media(hover:hover)]:group-data-current/item:opacity-100',
          )}
        >
          {actions}
        </div>
      )}
    </li>
  );
}
