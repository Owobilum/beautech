import { Button as HeadlessButton } from '@headlessui/react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant =
  'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  /** Visual style. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Defaults to `md`. */
  size?: ButtonSize;
  /** Defaults to `button`, so buttons inside forms don't submit by accident. */
  type?: 'button' | 'submit' | 'reset';
  /**
   * Shows a spinner and blocks activation. The button stays focusable and is
   * marked `aria-busy` / `aria-disabled`, so keyboard users don't lose focus.
   */
  loading?: boolean;
  /** Icon rendered before the label. Decorative: hidden from assistive tech. */
  leadingIcon?: ReactNode;
  /** Icon rendered after the label. Replaced by the spinner while loading. */
  trailingIcon?: ReactNode;
};

// Headless UI exposes interaction state as data attributes (data-hover,
// data-focus for keyboard focus only, data-active, data-disabled), which keeps
// the visual states declarative and consistent with assistive-tech state.
const base =
  'inline-flex cursor-pointer items-center justify-center border font-sans font-semibold whitespace-nowrap select-none transition-colors outline-none ' +
  'data-focus:ring-2 data-focus:ring-offset-2 data-disabled:cursor-not-allowed data-loading:cursor-wait';

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-primary text-primary-foreground data-hover:bg-primary-hover data-active:bg-primary-hover data-focus:ring-ring ' +
    'data-disabled:bg-primary-disabled data-disabled:text-primary-disabled-foreground',
  secondary:
    'border-border-strong bg-surface text-surface-foreground data-hover:border-border-hover data-hover:bg-muted data-hover:text-foreground data-active:bg-muted ' +
    'data-focus:border-primary data-focus:text-primary data-focus:ring-ring ' +
    'data-disabled:border-border data-disabled:bg-muted data-disabled:text-muted-foreground',
  danger:
    'border-transparent bg-danger text-danger-foreground data-hover:bg-danger-hover data-active:bg-danger-hover data-focus:ring-ring-danger ' +
    'data-disabled:bg-danger-disabled data-disabled:text-danger-disabled-foreground',
  'danger-outline':
    'border-danger bg-surface text-danger data-hover:bg-danger-muted data-active:bg-danger-muted data-focus:ring-ring-danger ' +
    'data-disabled:border-danger-disabled data-disabled:bg-surface data-disabled:text-danger-disabled-foreground',
  ghost:
    'border-transparent bg-transparent text-primary data-hover:bg-primary-muted data-active:bg-primary-muted data-focus:ring-ring ' +
    'data-disabled:bg-transparent data-disabled:text-primary-disabled-foreground',
};

const sizes: Record<ButtonSize, { button: string; icon: string }> = {
  sm: { button: 'h-7 gap-1.5 rounded-md px-3 text-xs', icon: 'size-3.5' },
  md: { button: 'h-9 gap-2 rounded-lg px-4 text-sm', icon: 'size-4' },
  lg: { button: 'h-11 gap-2 rounded-lg px-5 text-base', icon: 'size-5' },
  xl: { button: 'h-12 gap-2.5 rounded-xl px-6 text-lg', icon: 'size-5' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  const iconClass = cn(
    'inline-flex shrink-0 [&>svg]:size-full',
    sizes[size].icon,
  );

  return (
    <HeadlessButton
      {...props}
      type={type}
      // While loading the button stays focusable; with aria-disabled set,
      // Headless UI swallows click/key handlers and prevents form submission.
      aria-busy={loading || undefined}
      aria-disabled={loading || props['aria-disabled'] || undefined}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      className={cn(base, variants[variant], sizes[size].button, className)}
    >
      {leadingIcon && (
        <span aria-hidden="true" className={iconClass}>
          {leadingIcon}
        </span>
      )}
      {children}
      {loading ? (
        <Spinner className={iconClass} />
      ) : (
        trailingIcon && (
          <span aria-hidden="true" className={iconClass}>
            {trailingIcon}
          </span>
        )
      )}
    </HeadlessButton>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      data-slot="spinner"
      className={cn('animate-spin', className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-30"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
