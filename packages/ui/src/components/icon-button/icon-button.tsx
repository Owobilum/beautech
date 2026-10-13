import { Button as HeadlessButton } from '@headlessui/react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import {
  buttonBase,
  buttonVariants,
  type ButtonVariant,
} from '../button/button';
import { Spinner } from '../spinner/spinner';

export type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  'type' | 'children' | 'aria-label'
> & {
  /** Accessible name (`aria-label`), also shown as a native tooltip. Required. */
  label: string;
  /** The icon. Decorative: hidden from assistive tech. */
  icon: ReactNode;
  /** Same variants as `Button`. Defaults to `subtle`. */
  variant?: ButtonVariant;
  /** Defaults to `md`. */
  size?: IconButtonSize;
  /** Defaults to `button`. */
  type?: 'button' | 'submit' | 'reset';
  /** Replaces the icon with a spinner; focusable, `aria-busy`, activation blocked. */
  loading?: boolean;
  /** Hides the native `title` tooltip, e.g. when the label is shown elsewhere. */
  hideTooltip?: boolean;
};

const sizes: Record<IconButtonSize, { button: string; icon: string }> = {
  sm: { button: 'size-7 rounded-md', icon: 'size-4' },
  md: { button: 'size-9 rounded-lg', icon: 'size-4.5' },
  lg: { button: 'size-11 rounded-lg', icon: 'size-5' },
};

/**
 * Icon-only button. The `label` prop is required so the button always has an
 * accessible name.
 */
export function IconButton({
  label,
  icon,
  variant = 'subtle',
  size = 'md',
  type = 'button',
  loading = false,
  hideTooltip = false,
  className,
  ...props
}: IconButtonProps) {
  const iconClass = cn(
    'inline-flex shrink-0 [&>svg]:size-full',
    sizes[size].icon,
  );

  return (
    <HeadlessButton
      title={hideTooltip ? undefined : label}
      {...props}
      type={type}
      aria-label={label}
      aria-busy={loading || undefined}
      aria-disabled={loading || props['aria-disabled'] || undefined}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      className={cn(
        buttonBase,
        buttonVariants[variant],
        'p-0',
        sizes[size].button,
        className,
      )}
    >
      {loading ? (
        <Spinner className={iconClass} />
      ) : (
        <span aria-hidden="true" className={iconClass}>
          {icon}
        </span>
      )}
    </HeadlessButton>
  );
}
