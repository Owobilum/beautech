'use client';

import { Drawer } from '@owobilum/ui';
import { useState } from 'react';
import { ChatProvider } from '../store/ChatProvider';
import { ConversationView } from './ConversationView';
import { Sidebar } from './Sidebar';

export function ChatApp({ fetchImpl }: { fetchImpl?: typeof fetch }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ChatProvider fetchImpl={fetchImpl}>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <a
          href="#composer"
          className="sr-only z-50 rounded-lg bg-surface px-3 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:ring-2 focus:ring-ring"
        >
          Skip to message box
        </a>
        <aside className="hidden w-72 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
          <Sidebar />
        </aside>
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          label="Conversations"
        >
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
        <ConversationView onOpenSidebar={() => setDrawerOpen(true)} />
      </div>
    </ChatProvider>
  );
}
