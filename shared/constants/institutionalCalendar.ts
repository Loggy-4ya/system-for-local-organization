/**
 * @fileoverview Limits and enums for institutional yearly calendar rules.
 *
 * @module shared/constants/institutionalCalendar
 */

import type { TaskReminderChannel } from "@shared/constants/taskSettings";
import type { SociumRoleKind } from "@shared/models/userTypes";
import type { AccessLevelIndex } from "@shared/constants/accessControl";

/** What happens when a yearly calendar rule fires. */
export const INSTITUTIONAL_CALENDAR_ACTIONS = [
  "notify_only",
  "spawn_task",
  "spawn_task_and_notify",
] as const;

/** Institutional calendar rule action. */
export type InstitutionalCalendarAction = (typeof INSTITUTIONAL_CALENDAR_ACTIONS)[number];

/** Human-readable labels for calendar rule actions. */
export const INSTITUTIONAL_CALENDAR_ACTION_LABELS: Record<InstitutionalCalendarAction, string> = {
  notify_only: "Send reminder only",
  spawn_task: "Create task (no extra toast)",
  spawn_task_and_notify: "Create task and send reminder",
};

/** Maximum yearly anchor rows per rule. */
export const MAX_INSTITUTIONAL_YEARLY_ANCHORS = 50;

/** Maximum active institutional calendar rules. */
export const MAX_INSTITUTIONAL_CALENDAR_RULES = 100;

/** Built-in socium kinds selectable on calendar rules. */
export const INSTITUTIONAL_CALENDAR_SOCIUM_KINDS: SociumRoleKind[] = [
  "starosta",
  "group_deputy",
  "student",
  "teacher",
  "self_government_member",
  "self_government_head",
  "self_government_deputy",
  "custom",
];

/** One yearly calendar anchor (month/day + optional clock time). */
export interface InstitutionalYearlyAnchor {
  /** Calendar month 1–12. */
  month: number;
  /** Calendar day 1–31. */
  day: number;
  /** Local `HH:mm` fire time. */
  atTime: string;
}

/** Task template used when action includes `spawn_task`. */
export interface InstitutionalCalendarTaskTemplate {
  /** Task headline — `{year}` is replaced with the fire year. */
  title: string;
  /** Task body — `{year}` is replaced with the fire year. */
  description: string;
  /** When true, dispatch immediately instead of draft. */
  dispatch: boolean;
}

/** Default channels for institutional calendar deliveries. */
export const DEFAULT_INSTITUTIONAL_CALENDAR_CHANNELS: TaskReminderChannel[] = ["web"];

/** Default task template for new rules. */
export const DEFAULT_INSTITUTIONAL_TASK_TEMPLATE: InstitutionalCalendarTaskTemplate = {
  title: "Annual assignment {year}",
  description: "Complete the recurring institutional assignment for {year}.",
  dispatch: true,
};

/** Default access-level filter seed (empty = not filtered by tier). */
export const DEFAULT_INSTITUTIONAL_ACCESS_LEVEL_FILTER: AccessLevelIndex[] = [];
