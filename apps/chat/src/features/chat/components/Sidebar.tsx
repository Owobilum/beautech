'use client';

import {
  Alert,
  Button,
  IconButton,
  NavList,
  NavListItem,
  PlusIcon,
  TrashIcon,
} from '@owobilum/ui';
import { useRef } from 'react';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { sameSummaries, selectConversationList } from '../domain/selectors';
import {
  useChatController,
  useChatSelector,
  useChatStore,
} from '../store/chat-context';

/**
 * Conversation navigation. Subscribes only to ids and titles, so streamed
 * tokens never re-render it.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const store = useChatStore();
  const controller = useChatController();
  const conversations = useChatSelector(selectConversationList, sameSummaries);
  const activeId = useChatSelector((s) => s.activeId);
  const hydrated = useChatSelector((s) => s.hydrated);
  const storageProblem = useChatSelector((s) => s.storageProblem);
  const newChatRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <p className="text-sm font-semibold text-foreground">Owobilum Chat</p>
        <ThemeToggle />
      </div>
      <div className="px-3 pb-3">
        <Button
          ref={newChatRef}
          variant="secondary"
          leadingIcon={<PlusIcon />}
          className="w-full justify-start"
          disabled={!hydrated}
          onClick={() => {
            store.dispatch({ type: 'newChat' });
            onNavigate?.();
            document.getElementById('composer')?.focus();
          }}
        >
          New chat
        </Button>
      </div>
      <nav
        aria-label="Conversations"
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
      >
        {hydrated && conversations.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        )}
        <NavList>
          {conversations.map(({ id, title }) => (
            <NavListItem
              key={id}
              current={id === activeId}
              title={title}
              onClick={() => {
                store.dispatch({
                  type: 'conversationSelected',
                  conversationId: id,
                });
                onNavigate?.();
              }}
              actions={
                <IconButton
                  size="sm"
                  label={`Delete “${title}”`}
                  hideTooltip
                  icon={<TrashIcon />}
                  onClick={() => {
                    controller.deleteConversation(id);
                    newChatRef.current?.focus();
                  }}
                />
              }
            >
              {title}
            </NavListItem>
          ))}
        </NavList>
      </nav>
      <div className="border-t border-border px-4 py-3">
        {storageProblem ? (
          <Alert variant="danger" role="status">
            {storageProblem === 'quota'
              ? 'Storage is full: new messages won’t be saved.'
              : 'History can’t be saved in this browser.'}
          </Alert>
        ) : (
          <p className="text-xs text-muted-foreground">
            Conversations are saved in this browser only.
          </p>
        )}
      </div>
    </div>
  );
}
