/**
 * @fileoverview Pure copy helpers for task reminder notification payloads.
 *
 * @module shared/lib/taskReminderNotificationCopy
 *
 * Tests: `npm run test:task-reminder-notification-copy`
 * Registry: `.ai/docs/testing.md`
 */

import type { TaskStatus } from "@shared/constants/taskSettings";

/** Supported UI locales for notification copy. */
export type NotificationCopyLocale = "en" | "uk";

/** Inputs for building a reminder notification message. */
export interface TaskReminderNotificationCopyInput {
  /** Task headline. */
  title: string;
  /** Current task status. */
  status: TaskStatus;
  /** Optional deadline. */
  dueAt?: Date | string | null;
  /** UI locale for localized strings. */
  locale?: NotificationCopyLocale;
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

/** Localized notification templates. */
const COPY: Record<
  NotificationCopyLocale,
  {
    taskOverdue: string;
    taskOverdueWithDue: string;
    taskOverdueNoDue: string;
    taskReminder: string;
    taskReminderWithDue: string;
    taskReminderNoDue: string;
  }
> = {
  en: {
    taskOverdue: "Task overdue",
    taskOverdueWithDue:
      '"{title}" was due {due}. Please submit your report or confirm progress.',
    taskOverdueNoDue: '"{title}" is overdue. Please submit your report or confirm progress.',
    taskReminder: "Task reminder",
    taskReminderWithDue: 'Reminder for "{title}" — due {due}.',
    taskReminderNoDue: 'Reminder for "{title}".',
  },
  uk: {
    taskOverdue: "Прострочене завдання",
    taskOverdueWithDue:
      "«{title}» мало бути виконане до {due}. Надішліть звіт або підтвердіть прогрес.",
    taskOverdueNoDue: "«{title}» прострочено. Надішліть звіт або підтвердіть прогрес.",
    taskReminder: "Нагадування про завдання",
    taskReminderWithDue: "Нагадування про «{title}» — термін {due}.",
    taskReminderNoDue: "Нагадування про «{title}».",
  },
};

/**
 * Interpolate `{name}` placeholders in a template string.
 *
 * @param template - Message template.
 * @param values - Replacement map.
 * @returns Interpolated string.
 */
function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replace(`{${key}}`, value),
    template,
  );
}

/**
 * Build human-readable reminder copy from a task snapshot.
 *
 * @param input - Task title, status, optional due date, and locale.
 * @returns Toast title, body, and variant.
 */
export function buildTaskReminderNotificationCopy(
  input: TaskReminderNotificationCopyInput,
): TaskReminderNotificationCopy {
  const locale = input.locale ?? "en";
  const strings = COPY[locale] ?? COPY.en;

  const due =
    input.dueAt != null && input.dueAt !== ""
      ? new Date(input.dueAt)
      : null;
  const dueValid = due && !Number.isNaN(due.getTime()) ? due : null;
  const dueLabel = dueValid
    ? dueValid.toLocaleString(locale === "uk" ? "uk-UA" : undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  if (input.status === "overdue") {
    return {
      title: strings.taskOverdue,
      body: dueLabel
        ? interpolate(strings.taskOverdueWithDue, { title: input.title, due: dueLabel })
        : interpolate(strings.taskOverdueNoDue, { title: input.title }),
      variant: "warning",
    };
  }

  return {
    title: strings.taskReminder,
    body: dueLabel
      ? interpolate(strings.taskReminderWithDue, { title: input.title, due: dueLabel })
      : interpolate(strings.taskReminderNoDue, { title: input.title }),
    variant: "info",
  };
}
