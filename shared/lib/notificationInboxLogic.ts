/**
 * @fileoverview Pure helpers for personal notification inbox keys and presentation.
 *
 * Tests: `tests/shared/lib/notificationInboxLogic.test.ts` — `npm run test:notification-inbox`
 *
 * @module shared/lib/notificationInboxLogic
 */

import {
  USER_NOTIFICATION_KIND_LABELS,
  type NotificationInboxChannel,
  type NotificationInboxVariant,
  type UserNotificationKind,
} from "@shared/constants/notificationInbox";

/** Task reminder document kind from {@link TaskReminderNotification}. */
export type TaskReminderDocumentKind = "task" | "group" | "institutional";

/**
 * Build a stable inbox delivery key for upserts.
 *
 * @param prefix - Namespace prefix (`broadcast`, `task_reminder`, …).
 * @param parts - Unique segments joined with `:`.
 * @returns Delivery key string.
 */
export function buildInboxDeliveryKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(":")}`;
}

/**
 * Map task reminder storage kind to inbox kind slug.
 *
 * @param kind - Reminder document kind.
 * @returns Inbox kind for UI grouping.
 */
export function mapTaskReminderKindToInboxKind(
  kind: TaskReminderDocumentKind,
): UserNotificationKind {
  if (kind === "group") return "task_group_reminder";
  if (kind === "institutional") return "institutional_reminder";
  return "task_reminder";
}

/**
 * Whether an inbox row is unread.
 *
 * @param readAt - Persisted read timestamp or null.
 * @returns True when unread.
 */
export function isNotificationInboxUnread(readAt: Date | null | undefined): boolean {
  return readAt == null;
}

/**
 * Resolve a human label for an inbox kind.
 *
 * @param kind - Inbox kind slug.
 * @returns Display label.
 */
export function resolveNotificationKindLabel(kind: UserNotificationKind): string {
  return USER_NOTIFICATION_KIND_LABELS[kind] ?? "Notification";
}

/**
 * Normalize channel list for persistence — drops unknown slugs, dedupes in registry order.
 *
 * @param channels - Raw channel slugs.
 * @returns Sanitized channel array (defaults to `web` when empty).
 */
export function normalizeNotificationInboxChannels(
  channels: readonly string[] | undefined,
): NotificationInboxChannel[] {
  const allowed: NotificationInboxChannel[] = ["web", "telegram"];
  if (!channels?.length) return ["web"];

  const seen = new Set<NotificationInboxChannel>();
  for (const entry of channels) {
    if (entry === "web" || entry === "telegram") {
      seen.add(entry);
    }
  }

  if (seen.size === 0) return ["web"];
  return allowed.filter((channel) => seen.has(channel));
}

/**
 * CSS modifier class suffix for an inbox variant.
 *
 * @param variant - Inbox visual variant.
 * @returns BEM-style modifier token.
 */
export function notificationInboxVariantClass(variant: NotificationInboxVariant): string {
  return `notification-inbox-row--${variant}`;
}
