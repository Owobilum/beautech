'use client';

import {
  ArrowDownIcon,
  Button,
  EmptyState,
  IconButton,
  MenuIcon,
  MessageComposer,
  MessageSquareIcon,
  Spinner,
} from '@owobilum/ui';
import { useCallback, useRef, useState } from 'react';
import { LIMITS } from '@/lib/shared/chat-schema';
import { isStreaming } from '../domain/reducer';
import { DEFAULT_TITLE } from '../domain/title';
import { useStickToBottom } from '../hooks/use-stick-to-bottom';
import { useChatController, useChatSelector } from '../store/chat-context';
import { MessageItem } from './MessageItem';
import { StatusAnnouncer } from './StatusAnnouncer';

const NEW_CHAT_KEY = '__new__';

export function ConversationView({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  const controller = useChatController();
  const hydrated = useChatSelector((s) => s.hydrated);
  const activeId = useChatSelector((s) => s.activeId);
  const title = useChatSelector((s) =>
    s.activeId ? s.conversations[s.activeId]?.title : undefined,
  );
  const messageCount = useChatSelector((s) =>
    s.activeId ? (s.conversations[s.activeId]?.messages.length ?? 0) : 0,
  );
  const busy = useChatSelector((s) => {
    const conversation = s.activeId ? s.conversations[s.activeId] : undefined;
    return conversation ? isStreaming(conversation) : false;
  });

  // Unsent drafts are kept per conversation while the page is open.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftKey = activeId ?? NEW_CHAT_KEY;
  const draft = drafts[draftKey] ?? '';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
    useStickToBottom<HTMLDivElement, HTMLDivElement>(activeId);

  const focusComposer = useCallback(() => textareaRef.current?.focus(), []);

  const handleSubmit = (value: string) => {
    const conversationId = controller.send(value);
    if (!conversationId) return;
    setDrafts(({ [draftKey]: _sent, ...rest }) => rest);
    scrollToBottom();
  };

  const handleRetry = useCallback(
    (messageId: string) => {
      if (activeId) controller.retry(activeId, messageId);
      focusComposer();
    },
    [activeId, controller, focusComposer],
  );

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:px-6">
        <IconButton
          label="Open conversations"
          icon={<MenuIcon />}
          onClick={onOpenSidebar}
          className="md:hidden"
        />
        <h1 className="truncate text-sm font-semibold text-foreground">
          {title ?? DEFAULT_TITLE}
        </h1>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain"
        >
          <div
            ref={contentRef}
            className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6"
          >
            {!hydrated ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Spinner label="Loading conversations" className="size-5" />
              </div>
            ) : messageCount === 0 ? (
              <EmptyState
                icon={<MessageSquareIcon />}
                title="How can I help?"
                description="Ask a question, paste some code, or brainstorm an idea. Responses stream in as they are written."
                className="py-16"
              />
            ) : (
              <ol aria-label="Messages" className="flex flex-col gap-6">
                {Array.from({ length: messageCount }, (_, index) => (
                  <li key={`${activeId}:${index}`}>
                    <MessageItem
                      conversationId={activeId ?? ''}
                      index={index}
                      isLast={index === messageCount - 1}
                      onRetry={handleRetry}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        {!isAtBottom && (
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<ArrowDownIcon />}
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md"
          >
            Jump to latest
          </Button>
        )}
      </div>

      <div className="shrink-0 px-4 pt-2 pb-4 md:px-6">
        <MessageComposer
          id="composer"
          textareaRef={textareaRef}
          className="mx-auto w-full max-w-3xl"
          value={draft}
          onValueChange={(value) =>
            setDrafts((current) => ({ ...current, [draftKey]: value }))
          }
          onSubmit={handleSubmit}
          onStop={() => {
            if (activeId) controller.stop(activeId);
            focusComposer();
          }}
          busy={busy}
          disabled={!hydrated}
          placeholder="Message the assistant"
          maxLength={LIMITS.maxUserMessageChars}
          hint="Enter to send · Shift+Enter for a new line"
        />
      </div>
      <StatusAnnouncer />
    </main>
  );
}
