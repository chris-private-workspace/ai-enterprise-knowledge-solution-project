'use client';

/**
 * Conversation History sidebar — W20 F3.5 (per ADR-0031 Option B server-side
 * Conversation History; C10 §7 promoted Tier 2 → Tier 1).
 *
 * Lives **inside** the `/chat` page (NOT in `<AppShell>`) — the chat page
 * decides whether the pane is visible; the AppShell's own collapse / focus-mode
 * is orthogonal. Pane width + collapsed state are persisted to localStorage so
 * the affordance is consistent across page nav.
 *
 * UX:
 *   - Header row     : "Conversations" title + "New chat" button (`<Plus>`).
 *   - List           : items sorted by `updated_at` desc (server-side); active
 *                      item highlighted; double-click → inline rename input;
 *                      Enter commits, Escape cancels; hover reveals a delete
 *                      icon-button → confirmation modal.
 *   - Empty state    : a thin "No conversations yet — start a new one above"
 *                      hint when `total === 0`.
 *
 * Data: TanStack Query — list `['conversations', 'list']` + invalidate after
 * any mutation. The parent passes `activeConversationId` so the visual active
 * row matches the page state; clicks bubble back via `onSelect`. Mutations use
 * the typed `conversationsApi` client.
 *
 * 100% design tokens — no `oklch()` arbitrary values (W15/W18/W20 milestone
 * preserved).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api-client';
import { conversationsApi, type Conversation } from '@/lib/api/conversations';
import { cn } from '@/lib/utils';

const CONVERSATIONS_LIST_KEY = ['conversations', 'list'] as const;

interface ConversationHistoryProps {
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onCreate: (conversation: Conversation) => void;
  /** Called when the active conversation is deleted (so the page can clear its messages). */
  onActiveDeleted: () => void;
}

export function ConversationHistory({
  activeConversationId,
  onSelect,
  onCreate,
  onActiveDeleted,
}: ConversationHistoryProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: CONVERSATIONS_LIST_KEY,
    queryFn: () => conversationsApi.list(50, 0),
    // Conversations rarely change outside this page — disable aggressive refetch.
    staleTime: 30_000,
  });

  const items: Conversation[] = data?.items ?? [];
  const isAuthMissing = error instanceof ApiError && error.status === 401;

  const createMut = useMutation({
    mutationFn: () => conversationsApi.create({}),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_LIST_KEY });
      onCreate(conv);
    },
  });

  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      conversationsApi.update(id, { title }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_LIST_KEY }),
  });

  const [deleteCandidate, setDeleteCandidate] = useState<Conversation | null>(null);
  const deleteMut = useMutation({
    mutationFn: (id: string) => conversationsApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_LIST_KEY });
      if (id === activeConversationId) onActiveDeleted();
      setDeleteCandidate(null);
    },
  });

  const [renameId, setRenameId] = useState<string | null>(null);

  const handleNewChat = useCallback(() => {
    if (createMut.isPending) return;
    createMut.mutate();
  }, [createMut]);

  return (
    <aside
      aria-label="Conversation history"
      className="flex h-full w-full flex-col border-r border-border bg-muted/30"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={handleNewChat}
          disabled={createMut.isPending}
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
        )}
        {!isLoading && isAuthMissing && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Sign in to keep your chat history.
          </div>
        )}
        {!isLoading && !isAuthMissing && error && (
          <div className="px-3 py-2 text-xs text-destructive">
            Couldn&apos;t load conversations.
          </div>
        )}
        {!isLoading && !error && items.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            No conversations yet — start a new one above.
          </div>
        )}
        {!isLoading &&
          !error &&
          items.map((conv) => (
            <ConversationRow
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              isRenaming={renameId === conv.id}
              onSelect={() => onSelect(conv.id)}
              onRenameStart={() => setRenameId(conv.id)}
              onRenameCommit={(title) => {
                setRenameId(null);
                if (title && title !== conv.title) {
                  renameMut.mutate({ id: conv.id, title });
                }
              }}
              onRenameCancel={() => setRenameId(null)}
              onDeleteRequest={() => setDeleteCandidate(conv)}
            />
          ))}
      </div>

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteCandidate?.title}&rdquo; and all its messages will be permanently
              removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={deleteMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteCandidate) deleteMut.mutate(deleteCandidate.id);
              }}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

interface ConversationRowProps {
  conversation: Conversation;
  isActive: boolean;
  isRenaming: boolean;
  onSelect: () => void;
  onRenameStart: () => void;
  onRenameCommit: (title: string) => void;
  onRenameCancel: () => void;
  onDeleteRequest: () => void;
}

function ConversationRow({
  conversation,
  isActive,
  isRenaming,
  onSelect,
  onRenameStart,
  onRenameCommit,
  onRenameCancel,
  onDeleteRequest,
}: ConversationRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      onClick={() => {
        if (!isRenaming) onSelect();
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isRenaming) {
          e.preventDefault();
          onSelect();
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onRenameStart();
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
        'hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isActive && 'bg-accent/15 font-medium',
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {isRenaming ? (
        <RenameInput
          initial={conversation.title}
          onCommit={onRenameCommit}
          onCancel={onRenameCancel}
        />
      ) : (
        <span className="flex-1 truncate" title={conversation.title}>
          {conversation.title}
        </span>
      )}
      {!isRenaming && (
        <button
          type="button"
          aria-label={`Delete conversation: ${conversation.title}`}
          className="invisible h-6 w-6 shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:visible focus-visible:visible focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(value.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }
  return (
    // eslint-disable-next-line jsx-a11y/no-autofocus
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => onCommit(value.trim())}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 rounded-sm border border-input bg-background px-1.5 py-0.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Rename conversation"
    />
  );
}
