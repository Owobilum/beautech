'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChatController } from '../api/chat-controller';
import { usePersistence } from '../persistence/use-persistence';
import { ChatControllerContext, ChatStoreContext } from './chat-context';
import { createChatStore, type ChatStore } from './chat-store';

export function ChatProvider({
  children,
  fetchImpl,
}: {
  children: ReactNode;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
}) {
  const [store] = useState<ChatStore>(() => createChatStore());
  const [controller] = useState(() => new ChatController(store, { fetchImpl }));
  usePersistence(store);

  useEffect(() => () => controller.dispose(), [controller]);

  return (
    <ChatStoreContext value={store}>
      <ChatControllerContext value={controller}>
        {children}
      </ChatControllerContext>
    </ChatStoreContext>
  );
}
