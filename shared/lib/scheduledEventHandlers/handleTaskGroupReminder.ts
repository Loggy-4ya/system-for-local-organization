/**
 * @fileoverview Handler for long-run task group reminder scheduler events.
 *
 * @module shared/lib/scheduledEventHandlers/handleTaskGroupReminder
 */

import { TaskGroupDomain } from "@shared/domains/TaskGroupDomain";

/**
 * Execute a periodic task group reminder tick and reschedule the next occurrence.
 *
 * @param payload - Scheduler payload — must include `groupId`.
 */
export async function handleTaskGroupReminder(payload: Record<string, unknown>): Promise<void> {
  const groupId = typeof payload.groupId === "string" ? payload.groupId.trim() : "";
  if (!groupId) {
    throw new Error("task_group_reminder payload requires a non-empty groupId.");
  }
  await TaskGroupDomain.executeGroupReminder(groupId);
}
