/**
 * @fileoverview Browser fetch helpers for the personal notification inbox API.
 *
 * @module src/lib/notificationInboxClient
 */

import type { NotificationInboxListResult } from "@shared/domains/NotificationDomain";

/** Inbox list fetch options. */
export interface FetchNotificationInboxOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Load a paginated inbox page for the signed-in user.
 *
 * @param options - Pagination and filter options.
 * @returns Parsed inbox payload or null on failure.
 */
export async function fetchNotificationInbox(
  options: FetchNotificationInboxOptions = {},
): Promise<NotificationInboxListResult | null> {
  const params = new URLSearchParams();
  if (options.page != null) params.set("page", String(options.page));
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.unreadOnly) params.set("unreadOnly", "true");

  const query = params.toString();
  const res = await fetch(`/api/notifications/inbox${query ? `?${query}` : ""}`);
  if (!res.ok) return null;
  return (await res.json()) as NotificationInboxListResult;
}

/**
 * Poll unread inbox count for the header badge.
 *
 * @returns Unread count or zero on failure.
 */
export async function fetchNotificationUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications/inbox/unread-count");
  if (!res.ok) return 0;
  const data = (await res.json()) as { unreadCount?: number };
  return data.unreadCount ?? 0;
}

/**
 * Mark one inbox row read.
 *
 * @param notificationId - Inbox document id.
 * @returns True when the API succeeded.
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const res = await fetch(
    `/api/notifications/inbox/${encodeURIComponent(notificationId)}/read`,
    { method: "POST" },
  );
  return res.ok;
}

/**
 * Mark all inbox rows read.
 *
 * @returns True when the API succeeded.
 */
export async function markAllNotificationsRead(): Promise<boolean> {
  const res = await fetch("/api/notifications/inbox/read-all", { method: "POST" });
  return res.ok;
}
