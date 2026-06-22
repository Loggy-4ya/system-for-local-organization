/**
 * @fileoverview Pure helpers for Nexus task lifecycle status transitions.
 *
 * Tests: `npm run test:task-status-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/taskStatusLogic
 */

import type { TaskStatus } from "@shared/constants/taskSettings";

/** Minimal task slice for overdue evaluation. */
export interface TaskDueSlice {
  status: TaskStatus;
  dueAt: Date | string | null | undefined;
}

/**
 * Normalise a due-at timestamp to Date or null.
 *
 * @param value - Raw due date from MongoDB or API.
 * @returns Parsed date or null.
 */
export function normalizeTaskDueAt(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Whether a task should be marked overdue based on due date and current status.
 *
 * @param task - Task status and due fields.
 * @param now - Reference instant.
 * @returns True when status should transition to `overdue`.
 */
export function shouldMarkTaskOverdue(task: TaskDueSlice, now: Date = new Date()): boolean {
  if (task.status === "completed" || task.status === "cancelled" || task.status === "draft") {
    return false;
  }
  const dueAt = normalizeTaskDueAt(task.dueAt);
  if (!dueAt) return false;
  return dueAt.getTime() < now.getTime();
}

/**
 * Allowed status transitions from a given status.
 *
 * @param status - Current task status.
 * @returns Array of statuses the task may move into.
 */
export function allowedTaskStatusTransitions(status: TaskStatus): TaskStatus[] {
  switch (status) {
    case "draft":
      return ["dispatched", "cancelled"];
    case "dispatched":
      return ["acknowledged", "in_progress", "overdue", "cancelled"];
    case "acknowledged":
      return ["in_progress", "submitted", "overdue", "cancelled"];
    case "in_progress":
      return ["submitted", "overdue", "cancelled"];
    case "submitted":
      return ["completed", "in_progress", "cancelled"];
    case "overdue":
      return ["in_progress", "submitted", "completed", "cancelled"];
    case "completed":
      return ["in_progress"];
    case "cancelled":
      return [];
    default:
      return [];
  }
}

/**
 * Whether a status transition is permitted.
 *
 * @param from - Current status.
 * @param to - Proposed next status.
 * @returns True when the transition is allowed.
 */
export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return allowedTaskStatusTransitions(from).includes(to);
}

/**
 * Resolve the next task status after a performer submits a completion report.
 *
 * @param current - Current task status.
 * @returns Status after report submission.
 */
export function statusAfterTaskReport(current: TaskStatus): TaskStatus {
  if (current === "completed" || current === "cancelled") return current;
  return "submitted";
}

/**
 * Resolve the next task status after an author marks the task complete.
 *
 * @param current - Current task status.
 * @returns Status after completion approval.
 */
export function statusAfterTaskCompletion(current: TaskStatus): TaskStatus {
  if (current === "cancelled") return current;
  return "completed";
}
