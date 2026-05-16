'use client';

/**
 * C09 topbar notifications menu — W20 F1.1 (per ADR-0032 absorbed scope).
 *
 * Bell icon trigger with a small counter badge → shadcn DropdownMenu surfaces
 * recent activity (KB ingestion / eval run / system events). Per W19 F2 item 21
 * the backend `GET /notifications` endpoint is OPTIONAL — Wave A ships the
 * component with a useQuery that falls back to a small static "what could land
 * here" list when the endpoint 404s (so the topbar surface is consistent across
 * dev / Beta / Wave C real-backend states). "See all → /notifications" stays a
 * `<DisabledAffordance>` until a dedicated route ships (out of Wave A scope).
 *
 * 100% design tokens; the Bell + unread-dot use `text-foreground` /
 * `bg-destructive` semantic tokens (no hardcoded `oklch()` arbitrary values).
 */

import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DisabledAffordance } from '@/components/ui/disabled-affordance';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api-client';

export interface NotificationItem {
  id: string;
  /** Short headline shown as the list item. */
  title: string;
  /** Optional ISO-8601 timestamp; rendered relative to now if present. */
  created_at?: string;
  /** Whether the user has seen this item — drives the unread-dot. */
  read?: boolean;
}

interface NotificationsResponse {
  items: NotificationItem[];
}

/** Static fallback shown when `GET /notifications` 404s (Wave A — endpoint optional). */
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: 'mock-1', title: 'KB ingestion completed — Drive Project (12 docs)' },
  { id: 'mock-2', title: 'Eval run finished — R@5 0.97 / Faithfulness 0.94' },
  { id: 'mock-3', title: 'New chat conversation persisted server-side' },
];

function formatRelative(iso?: string): string | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMin = Math.round((Date.now() - ts) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function NotificationsMenu() {
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());

  const query = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<NotificationsResponse>('/notifications'),
    // Endpoint is OPTIONAL per W19 F2 item 21 — don't hammer it on failure.
    retry: false,
    // Light polling so the badge stays warm without being a websocket.
    refetchInterval: 60_000,
  });

  const items = useMemo<NotificationItem[]>(() => {
    if (query.data?.items) return query.data.items;
    // 404 / network failure → mock fallback (deterministic; not auto-incrementing).
    return MOCK_NOTIFICATIONS;
  }, [query.data]);

  const unreadCount = useMemo(() => {
    return items.filter((it) => !it.read && !locallyReadIds.has(it.id)).length;
  }, [items, locallyReadIds]);

  const handleMarkAllRead = () => {
    setLocallyReadIds(new Set(items.map((it) => it.id)));
  };

  const backendAvailable = !query.isError;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications — ${unreadCount} unread`
              : 'Notifications'
          }
          className="relative h-9 w-9"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="px-0 py-0">
            Notifications
          </DropdownMenuLabel>
          {backendAvailable ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          ) : (
            <DisabledAffordance reason="Notifications backend pending — Wave A optional per W19 F2 item 21">
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="h-7 gap-1 px-2 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            </DisabledAffordance>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          items.map((item) => {
            const isRead = item.read || locallyReadIds.has(item.id);
            const when = formatRelative(item.created_at);
            return (
              <DropdownMenuItem
                key={item.id}
                className="flex flex-col items-start gap-0.5 py-2"
              >
                <div className="flex w-full items-center gap-2">
                  {!isRead && (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                    />
                  )}
                  <span className="min-w-0 truncate text-sm">{item.title}</span>
                </div>
                {when && (
                  <span className="text-[11px] text-muted-foreground">
                    {when}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          {/* `/notifications` index route is out of Wave A scope — guard with
              DisabledAffordance so the surface is honest about Tier boundary. */}
          <DisabledAffordance reason="A dedicated /notifications history page is out of Wave A scope">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-7 w-full justify-center px-2 text-xs"
            >
              See all →
            </Button>
          </DisabledAffordance>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
