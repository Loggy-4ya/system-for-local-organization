/**
 * @fileoverview Pure helpers for Telegram project group bot commands.
 *
 * @module shared/lib/telegramGroupCommandLogic
 *
 * Tests: `npm run test:telegram-group-command-logic`
 * Registry: `.ai/docs/testing.md`
 */

import type { TaskStatus } from "@shared/constants/taskSettings";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";

/** Minimal task row for group status listings. */
export interface TelegramGroupTaskRow {
  /** MongoDB task id. */
  id: string;
  /** Task headline. */
  title: string;
  /** Lifecycle status. */
  status: TaskStatus;
}

/**
 * Whether a task counts as open for project status summaries.
 *
 * @param status - Task lifecycle status.
 * @returns True when not terminal.
 */
export function isOpenTelegramGroupTaskStatus(status: TaskStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

/**
 * Build `/status` reply text for a linked project group.
 *
 * @param projectTitle - Task group title.
 * @param tasks - Child task rows.
 * @returns Plain-text Telegram message body.
 */
export function formatTelegramProjectStatusMessage(
  projectTitle: string,
  tasks: TelegramGroupTaskRow[],
): string {
  const open = tasks.filter((task) => isOpenTelegramGroupTaskStatus(task.status));
  if (open.length === 0) {
    return `Project «${projectTitle}» — all parts are complete.`;
  }

  const lines = open.map((task, index) => {
    const label = TASK_STATUS_LABELS[task.status] ?? task.status;
    return `${index + 1}. ${task.title} — ${label}`;
  });

  return [`Project «${projectTitle}» — open parts:`, "", ...lines, "", "Submit: /task_done <number>"].join(
    "\n",
  );
}

/**
 * Resolve which task a performer selected via `/task_done <arg>`.
 *
 * @param tasks - Open tasks the performer may submit.
 * @param arg - Numeric index (1-based) or task id prefix from the command.
 * @returns Matching task id or null.
 */
export function resolveTelegramTaskDoneTarget(
  tasks: TelegramGroupTaskRow[],
  arg: string | undefined,
): string | null {
  const open = tasks.filter((task) => isOpenTelegramGroupTaskStatus(task.status));
  if (open.length === 0) return null;

  if (!arg?.trim()) {
    return open.length === 1 ? open[0].id : null;
  }

  const trimmed = arg.trim();
  const asIndex = Number.parseInt(trimmed, 10);
  if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= open.length) {
    return open[asIndex - 1].id;
  }

  const lower = trimmed.toLowerCase();
  const byPrefix = open.find((task) => task.id.toLowerCase().startsWith(lower));
  return byPrefix?.id ?? null;
}

/**
 * Help text when `/task_done` needs a task selector.
 *
 * @param tasks - Open tasks the performer may submit.
 * @returns Instruction message.
 */
export function formatTelegramTaskDonePickerMessage(tasks: TelegramGroupTaskRow[]): string {
  const open = tasks.filter((task) => isOpenTelegramGroupTaskStatus(task.status));
  if (open.length === 0) {
    return "You have no open parts to submit in this project.";
  }

  const lines = open.map((task, index) => `${index + 1}. ${task.title}`);
  return ["Choose a part to submit:", "", ...lines, "", "Example: /task_done 1"].join("\n");
}
