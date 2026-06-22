/**
 * @fileoverview Institutional task engine defaults — delegation quotas and reminders.
 *
 * Persisted overrides may live in {@link GeneralRulesSettings}; constants here seed
 * first deploy and document per-tier delegation limits.
 *
 * @module shared/constants/taskSettings
 */

import type { AccessLevelIndex } from "@shared/constants/accessControl";

/** Reminder delivery channel for overdue / periodic task nudges. */
export type TaskReminderChannel = "web" | "telegram";

/** How task reminders are scheduled. */
export const TASK_REMINDER_MODES = ["every", "before_due", "ongoing", "on_dates"] as const;

/** Reminder scheduling mode. */
export type TaskReminderMode = (typeof TASK_REMINDER_MODES)[number];

/** Supported reminder time units. */
export const TASK_REMINDER_UNITS = ["minutes", "hours", "days", "weeks"] as const;

/** Reminder interval unit. */
export type TaskReminderUnit = (typeof TASK_REMINDER_UNITS)[number];

/** Human-readable labels for reminder units. */
export const TASK_REMINDER_UNIT_LABELS: Record<TaskReminderUnit, string> = {
  minutes: "Minutes",
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
};

/** Human-readable labels for reminder modes. */
export const TASK_REMINDER_MODE_LABELS: Record<TaskReminderMode, string> = {
  every: "Repeat on interval",
  before_due: "Before deadline",
  ongoing: "Throughout project (until done)",
  on_dates: "On specific dates",
};

/** Allowed min/max `value` per unit. */
export const TASK_REMINDER_UNIT_LIMITS: Record<TaskReminderUnit, { min: number; max: number }> = {
  minutes: { min: 5, max: 7 * 24 * 60 },
  hours: { min: 1, max: 168 },
  days: { min: 1, max: 90 },
  weeks: { min: 1, max: 52 },
};

/** Default reminder interval in hours when periodic reminders are enabled. @deprecated Use {@link DEFAULT_TASK_REMINDER_SETTINGS}. */
export const DEFAULT_TASK_REMINDER_INTERVAL_HOURS = 24;

/** @deprecated Use {@link TASK_REMINDER_UNIT_LIMITS}.hours */
export const MIN_TASK_REMINDER_INTERVAL_HOURS = 1;

/** @deprecated Use {@link TASK_REMINDER_UNIT_LIMITS}.hours */
export const MAX_TASK_REMINDER_INTERVAL_HOURS = 168;

/** Maximum explicit reminder instants on a single task or group. */
export const MAX_TASK_REMINDER_SCHEDULED_DATES = 200;

/** JavaScript weekday index (`Date#getDay()`): 0 = Sunday … 6 = Saturday. */
export const TASK_REMINDER_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Weekday index for week-based reminder schedules. */
export type TaskReminderWeekday = (typeof TASK_REMINDER_WEEKDAYS)[number];

/** Short labels for weekday toggle buttons. */
export const TASK_REMINDER_WEEKDAY_LABELS: Record<TaskReminderWeekday, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/** Monday-first display order for week-day pickers. */
export const TASK_REMINDER_WEEKDAY_UI_ORDER: readonly TaskReminderWeekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Default weekday when enabling week-based schedules (Monday). */
export const DEFAULT_TASK_REMINDER_WEEKDAYS: TaskReminderWeekday[] = [1];

/** Default reminder settings for new tasks. */
export const DEFAULT_TASK_REMINDER_SETTINGS = {
  enabled: false,
  mode: "every" as TaskReminderMode,
  value: 24,
  unit: "hours" as TaskReminderUnit,
  channels: ["web"] as TaskReminderChannel[],
  repeatUntilDue: false,
  atTime: null as string | null,
  weekdays: [] as TaskReminderWeekday[],
  scheduledDates: [] as string[],
  repeatYearlyOnDates: false,
};

/** Default long-run reminder settings for multi-part task groups. */
export const DEFAULT_TASK_GROUP_REMINDER_SETTINGS = {
  enabled: true,
  mode: "ongoing" as TaskReminderMode,
  value: 1,
  unit: "weeks" as TaskReminderUnit,
  channels: ["web"] as TaskReminderChannel[],
  repeatUntilDue: false,
  atTime: "09:00" as string | null,
  weekdays: [...DEFAULT_TASK_REMINDER_WEEKDAYS] as TaskReminderWeekday[],
};

/** Maximum planned roster members on one multi-part project. */
export const MAX_TASK_GROUP_ROSTER_SIZE = 100;

/** Canonical task group status values. */
export const TASK_GROUP_STATUSES = ["draft", "active", "completed", "cancelled"] as const;

/** Lifecycle status for a grouped multi-part project. */
export type TaskGroupStatus = (typeof TASK_GROUP_STATUSES)[number];

/** Human-readable labels for task group statuses. */
export const TASK_GROUP_STATUS_LABELS: Record<TaskGroupStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Default score range for task completion (matches quality score scale). */
export const TASK_SCORE_MIN = 0;

/** Default score range for task completion (matches quality score scale). */
export const TASK_SCORE_MAX = 10000;

/** Minimum quality/time coefficient as a percentage (0%). */
export const TASK_COEFFICIENT_PERCENT_MIN = 0;

/** Maximum quality/time coefficient as a percentage (200%). */
export const TASK_COEFFICIENT_PERCENT_MAX = 200;

/** Default Q/T coefficients when not overridden (100% = neutral multiplier). */
export const TASK_COEFFICIENT_PERCENT_DEFAULT = 100;

/** @deprecated Use {@link TASK_COEFFICIENT_PERCENT_MIN}. */
export const TASK_SCORE_COEFFICIENT_MIN = 0.05;

/** @deprecated Use {@link TASK_COEFFICIENT_PERCENT_MAX}. */
export const TASK_SCORE_COEFFICIENT_MAX = 1;

/** Where to notify performers when a task is dispatched. */
export const TASK_ASSIGNMENT_NOTIFY_TARGETS = ["telegram_dm", "telegram_group"] as const;

/** Assignment notification delivery target. */
export type TaskAssignmentNotifyTarget =
  (typeof TASK_ASSIGNMENT_NOTIFY_TARGETS)[number];

/** Default assignment notification targets for new tasks. */
export const DEFAULT_TASK_ASSIGNMENT_NOTIFY_TARGETS: TaskAssignmentNotifyTarget[] = [
  "telegram_dm",
];

/**
 * Default number of tasks a performer may delegate to others per assignment chain.
 *
 * `null` means unlimited delegation (system administrators).
 */
export const DEFAULT_TASK_DELEGATION_LIMITS: Record<AccessLevelIndex, number | null> = {
  0: null,
  1: null,
  2: 10,
  3: 3,
  4: 1,
  5: 5,
  6: 0,
};

/** Canonical task status values stored on MongoDB task documents. */
export const TASK_STATUSES = [
  "draft",
  "dispatched",
  "acknowledged",
  "in_progress",
  "submitted",
  "completed",
  "overdue",
  "cancelled",
] as const;

/** Lifecycle status for a Nexus task document. */
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Human-readable labels for task statuses in UI surfaces. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  draft: "Draft",
  dispatched: "Dispatched",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
  overdue: "Overdue",
  cancelled: "Cancelled",
};
