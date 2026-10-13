'use client';

import { useEffect } from 'react';
import { mergeExternal } from '../domain/reducer';
import type { ChatStore } from '../store/chat-store';
import { getStorage, parsePersisted, saveState, STORAGE_KEY } from './storage';

const SAVE_DELAY_MS = 300;

/**
 * Loads chat state from localStorage after mount (never during server
 * rendering, so the first client render matches the server HTML), then saves
 * changes (debounced, flushed when the page hides) and merges changes made
 * in other tabs. Save problems are reported as `storageProblem` in the store.
 */
export function usePersistence(store: ChatStore): void {
  useEffect(() => {
    const storage = getStorage();
    store.dispatch({
      type: 'hydrated',
      persisted: storage
        ? parsePersisted(storage.getItem(STORAGE_KEY), {
            interruptStreaming: true,
          })
        : { conversations: {}, activeId: null, deleted: {} },
    });
    if (!storage) {
      store.dispatch({ type: 'storageStatusChanged', problem: 'unavailable' });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastSaved = store.getState();

    const save = () => {
      clearTimeout(timer);
      timer = undefined;
      // Always the latest snapshot, never one captured when the save was
      // scheduled.
      const state = store.getState();
      if (state === lastSaved) return;
      lastSaved = state;
      const result = saveState(storage, state, mergeExternal, Date.now());
      store.dispatch({
        type: 'storageStatusChanged',
        problem: result.ok ? null : result.reason,
      });
    };

    const unsubscribe = store.subscribe(() => {
      timer ??= setTimeout(save, SAVE_DELAY_MS);
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.storageArea !== storage) return;
      store.dispatch({
        type: 'externalChange',
        persisted: parsePersisted(event.newValue, {
          interruptStreaming: false,
        }),
      });
    };
    const onPageHide = () => save();

    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      save();
      unsubscribe();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [store]);
}
