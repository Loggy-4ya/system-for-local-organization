/**
 * @fileoverview Pure helpers for Telegram bot task listings and template formatting.
 *
 * @module shared/lib/telegramBotTaskLogic
 *
 * Tests: `npm run test:telegram-bot-task-logic`
 * Registry: `.ai/docs/testing.md`
 */

import type { TaskStatus } from "@shared/constants/taskSettings";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";
import { isOpenTelegramGroupTaskStatus } from "@shared/lib/telegramGroupCommandLogic";

/** Task row rendered in bot `/tasks` listings. */
export interface TelegramBotTaskListRow {
  /** MongoDB task id. */
  id: string;
  /** Task headline. */
  title: string;
  /** Lifecycle status. */
  status: TaskStatus;
  /** Optional deadline. */
  dueAt: Date | null;
  /** Parent project title when attached to a group. */
  groupTitle: string | null;
  /** Institutional category label. */
  categoryLabel: string | null;
  /** Performer role label when listing personal assignments. */
  roleLabel: string | null;
  /** Whether proof media is permitted on reports for this task. */
  reportMediaAllowed: boolean;
}

/** Interpolation context for bot task templates. */
export interface TelegramBotTaskTemplateContext {
  /** Project or list title. */
  title?: string;
  /** 1-based list index. */
  index?: number;
  /** Task headline. */
  taskTitle?: string;
  /** Public web URL to task detail. */
  taskUrl?: string;
  /** Raw status slug. */
  status?: string;
  /** Human-readable status label. */
  statusLabel?: string;
  /** ISO due date or empty. */
  dueAt?: string;
  /** Short due suffix such as ` · due 23 Jun` or empty. */
  dueAtShort?: string;
  /** Parent project title. */
  groupTitle?: string;
  /** Category label or empty. */
  categoryLabel?: string;
  /** Performer role label or empty. */
  roleLabel?: string;
  /** Performer display name for `/see_report`. */
  performerName?: string;
  /** Plain-text report body. */
  description?: string;
  /** Number of media attachments. */
  mediaCount?: number;
  /** Formatted submission timestamp. */
  submittedAt?: string;
  /** Pre-rendered numbered task list block. */
  taskList?: string;
}

/**
 * Format a due date suffix for inline task lines.
 *
 * @param dueAt - Optional deadline.
 * @returns Suffix such as ` · due 23 Jun 2026` or empty string.
 */
export function formatTelegramTaskDueShort(dueAt: Date | null): string {
  if (!dueAt) return "";
  const label = dueAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return ` · due ${label}`;
}

/**
 * Replace supported placeholders in a bot task template string.
 *
 * @param template - Admin-configured template body.
 * @param context - Placeholder values.
 * @returns Interpolated plain-text message.
 */
export function interpolateTelegramBotTaskTemplate(
  template: string,
  context: TelegramBotTaskTemplateContext,
): string {
  const replacements: Record<string, string> = {
    "{{title}}": context.title ?? "",
    "{{index}}": context.index != null ? String(context.index) : "",
    "{{taskTitle}}": context.taskTitle ?? "",
    "{{taskUrl}}": context.taskUrl ?? "",
    "{{status}}": context.status ?? "",
    "{{statusLabel}}": context.statusLabel ?? "",
    "{{dueAt}}": context.dueAt ?? "",
    "{{dueAtShort}}": context.dueAtShort ?? "",
    "{{groupTitle}}": context.groupTitle ?? "",
    "{{categoryLabel}}": context.categoryLabel ?? "",
    "{{roleLabel}}": context.roleLabel ?? "",
    "{{performerName}}": context.performerName ?? "",
    "{{description}}": context.description ?? "",
    "{{mediaCount}}": context.mediaCount != null ? String(context.mediaCount) : "",
    "{{submittedAt}}": context.submittedAt ?? "",
    "{{taskList}}": context.taskList ?? "",
  };

  let result = template;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replaceAll(token, value);
  }
  return result;
}

/**
 * Build template context for one task list row.
 *
 * @param row - Task list row.
 * @param index - 1-based index in the rendered list.
 * @param taskUrl - Optional absolute task URL.
 * @returns Template context.
 */
export function buildTelegramBotTaskRowContext(
  row: TelegramBotTaskListRow,
  index: number,
  taskUrl?: string | null,
): TelegramBotTaskTemplateContext {
  const dueShort = formatTelegramTaskDueShort(row.dueAt);
  return {
    index,
    taskTitle: row.title,
    taskUrl: taskUrl ?? "",
    status: row.status,
    statusLabel: TASK_STATUS_LABELS[row.status] ?? row.status,
    dueAt: row.dueAt ? row.dueAt.toISOString() : "",
    dueAtShort: dueShort,
    groupTitle: row.groupTitle ?? "",
    categoryLabel: row.categoryLabel ? ` · ${row.categoryLabel}` : "",
    roleLabel: row.roleLabel ?? "",
  };
}

/**
 * Render a numbered task list using line templates.
 *
 * @param rows - Task rows to show.
 * @param lineTemplate - Per-line admin template.
 * @param baseUrl - Optional public site base for task URLs.
 * @returns Plain-text block joined by newlines.
 */
export function formatTelegramBotTaskListLines(
  rows: TelegramBotTaskListRow[],
  lineTemplate: string,
  baseUrl?: string | null,
): string {
  return rows
    .map((row, index) => {
      const taskUrl = baseUrl
        ? `${baseUrl.replace(/\/$/, "")}/tasks/${row.id}`
        : null;
      const context = buildTelegramBotTaskRowContext(row, index + 1, taskUrl);
      return interpolateTelegramBotTaskTemplate(lineTemplate, context);
    })
    .join("\n");
}

/**
 * Build a full `/tasks` message from header, lines, and footer templates.
 *
 * @param rows - Task rows to include.
 * @param templates - Header, line, and footer templates.
 * @param headerContext - Context for the header template.
 * @param baseUrl - Optional public site base for task URLs.
 * @returns Plain-text Telegram message body.
 */
export function formatTelegramBotTasksMessage(
  rows: TelegramBotTaskListRow[],
  templates: {
    headerTemplate: string;
    lineTemplate: string;
    footerTemplate: string;
    emptyTemplate: string;
  },
  headerContext: TelegramBotTaskTemplateContext,
  baseUrl?: string | null,
): string {
  const open = rows.filter((row) => isOpenTelegramGroupTaskStatus(row.status));
  if (open.length === 0) {
    return interpolateTelegramBotTaskTemplate(templates.emptyTemplate, headerContext);
  }

  const lines = formatTelegramBotTaskListLines(open, templates.lineTemplate, baseUrl);
  const header = interpolateTelegramBotTaskTemplate(templates.headerTemplate, headerContext);
  const footer = interpolateTelegramBotTaskTemplate(templates.footerTemplate, headerContext);
  return [header, "", lines, "", footer].join("\n");
}

/**
 * Resolve which task a bot command selected via numeric index or id prefix.
 *
 * @param tasks - Candidate tasks shown in the latest list.
 * @param arg - Numeric index (1-based) or task id prefix from the command.
 * @returns Matching task id or null.
 */
export function resolveTelegramBotTaskTarget(
  tasks: TelegramBotTaskListRow[],
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
 * Build picker text when a command needs a task index.
 *
 * @param pickTemplate - Admin template containing `{{taskList}}`.
 * @param tasks - Candidate tasks.
 * @param lineTemplate - Line template used inside the picker list.
 * @param baseUrl - Optional public site base for task URLs.
 * @returns Instruction message.
 */
export function formatTelegramBotTaskPickerMessage(
  pickTemplate: string,
  tasks: TelegramBotTaskListRow[],
  lineTemplate: string,
  baseUrl?: string | null,
): string {
  const open = tasks.filter((task) => isOpenTelegramGroupTaskStatus(task.status));
  const taskList = formatTelegramBotTaskListLines(open, lineTemplate, baseUrl);
  return interpolateTelegramBotTaskTemplate(pickTemplate, { taskList });
}

export { isOpenTelegramGroupTaskStatus };
