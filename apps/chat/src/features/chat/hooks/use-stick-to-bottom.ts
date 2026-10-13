'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/** Within this many px of the bottom counts as "at the bottom". */
const THRESHOLD_PX = 40;

/**
 * Keeps a scroll container pinned to the bottom while its content grows
 * (streaming), but only while the user is already at the bottom: scrolling
 * up to read older messages unpins it. `resetKey` (e.g. the conversation id)
 * jumps back to the bottom when it changes.
 */
export function useStickToBottom<S extends HTMLElement, C extends HTMLElement>(
  resetKey: unknown,
) {
  const scrollRef = useRef<S>(null);
  const contentRef = useRef<C>(null);
  const pinned = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduceMotion ? 'auto' : behavior,
    });
    pinned.current = true;
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      pinned.current = distance <= THRESHOLD_PX;
      setIsAtBottom(pinned.current);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) scrollToBottom();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [resetKey, scrollToBottom]);

  return { scrollRef, contentRef, isAtBottom, scrollToBottom };
}
