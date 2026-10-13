import {
  useId,
  useMemo,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '../../lib/cn';
import { SendIcon, StopIcon } from '../../lib/icons';
import { mergeRefs } from '../../lib/merge-refs';
import { useAutoResize } from '../../lib/use-auto-resize';
import { IconButton } from '../icon-button/icon-button';

export type MessageComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Called with the current value on Enter or the send button. */
  onSubmit: (value: string) => void;
  /** Called by the stop button while `busy`. */
  onStop?: () => void;
  /**
   * A response is in progress: submitting is blocked and the send button
   * becomes a stop button. Typing stays enabled.
   */
  busy?: boolean;
  /** Disables the whole composer. */
  disabled?: boolean;
  /** Accessible name of the text box. Defaults to "Message". */
  label?: string;
  placeholder?: string;
  /** Character limit. Over the limit, the field is invalid and can't submit. */
  maxLength?: number;
  /** Lines before the text box scrolls. Defaults to 8. */
  maxRows?: number;
  submitLabel?: string;
  stopLabel?: string;
  /** Hint text under the field, e.g. keyboard shortcuts. */
  hint?: ReactNode;
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** id of the text box, e.g. as a skip-link target. */
  id?: string;
  className?: string;
};

const numberFormat = new Intl.NumberFormat();

/**
 * Chat input: an auto-growing text box with a send / stop button. Enter
 * submits, Shift+Enter inserts a newline, and Enter while composing text with
 * an IME is left alone.
 */
export function MessageComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  busy = false,
  disabled = false,
  label = 'Message',
  placeholder,
  maxLength,
  maxRows = 8,
  submitLabel = 'Send message',
  stopLabel = 'Stop response',
  hint,
  textareaRef,
  id,
  className,
}: MessageComposerProps) {
  const { ref: autoResizeRef, resize } = useAutoResize({ maxRows, value });
  const ref = useMemo(
    () => mergeRefs(autoResizeRef, textareaRef),
    [autoResizeRef, textareaRef],
  );
  const counterId = useId();
  const hintId = useId();
  const tooLong = maxLength !== undefined && value.length > maxLength;
  const nearLimit = maxLength !== undefined && value.length > maxLength * 0.8;
  const canSubmit = !busy && !disabled && !tooLong && value.trim() !== '';

  function submit() {
    if (canSubmit) onSubmit(value);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
  }

  const describedBy =
    [nearLimit && counterId, hint && hintId].filter(Boolean).join(' ') ||
    undefined;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col gap-1.5', className)}
    >
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 pl-4 transition-colors',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-ring',
          tooLong &&
            'border-danger focus-within:border-danger focus-within:ring-ring-danger',
          disabled && 'bg-disabled',
        )}
      >
        {/* A plain textarea rather than Textarea: the label is visually
            hidden and the counter is linked manually, so the field anatomy
            (Headless UI Field) would only get in the way. */}
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onInput={resize}
          onKeyDown={handleKeyDown}
          aria-label={label}
          aria-describedby={describedBy}
          aria-invalid={tooLong || undefined}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="block min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 font-sans text-sm text-foreground outline-none placeholder:text-placeholder disabled:cursor-not-allowed disabled:text-disabled-foreground"
        />
        {/* One element whose props change, so focus survives send ⇄ stop. */}
        <IconButton
          type={busy ? 'button' : 'submit'}
          variant={busy ? 'secondary' : 'primary'}
          label={busy ? stopLabel : submitLabel}
          icon={busy ? <StopIcon /> : <SendIcon />}
          onClick={busy ? onStop : undefined}
          disabled={disabled || (!busy && !canSubmit)}
          className="rounded-xl"
        />
      </div>
      {(nearLimit || hint) && (
        <div className="flex justify-between gap-4 px-1 text-xs">
          <span id={hintId} className="text-muted-foreground">
            {hint}
          </span>
          {nearLimit && (
            <span
              id={counterId}
              className={cn(
                'shrink-0 tabular-nums',
                tooLong ? 'text-danger-strong' : 'text-muted-foreground',
              )}
            >
              {tooLong && 'Too long: '}
              {numberFormat.format(value.length)} /{' '}
              {numberFormat.format(maxLength ?? 0)}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
