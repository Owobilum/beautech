import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type EmptyStateProps = Omit<ComponentPropsWithRef<'div'>, 'title'> & {
  /** Decorative icon shown above the title. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Heading level of the title. Defaults to 2. */
  headingLevel?: 2 | 3 | 4;
  /** Call to action (buttons, suggestions…). */
  children?: ReactNode;
};

/** Placeholder content for a view with nothing to show yet. */
export function EmptyState({
  icon,
  title,
  description,
  headingLevel = 2,
  className,
  children,
  ...props
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div
      {...props}
      className={cn(
        'flex flex-col items-center px-6 py-10 text-center',
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-muted text-primary [&>svg]:size-6"
        >
          {icon}
        </div>
      )}
      <Heading className="text-lg font-semibold text-foreground">
        {title}
      </Heading>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
