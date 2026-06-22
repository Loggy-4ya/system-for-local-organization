/**
 * @fileoverview Pure copy helpers for task reminder notification payloads.
 *
 * @module shared/lib/taskReminderNotificationCopy
 *
 * Tests: `npm run test:task-reminder-notification-copy`
 * Registry: `.ai/docs/testing.md`
 */

import type { TaskStatus } from "@shared/constants/taskSettings";

/** Inputs for building a reminder notification message. */
export interface TaskReminderNotificationCopyInput {
  /** Task headline. */
  title: string;
  /** Current task status. */
  status: TaskStatus;
  /** Optional deadline. */
  dueAt?: Date | string | null;
}

/** Generated reminder title and body for web/Telegram delivery. */
export interface TaskReminderNotificationCopy {
  /** Short toast headline. */
  title: string;
  /** Supporting message body. */
  body: string;
  /** Visual tone for web toast styling. */
  variant: "info" | "warning";
}

/**
 * Build human-readable reminder copy from a task snapshot.
 *
 * @param input - Task title, status, and optional due date.
 * @returns Toast title, body, and variant.
 */
export function buildTaskReminderNotificationCopy(
  input: TaskReminderNotificationCopyInput,
): TaskReminderNotificationCopy {
  const due =
    input.dueAt != null && input.dueAt !== ""
      ? new Date(input.dueAt)
      : null;
  const dueValid = due && !Number.isNaN(due.getTime()) ? due : null;
  const dueLabel = dueValid
    ? dueValid.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  if (input.status === "overdue") {
    return {
      title: "Task overdue",
      body: dueLabel
        ? `"${input.title}" was due ${dueLabel}. Please submit your report or confirm progress.`
        : `"${input.title}" is overdue. Please submit your report or confirm progress.`,
      variant: "warning",
    };
  }

  return {
    title: "Task reminder",
    body: dueLabel
      ? `Reminder for "${input.title}" — due ${dueLabel}.`
      : `Reminder for "${input.title}".`,
    variant: "info",
  };
}
