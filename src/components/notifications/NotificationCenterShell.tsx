"use client";

/**
 * @fileoverview Personal notification center shell at `/profile/notifications`.
 *
 * @module src/components/notifications/NotificationCenterShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NotificationInboxListItem } from "@shared/domains/NotificationDomain";
import { NotificationInboxRow } from "@/components/notifications/NotificationInboxRow";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { Button } from "@/components/ui/button";
import {
  fetchNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notificationInboxClient";
import { cn } from "@/lib/utils";

type InboxFilter = "all" | "unread";

/**
 * Paginated notification inbox with unread filter and mark-all-read action.
 *
 * @returns Notification center page shell JSX.
 */
export function NotificationCenterShell() {
  const [items, setItems] = useState<NotificationInboxListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loading, setLoading] = useState(true);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    const data = await fetchNotificationInbox({
      page,
      unreadOnly: filter === "unread",
    });
    if (data) {
      setItems(data.items);
      setTotalPages(data.meta.totalPages);
      setTotalCount(data.meta.totalCount);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  /**
   * Mark one row read locally and persist server-side.
   *
   * @param notificationId - Inbox document id.
   */
  async function handleMarkRead(notificationId: string) {
    setItems((current) =>
      current.map((row) =>
        row.id === notificationId
          ? { ...row, readAt: new Date().toISOString() }
          : row,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    await markNotificationRead(notificationId);
  }

  /**
   * Mark every unread row read.
   */
  async function handleMarkAllRead() {
    const ok = await markAllNotificationsRead();
    if (!ok) return;
    setUnreadCount(0);
    setItems((current) =>
      current.map((row) => ({
        ...row,
        readAt: row.readAt ?? new Date().toISOString(),
      })),
    );
    if (filter === "unread") {
      setItems([]);
      setTotalCount(0);
      setTotalPages(1);
    }
  }

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <div className="glass-panel flex w-full flex-col gap-4 rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Your personal message history — task updates, reminders, and institution announcements.
              Delivery to Telegram and other channels uses your profile notification preferences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/profile/settings#notifications"
              className="text-sm text-[var(--color-text-primary)] no-underline hover:underline"
            >
              Notification settings
            </Link>
            <Link
              href="/profile"
              className="text-sm text-[var(--color-text-secondary)] no-underline hover:underline"
            >
              Back to profile
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Inbox filter">
            {(["all", "unread"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? "default" : "outline"}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "All" : `Unread (${unreadCount})`}
              </Button>
            ))}
          </div>
          {unreadCount > 0 ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => void handleMarkAllRead()}>
              Mark all read
            </Button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Loading notifications…</p>
        ) : items.length === 0 ? (
          <div
            className={cn(
              "rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-default)] p-8 text-center",
            )}
          >
            <p className="text-sm text-[var(--color-text-secondary)]">
              {filter === "unread"
                ? "You have no unread notifications."
                : "No notifications yet — task assignments, reminders, and institution messages will appear here."}
            </p>
          </div>
        ) : (
          <ul className="flex list-none flex-col gap-3 p-0">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationInboxRow item={item} onMarkRead={(id) => void handleMarkRead(id)} />
              </li>
            ))}
          </ul>
        )}

        {!loading && totalPages > 1 ? (
          <NexusListPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </StaticPageShell>
  );
}

export default NotificationCenterShell;
