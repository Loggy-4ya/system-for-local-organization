/**
 * @fileoverview Handler for task overdue scheduler events.
 *
 * @module shared/lib/scheduledEventHandlers/handleTaskOverdue
 */

import { TaskDomain } from "@shared/domains/TaskDomain";

/**
 * Mark a task overdue when its due date is reached.
 *
 * @param payload - Scheduler payload — must include `taskId`.
 */
export async function handleTaskOverdue(payload: Record<string, unknown>): Promise<void> {
  const taskId = typeof payload.taskId === "string" ? payload.taskId.trim() : "";
  if (!taskId) {
    throw new Error("task_overdue payload requires a non-empty taskId.");
  }
  await TaskDomain.executeOverdue(taskId);
}
