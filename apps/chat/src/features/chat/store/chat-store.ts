import {
  chatReducer,
  initialChatState,
  type ChatAction,
} from '../domain/reducer';
import type { ChatState } from '../domain/types';

export type ChatStore = {
  getState(): ChatState;
  /**
   * The state the store was created with: what the server rendered, so
   * hydration must render it too (see useChatSelector).
   */
  getInitialState(): ChatState;
  dispatch(action: ChatAction): void;
  subscribe(listener: () => void): () => void;
};

/**
 * Minimal external store around the reducer. Components subscribe to slices
 * with `useChatSelector`, so a streamed token only re-renders the components
 * whose selected value changed (the streaming message), not the whole tree.
 */
export function createChatStore(
  initialState: ChatState = initialChatState,
): ChatStore {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    getInitialState: () => initialState,
    dispatch(action) {
      const next = chatReducer(state, action);
      if (next === state) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
