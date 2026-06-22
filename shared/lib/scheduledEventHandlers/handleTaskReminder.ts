/**
 * @fileoverview Handler for periodic task reminder scheduler events.
 *
 * @module shared/lib/scheduledEventHandlers/handleTaskReminder
 */

import { TaskDomain } from "@shared/domains/TaskDomain";

/**
 * Execute a periodic task reminder tick and reschedule the next occurrence.
 *
 * @param payload - Scheduler payload — must include `taskId`.
 */
export async function handleTaskReminder(payload: Record<string, unknown>): Promise<void> {
  const taskId = typeof payload.taskId === "string" ? payload.taskId.trim() : "";
  if (!taskId) {
    throw new Error("task_reminder payload requires a non-empty taskId.");
  }
  await TaskDomain.executeReminder(taskId);
}
