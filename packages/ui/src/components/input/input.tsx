import {
  Input as HeadlessInput,
  Textarea as HeadlessTextarea,
} from '@headlessui/react';
import {
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type InputEvent,
} from 'react';
import { cn } from '../../lib/cn';
import { EyeIcon, EyeOffIcon } from '../../lib/icons';
import { mergeRefs } from '../../lib/merge-refs';
import { useAutoResize } from '../../lib/use-auto-resize';
import { controlStyles, FormField, type FieldProps } from '../field/field';

export type InputProps = Omit<ComponentPropsWithRef<'input'>, 'className'> &
  FieldProps & {
    /** Applied to the field wrapper (label, input and helper text). */
    className?: string;
    /** Applied to the `<input>` element itself. */
    inputClassName?: string;
  };

/**
 * Text input with optional label, helper text and error message. All native
 * `<input>` attributes and `ref` go to the input. `type="password"` adds a
 * show/hide toggle.
 */
export function Input({
  label,
  description,
  error,
  disabled,
  className,
  inputClassName,
  type = 'text',
  ...props
}: InputProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';

  const input = (
    <HeadlessInput
      {...props}
      type={isPassword && revealed ? 'text' : type}
      invalid={Boolean(error) || undefined}
      className={cn(controlStyles, isPassword && 'pr-10', inputClassName)}
    />
  );

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      disabled={disabled}
      className={className}
    >
      {isPassword ? (
        <div className="relative">
          {input}
          {/* A toggle button (aria-pressed) with a fixed name, so screen
              readers announce "Show password, toggle button, pressed". */}
          <button
            type="button"
            aria-label="Show password"
            aria-pressed={revealed}
            disabled={disabled}
            onClick={() => setRevealed((r) => !r)}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-r-lg px-3 text-muted-foreground outline-none hover:text-foreground focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-disabled-foreground"
          >
            {revealed ? (
              <EyeOffIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </button>
        </div>
      ) : (
        input
      )}
    </FormField>
  );
}

export type TextareaProps = Omit<
  ComponentPropsWithRef<'textarea'>,
  'className'
> &
  FieldProps & {
    /** Applied to the field wrapper (label, textarea and helper text). */
    className?: string;
    /** Applied to the `<textarea>` element itself. */
    textareaClassName?: string;
    /**
     * Grow with the content instead of showing a scrollbar, starting at
     * `rows` lines. Disables manual resizing.
     */
    autoResize?: boolean;
    /** With `autoResize`, stop growing (and scroll) after this many lines. */
    maxRows?: number;
  };

/** Multi-line text input with the same field anatomy as `Input`. */
export function Textarea({
  label,
  description,
  error,
  disabled,
  className,
  textareaClassName,
  rows = 3,
  autoResize = false,
  maxRows,
  ref,
  onInput,
  ...props
}: TextareaProps) {
  const { ref: innerRef, resize } = useAutoResize({
    enabled: autoResize,
    maxRows,
    value: props.value,
  });
  const mergedRef = useMemo(() => mergeRefs(innerRef, ref), [innerRef, ref]);

  function handleInput(event: InputEvent<HTMLTextAreaElement>) {
    resize();
    onInput?.(event);
  }

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      disabled={disabled}
      className={className}
    >
      <HeadlessTextarea
        {...props}
        ref={mergedRef}
        onInput={handleInput}
        rows={rows}
        invalid={Boolean(error) || undefined}
        className={cn(
          controlStyles,
          autoResize ? 'resize-none' : 'resize-y',
          textareaClassName,
        )}
      />
    </FormField>
  );
}
