'use client';

import { createContext, useContext, useRef, useSyncExternalStore } from 'react';
import type { ChatController } from '../api/chat-controller';
import type { ChatState } from '../domain/types';
import type { ChatStore } from './chat-store';

export const ChatStoreContext = createContext<ChatStore | null>(null);
export const ChatControllerContext = createContext<ChatController | null>(null);

export function useChatStore(): ChatStore {
  const store = useContext(ChatStoreContext);
  if (!store) throw new Error('useChatStore must be used inside ChatProvider');
  return store;
}

export function useChatController(): ChatController {
  const controller = useContext(ChatControllerContext);
  if (!controller) {
    throw new Error('useChatController must be used inside ChatProvider');
  }
  return controller;
}

/**
 * Subscribes to a slice of chat state. Re-renders only when the selected
 * value changes according to `isEqual` (reference equality by default), so
 * selectors may return derived arrays or objects with a custom comparison.
 */
export function useChatSelector<T>(
  selector: (state: ChatState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const store = useChatStore();
  const cache = useRef<{ state: ChatState; value: T } | null>(null);

  const getSnapshot = () => {
    const state = store.getState();
    const cached = cache.current;
    if (cached?.state === state) return cached.value;
    const value = selector(state);
    if (cached && isEqual(cached.value, value)) {
      cache.current = { state, value: cached.value };
      return cached.value;
    }
    cache.current = { state, value };
    return value;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
