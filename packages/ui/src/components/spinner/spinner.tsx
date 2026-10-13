import type { ComponentPropsWithRef } from 'react';
import { cn } from '../../lib/cn';

export type SpinnerProps = Omit<ComponentPropsWithRef<'svg'>, 'children'> & {
  /**
   * Accessible status text, e.g. "Loading messages". With a label the spinner
   * is a `role="status"` region; without one it is decorative.
   */
  label?: string;
};

/** Indeterminate loading indicator. Sized via `className` (defaults to 1em). */
export function Spinner({ label, className, ...props }: SpinnerProps) {
  const svg = (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      data-slot="spinner"
      {...props}
      // Reduced motion: keep a slow rotation, since a static ring wouldn't
      // read as "in progress".
      className={cn(
        'size-[1em] animate-spin motion-reduce:[animation-duration:2.5s]',
        className,
      )}
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

  if (!label) return svg;

  return (
    <span role="status" className="inline-flex items-center">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
