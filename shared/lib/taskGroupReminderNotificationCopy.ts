/**
 * @fileoverview Copy helpers for long-run task group reminder notifications.
 *
 * @module shared/lib/taskGroupReminderNotificationCopy
 *
 * Tests: `npm run test:task-group-reminder-notification-copy`
 * Registry: `.ai/docs/testing.md`
 */

/** One incomplete child task row for group reminder summaries. */
export interface TaskGroupReminderTaskSlice {
  /** Task id string. */
  id: string;
  /** Task headline. */
  title: string;
}

/**
 * Build consolidated reminder copy for a performer's open group parts.
 *
 * @param groupTitle - Parent project title.
 * @param openTasks - Incomplete tasks assigned to the performer.
 * @param groupDueAt - Optional overall project deadline.
 * @returns Toast title and body.
 */
export function buildTaskGroupReminderNotificationCopy(
  groupTitle: string,
  openTasks: TaskGroupReminderTaskSlice[],
  groupDueAt?: Date | string | null,
): { title: string; body: string; variant: "info" | "warning" } {
  const due =
    groupDueAt != null && groupDueAt !== ""
      ? new Date(groupDueAt)
      : null;
  const dueValid = due && !Number.isNaN(due.getTime()) ? due : null;
  const overdue = dueValid ? dueValid.getTime() < Date.now() : false;

  const lines = openTasks.slice(0, 5).map((task) => `• ${task.title}`);
  if (openTasks.length > 5) {
    lines.push(`• …and ${openTasks.length - 5} more`);
  }

  const dueLine = dueValid
    ? overdue
      ? `Project deadline was ${dueValid.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`
      : `Project due ${dueValid.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`
    : null;

  return {
    title: overdue ? "Project overdue" : "Project reminder",
    body: [
      `"${groupTitle}" — ${openTasks.length} open part${openTasks.length === 1 ? "" : "s"} assigned to you:`,
      ...lines,
      dueLine,
    ]
      .filter(Boolean)
      .join("\n"),
    variant: overdue ? "warning" : "info",
  };
}
