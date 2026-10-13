import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { AlertTriangleIcon, InfoIcon } from '../../lib/icons';

export type AlertVariant = 'info' | 'danger';

export type AlertProps = Omit<ComponentPropsWithRef<'div'>, 'title'> & {
  /** Defaults to `info`. */
  variant?: AlertVariant;
  title?: ReactNode;
  /** Action shown at the end, e.g. a Retry button. */
  action?: ReactNode;
};

const variants: Record<AlertVariant, { box: string; icon: string }> = {
  info: { box: 'border-border bg-muted', icon: 'text-primary' },
  danger: {
    box: 'border-danger/40 bg-danger-muted',
    icon: 'text-danger-strong',
  },
};

/**
 * Inline message. `danger` alerts default to `role="alert"` (announced
 * immediately) and `info` to `role="status"` (announced politely); pass
 * `role` to change that, e.g. for alerts present on page load.
 */
export function Alert({
  variant = 'info',
  title,
  action,
  className,
  children,
  ...props
}: AlertProps) {
  const Icon = variant === 'danger' ? AlertTriangleIcon : InfoIcon;

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      {...props}
      data-variant={variant}
      className={cn(
        'flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 text-sm text-foreground',
        variants[variant].box,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', variants[variant].icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && (
          <div className={cn(title && 'mt-0.5 text-surface-foreground')}>
            {children}
          </div>
        )}
      </div>
      {action && <div className="ml-auto shrink-0 self-center">{action}</div>}
    </div>
  );
}
