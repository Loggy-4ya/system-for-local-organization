/**
 * @fileoverview Pure helpers for task group aggregate status from child tasks.
 *
 * Tests: `npm run test:task-group-status-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/taskGroupStatusLogic
 */

import type { TaskGroupStatus, TaskStatus } from "@shared/constants/taskSettings";

/** Open child task statuses that block group completion. */
export const OPEN_TASK_STATUSES: TaskStatus[] = [
  "draft",
  "dispatched",
  "acknowledged",
  "in_progress",
  "submitted",
  "overdue",
];

/**
 * Whether every child task is terminal (completed or cancelled).
 *
 * @param childStatuses - Status values of tasks in the group.
 * @returns True when no open child tasks remain.
 */
export function allGroupTasksTerminal(childStatuses: TaskStatus[]): boolean {
  if (childStatuses.length === 0) return false;
  return childStatuses.every((status) => status === "completed" || status === "cancelled");
}

/**
 * Whether a group should auto-transition to completed.
 *
 * @param groupStatus - Current group status.
 * @param childStatuses - Child task statuses.
 * @returns True when group should be marked completed.
 */
export function shouldCompleteTaskGroup(
  groupStatus: TaskGroupStatus,
  childStatuses: TaskStatus[],
): boolean {
  if (groupStatus === "cancelled" || groupStatus === "completed" || groupStatus === "draft") {
    return false;
  }
  return allGroupTasksTerminal(childStatuses);
}

/**
 * Resolve next group status after activating (first child task added).
 *
 * @param current - Current group status.
 * @returns Next status when a child task is linked.
 */
export function statusAfterGroupActivation(current: TaskGroupStatus): TaskGroupStatus {
  if (current === "draft") return "active";
  return current;
}
