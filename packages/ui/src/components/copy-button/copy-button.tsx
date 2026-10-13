import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from '../../lib/icons';
import { IconButton, type IconButtonProps } from '../icon-button/icon-button';

export type CopyButtonProps = Omit<
  IconButtonProps,
  'icon' | 'label' | 'onClick' | 'loading'
> & {
  /** Text to copy, or a function returning it (read at click time). */
  text: string | (() => string);
  /** Accessible name. Defaults to "Copy". */
  label?: string;
  /** Announced after a successful copy. Defaults to "Copied". */
  copiedMessage?: string;
  /** Announced when the clipboard is unavailable. Defaults to "Copy failed". */
  errorMessage?: string;
  /** How long the success state shows, in ms. Defaults to 2000. */
  resetAfter?: number;
  onCopy?: (text: string) => void;
  onCopyError?: (error: unknown) => void;
};

type CopyState = 'idle' | 'copied' | 'error';

/**
 * Copies text to the clipboard. The icon briefly switches to a check mark,
 * and the result is announced through a polite live region; the button's
 * name stays the same so focus doesn't re-announce it.
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedMessage = 'Copied',
  errorMessage = 'Copy failed',
  resetAfter = 2000,
  onCopy,
  onCopyError,
  ...props
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const value = typeof text === 'function' ? text() : text;
    clearTimeout(timer.current);
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      setState('copied');
      onCopy?.(value);
    } catch (error) {
      setState('error');
      onCopyError?.(error);
    }
    timer.current = setTimeout(() => setState('idle'), resetAfter);
  }

  return (
    <>
      <IconButton
        {...props}
        label={label}
        data-state={state}
        icon={state === 'copied' ? <CheckIcon /> : <CopyIcon />}
        onClick={copy}
      />
      <span role="status" className="sr-only">
        {state === 'copied'
          ? copiedMessage
          : state === 'error'
            ? errorMessage
            : ''}
      </span>
    </>
  );
}
