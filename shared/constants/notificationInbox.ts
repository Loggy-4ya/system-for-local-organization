/**
 * @fileoverview Canonical kinds and delivery channels for the personal notification inbox.
 *
 * Future messengers (email, push, …) register slugs in {@link NOTIFICATION_INBOX_CHANNELS}
 * and add dispatcher branches in {@link NotificationDomain} — no schema migration required.
 *
 * @module shared/constants/notificationInbox
 */

/** Persisted notification categories shown in the personal inbox. */
export const USER_NOTIFICATION_KINDS = [
  "broadcast",
  "task_reminder",
  "task_group_reminder",
  "institutional_reminder",
  "task_assignment",
  "page_published",
  "page_mention",
] as const;

/** Inbox notification kind slug. */
export type UserNotificationKind = (typeof USER_NOTIFICATION_KINDS)[number];

/** Visual tone for inbox rows and future toast parity. */
export const NOTIFICATION_INBOX_VARIANTS = ["info", "success", "warning", "error"] as const;

/** Inbox row visual variant. */
export type NotificationInboxVariant = (typeof NOTIFICATION_INBOX_VARIANTS)[number];

/**
 * Delivery channels recorded on each inbox row.
 * Dispatchers filter on user prefs via {@link userAcceptsNotificationChannel}.
 */
export const NOTIFICATION_INBOX_CHANNELS = ["web", "telegram"] as const;

/** Channel slug stored on inbox documents. */
export type NotificationInboxChannel = (typeof NOTIFICATION_INBOX_CHANNELS)[number];

/**
 * Planned delivery channels — reserved for future fan-out (not implemented).
 * Documented here so agents extend the registry instead of inventing parallel fields.
 */
export const NOTIFICATION_INBOX_CHANNELS_PLANNED = ["email", "push"] as const;

/** Human-readable labels for inbox kind filters. */
export const USER_NOTIFICATION_KIND_LABELS: Record<UserNotificationKind, string> = {
  broadcast: "Announcement",
  task_reminder: "Task reminder",
  task_group_reminder: "Project reminder",
  institutional_reminder: "Calendar",
  task_assignment: "Task assignment",
  page_published: "New page",
  page_mention: "Page mention",
};

/** Default page size for GET /api/notifications/inbox. */
export const DEFAULT_NOTIFICATION_INBOX_PAGE_SIZE = 15;
