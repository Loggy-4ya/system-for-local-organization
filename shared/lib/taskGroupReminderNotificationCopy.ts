/**
 * @fileoverview Copy helpers for long-run task group reminder notifications.
 *
 * @module shared/lib/taskGroupReminderNotificationCopy
 *
 * Tests: `npm run test:task-group-reminder-notification-copy`
 * Registry: `.ai/docs/testing.md`
 */

import type { BotLocale } from "@shared/constants/botLocales";
import { DEFAULT_BOT_LOCALE } from "@shared/constants/botLocales";
import { resolveBotLocale } from "@shared/lib/resolveBotLocale";

/** One incomplete child task row for group reminder summaries. */
export interface TaskGroupReminderTaskSlice {
  /** Task id string. */
  id: string;
  /** Task headline. */
  title: string;
}

/** Localized templates for group reminder notifications. */
const COPY: Record<
  BotLocale,
  {
    projectOverdue: string;
    projectReminder: string;
    openPartsIntro: string;
    openPartSingular: string;
    openPartPlural: string;
    andMore: string;
    deadlineWas: string;
    deadlineDue: string;
    bodyIntro: string;
  }
> = {
  en: {
    projectOverdue: "Project overdue",
    projectReminder: "Project reminder",
    openPartsIntro: "open part",
    openPartSingular: "",
    openPartPlural: "s",
    andMore: "…and {count} more",
    deadlineWas: "Project deadline was {due}.",
    deadlineDue: "Project due {due}.",
    bodyIntro: '"{title}" — {count} {parts} assigned to you:',
  },
  uk: {
    projectOverdue: "Проєкт прострочено",
    projectReminder: "Нагадування про проєкт",
    openPartsIntro: "відкрита частина",
    openPartSingular: "",
    openPartPlural: "и",
    andMore: "…і ще {count}",
    deadlineWas: "Термін проєкту минув {due}.",
    deadlineDue: "Термін проєкту {due}.",
    bodyIntro: "«{title}» — {count} {parts} призначено вам:",
  },
};

/**
 * Build consolidated reminder copy for a performer's open group parts.
 *
 * @param groupTitle - Parent project title.
 * @param openTasks - Incomplete tasks assigned to the performer.
 * @param groupDueAt - Optional overall project deadline.
 * @param locale - UI locale for localized strings.
 * @returns Toast title and body.
 */
export function buildTaskGroupReminderNotificationCopy(
  groupTitle: string,
  openTasks: TaskGroupReminderTaskSlice[],
  groupDueAt?: Date | string | null,
  locale?: BotLocale | string | null,
): { title: string; body: string; variant: "info" | "warning" } {
  const resolvedLocale = resolveBotLocale({ preferredLocale: locale ?? null });
  const strings = COPY[resolvedLocale] ?? COPY[DEFAULT_BOT_LOCALE];

  const due =
    groupDueAt != null && groupDueAt !== ""
      ? new Date(groupDueAt)
      : null;
  const dueValid = due && !Number.isNaN(due.getTime()) ? due : null;
  const overdue = dueValid ? dueValid.getTime() < Date.now() : false;
  const dueFormatted = dueValid
    ? dueValid.toLocaleString(resolvedLocale === "uk" ? "uk-UA" : undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const lines = openTasks.slice(0, 5).map((task) => `• ${task.title}`);
  if (openTasks.length > 5) {
    lines.push(`• ${strings.andMore.replace("{count}", String(openTasks.length - 5))}`);
  }

  const partWord =
    openTasks.length === 1
      ? strings.openPartsIntro + strings.openPartSingular
      : strings.openPartsIntro + strings.openPartPlural;

  const dueLine = dueFormatted
    ? overdue
      ? strings.deadlineWas.replace("{due}", dueFormatted)
      : strings.deadlineDue.replace("{due}", dueFormatted)
    : null;

  return {
    title: overdue ? strings.projectOverdue : strings.projectReminder,
    body: [
      strings.bodyIntro
        .replace("{title}", groupTitle)
        .replace("{count}", String(openTasks.length))
        .replace("{parts}", partWord),
      ...lines,
      dueLine,
    ]
      .filter(Boolean)
      .join("\n"),
    variant: overdue ? "warning" : "info",
  };
}
