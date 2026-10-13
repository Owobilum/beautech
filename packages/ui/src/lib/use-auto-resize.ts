import { useCallback, useLayoutEffect, useRef } from 'react';

const px = (value: string) => parseFloat(value) || 0;

/**
 * Grows a textarea to fit its content, up to `maxRows` lines (then it
 * scrolls). Returns a ref for the textarea and a `resize` function to call on
 * input; it also re-measures whenever `value` changes, since controlled
 * values can change without an input event (e.g. cleared after submit).
 */
export function useAutoResize({
  enabled = true,
  maxRows,
  value,
}: {
  enabled?: boolean;
  maxRows?: number;
  value?: unknown;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const style = getComputedStyle(el);
    const borders = px(style.borderTopWidth) + px(style.borderBottomWidth);
    const chrome = borders + px(style.paddingTop) + px(style.paddingBottom);
    const lineHeight = px(style.lineHeight) || 20;
    const max = maxRows ? maxRows * lineHeight + chrome : Infinity;
    // Collapse first so scrollHeight reflects the content, not the old height.
    el.style.height = 'auto';
    const content = el.scrollHeight + borders;
    el.style.height = `${Math.min(content, max)}px`;
    el.style.overflowY = content > max ? 'auto' : 'hidden';
  }, [enabled, maxRows]);

  useLayoutEffect(resize, [resize, value]);

  return { ref, resize };
}
