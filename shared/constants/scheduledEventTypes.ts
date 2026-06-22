/**
 * @fileoverview Scheduled event type identifiers for Project Nexus background tasks.
 *
 * All background tasks, scheduled posts, and cron-like jobs register their
 * event types here to be recognized by the scheduler daemon.
 *
 * @module shared/constants/scheduledEventTypes
 */

/** Supported scheduled event types. */
export const SCHEDULED_EVENT_TYPES = {
  /** Scheduled Puck page publishing. */
  publish_page: "publish_page",
  /** Delayed system broadcast dispatch. */
  broadcast_send: "broadcast_send",
  /** Reminders for task deadlines. */
  task_reminder: "task_reminder",
  /** Long-run reminders for multi-part task groups. */
  task_group_reminder: "task_group_reminder",
  /** institutional calendar rule */
  institutional_calendar: "institutional_calendar",
  /** Provision Telegram workspace for a task group project. */
  telegram_workspace_provision: "telegram_workspace_provision",
  /** Dismantle Telegram workspace when project completes. */
  telegram_workspace_dismantle: "telegram_workspace_dismantle",
  /** Automatic overdue task escalation/triggers. */
  task_overdue: "task_overdue",
} as const;

/** Union of registered scheduled event type slugs. */
export type ScheduledEventType = (typeof SCHEDULED_EVENT_TYPES)[keyof typeof SCHEDULED_EVENT_TYPES];

/** All event type slugs — used for validation. */
export const ALL_SCHEDULED_EVENT_TYPES: ScheduledEventType[] = Object.values(SCHEDULED_EVENT_TYPES);

/** Human-readable labels for the scheduled event types. */
export const SCHEDULED_EVENT_TYPE_LABELS: Record<ScheduledEventType, string> = {
  publish_page: "Scheduled page publishing",
  broadcast_send: "Scheduled system broadcast",
  task_reminder: "Task deadline reminder",
  task_group_reminder: "Task group project reminder",
  institutional_calendar: "Institutional calendar rule",
  telegram_workspace_provision: "Telegram project workspace provisioning",
  telegram_workspace_dismantle: "Telegram project workspace dismantle",
  task_overdue: "Overdue task trigger",
};

/**
 * Validate a scheduled event type slug.
 *
 * @param value - Candidate event type string.
 * @returns True when registered.
 */
export function isScheduledEventType(value: string): value is ScheduledEventType {
  return (ALL_SCHEDULED_EVENT_TYPES as string[]).includes(value);
}
