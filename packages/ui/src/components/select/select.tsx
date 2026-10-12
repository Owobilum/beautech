import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { CheckIcon, ChevronDownIcon } from '../../lib/icons';
import { controlStyles, FormField, type FieldProps } from '../field/field';

export type SelectOption<T> = {
  value: T;
  label: ReactNode;
  /** Secondary line shown under the label in the list. */
  description?: ReactNode;
  disabled?: boolean;
};

export type SelectProps<T> = FieldProps & {
  options: SelectOption<T>[];
  /** Controlled value. */
  value?: T;
  /** Initial value when uncontrolled. */
  defaultValue?: T;
  onChange?: (value: T) => void;
  /** Shown while nothing is selected. */
  placeholder?: ReactNode;
  /** Submits the value with a surrounding form (via a hidden input). */
  name?: string;
  disabled?: boolean;
  /** Accessible name when there is no visible `label`. */
  'aria-label'?: string;
  /** Applied to the field wrapper. */
  className?: string;
};

/**
 * Single-select dropdown built on Headless UI's Listbox: full keyboard
 * support (arrows, Home/End, type-ahead, Escape), ARIA listbox semantics, and
 * an options panel anchored below the button.
 */
export function Select<T>({
  label,
  description,
  error,
  options,
  placeholder = 'Select an option',
  disabled,
  className,
  'aria-label': ariaLabel,
  ...props
}: SelectProps<T>) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      disabled={disabled}
      className={className}
    >
      <Listbox {...props} disabled={disabled} invalid={Boolean(error)}>
        <ListboxButton
          aria-label={ariaLabel}
          className={cn(
            controlStyles,
            'group flex cursor-pointer items-center justify-between gap-2 font-medium',
            'data-open:border-primary data-open:ring-2 data-open:ring-ring data-open:ring-offset-1 data-invalid:data-open:ring-ring-danger',
          )}
        >
          {({ value }) => {
            const selected = options.find((option) => option.value === value);
            return (
              <>
                <span
                  className={cn(
                    'truncate',
                    // Real text (not a placeholder attribute), so it must
                    // meet AA, including on the error tint.
                    !selected &&
                      'font-normal text-muted-foreground group-data-disabled:text-disabled-foreground group-data-invalid:text-surface-foreground',
                  )}
                >
                  {selected ? selected.label : placeholder}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-disabled:text-border-strong group-data-open:rotate-180" />
              </>
            );
          }}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom start"
          transition
          className={cn(
            'z-50 max-h-72 w-(--button-width) overflow-y-auto rounded-lg border border-border bg-surface font-sans shadow-lg outline-none [--anchor-gap:4px]',
            'transition duration-100 ease-out data-closed:opacity-0',
          )}
        >
          {options.map((option, index) => (
            <ListboxOption
              key={index}
              value={option.value}
              disabled={option.disabled}
              className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 select-none data-disabled:cursor-not-allowed data-focus:bg-primary-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-surface-foreground group-data-disabled:text-disabled-foreground group-data-focus:text-primary">
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-xs text-muted-foreground group-data-disabled:text-disabled-foreground group-data-focus:text-primary">
                    {option.description}
                  </div>
                )}
              </div>
              <CheckIcon className="invisible size-4 shrink-0 text-primary group-data-selected:visible" />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </FormField>
  );
}
