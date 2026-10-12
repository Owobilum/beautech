import { Description, Field, Label } from '@headlessui/react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { AlertTriangleIcon } from '../../lib/icons';

/** Props shared by every labelled form control (Input, Textarea, Select). */
export type FieldProps = {
  /** Visible label, associated with the control. */
  label?: ReactNode;
  /** Helper text below the control, linked via `aria-describedby`. */
  description?: ReactNode;
  /**
   * Error message. Marks the control `aria-invalid` and replaces the
   * description (it is linked via `aria-describedby` the same way).
   */
  error?: ReactNode;
};

/**
 * Label → control → helper text stack. Headless UI's Field wires up the ids
 * (label `for`, `aria-describedby`) and propagates `disabled` to every part.
 */
export function FormField({
  label,
  description,
  error,
  disabled,
  className,
  children,
}: FieldProps & {
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Field disabled={disabled} className={cn('flex flex-col', className)}>
      {label && (
        <Label className="mb-2 text-sm font-medium text-foreground data-disabled:text-disabled-foreground">
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <Description className="mt-1 flex items-start gap-1.5 text-xs text-danger-strong">
          <AlertTriangleIcon className="mt-px size-3.5 shrink-0" />
          {error}
        </Description>
      ) : (
        description && (
          <Description className="mt-1 text-xs text-muted-foreground data-disabled:text-disabled-foreground">
            {description}
          </Description>
        )
      )}
    </Field>
  );
}

/**
 * Shared look of text-like controls (input, textarea, select button). States
 * come from Headless UI data attributes: data-focus, data-invalid,
 * data-disabled (and data-open for the select).
 */
export const controlStyles =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-left font-sans text-sm text-foreground outline-none transition-colors ' +
  'placeholder:text-placeholder data-hover:border-border-strong ' +
  'data-focus:border-primary data-focus:ring-2 data-focus:ring-ring data-focus:ring-offset-1 ' +
  'data-invalid:border-danger data-invalid:bg-danger-muted data-invalid:data-focus:ring-ring-danger ' +
  'data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-disabled data-disabled:text-disabled-foreground';
