/**
 * @fileoverview Pure helpers for profile task panels — sorting, badges, relative time.
 *
 * @module shared/lib/profileTaskDisplayLogic
 */

import type { TaskStatus } from "@shared/constants/taskSettings";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";
import type { TaskListRow } from "@shared/domains/TaskDomain";

/** CSS badge class token for a task status chip on profile surfaces. */
export type ProfileTaskStatusBadgeClass =
  | "badge-warning"
  | "badge-success"
  | "badge-role"
  | "badge-group";

/** Urgency rank — lower sorts earlier in profile task lists. */
const PROFILE_TASK_STATUS_URGENCY: Record<TaskStatus, number> = {
  overdue: 0,
  dispatched: 1,
  acknowledged: 2,
  in_progress: 3,
  submitted: 4,
  draft: 5,
  completed: 6,
  cancelled: 7,
};

/** Terminal statuses hidden from the profile "current work" panel. */
export const PROFILE_OPEN_TASK_STATUSES: TaskStatus[] = [
  "draft",
  "dispatched",
  "acknowledged",
  "in_progress",
  "submitted",
  "overdue",
];

/**
 * Whether a task should appear in profile "currently performing" lists.
 *
 * @param status - Task lifecycle status.
 * @returns True for non-terminal work-in-flight statuses.
 */
export function isProfileOpenTaskStatus(status: TaskStatus): boolean {
  return PROFILE_OPEN_TASK_STATUSES.includes(status);
}

/**
 * Resolve badge CSS class for a task status on profile cards.
 *
 * @param status - Task lifecycle status.
 * @returns Badge class token from global profile styles.
 */
export function profileTaskStatusBadgeClass(status: TaskStatus): ProfileTaskStatusBadgeClass {
  if (status === "overdue" || status === "dispatched") return "badge-warning";
  if (status === "submitted" || status === "completed") return "badge-success";
  if (status === "in_progress" || status === "acknowledged") return "badge-role";
  return "badge-group";
}

/**
 * Sort profile task rows — overdue and unacknowledged work surfaces first.
 *
 * @param tasks - Task list rows.
 * @returns New sorted array (does not mutate input).
 */
export function sortProfileTaskRows(tasks: TaskListRow[]): TaskListRow[] {
  return [...tasks].sort((left, right) => {
    const urgencyDelta =
      PROFILE_TASK_STATUS_URGENCY[left.status] - PROFILE_TASK_STATUS_URGENCY[right.status];
    if (urgencyDelta !== 0) return urgencyDelta;

    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

/**
 * Format a relative "updated …" label for profile task cards.
 *
 * @param date - Last update timestamp.
 * @returns Human-readable relative label.
 */
export function formatProfileTaskRelativeTime(date: Date | string): string {
  const value = new Date(date);
  const diffMs = Date.now() - value.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Updated just now";
  if (diffMin < 60) return `Updated ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Updated ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `Updated ${diffDay}d ago`;
  return `Updated ${value.toLocaleDateString()}`;
}

/**
 * Build a compact secondary line for a profile task card.
 *
 * @param task - Task list row.
 * @returns Meta string combining due date, author, and group when present.
 */
export function formatProfileTaskMetaLine(task: TaskListRow): string {
  const parts: string[] = [];
  parts.push(task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date");
  parts.push(`by ${task.authorDisplayName}`);
  if (task.groupTitle) parts.push(task.groupTitle);
  parts.push(TASK_STATUS_LABELS[task.status]);
  return parts.join(" · ");
}
