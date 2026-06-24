/**
 * @fileoverview Pure helpers for the `/task_report` wizard step machine.
 *
 * @module shared/lib/telegramReportFlowLogic
 *
 * Tests: `npm run test:telegram-report-flow-logic`
 * Registry: `.ai/docs/testing.md`
 */

import type { TelegramReportFlowStep } from "@shared/constants/telegramWorkspace";
import { TELEGRAM_REPORT_FLOW_STEPS } from "@shared/constants/telegramWorkspace";

/** Default wizard lifetime in milliseconds. */
export const TELEGRAM_BOT_SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Normalise admin-configured report flow steps.
 *
 * @param raw - Stored step array from automation settings.
 * @returns Valid unique ordered steps.
 */
export function normalizeTelegramReportFlowSteps(
  raw: readonly string[] | undefined,
): TelegramReportFlowStep[] {
  const allowed = new Set<string>(TELEGRAM_REPORT_FLOW_STEPS);
  const steps: TelegramReportFlowStep[] = [];

  for (const entry of raw ?? []) {
    if (!allowed.has(entry)) continue;
    if (steps.includes(entry as TelegramReportFlowStep)) continue;
    steps.push(entry as TelegramReportFlowStep);
  }

  if (steps.length === 0) {
    return ["description"];
  }

  return steps;
}

/**
 * Resolve effective wizard steps for a task (media omitted when disallowed).
 *
 * @param configuredSteps - Institution step order from settings.
 * @param reportMediaAllowed - Task-level proof media flag.
 * @returns Steps the performer must complete.
 */
export function resolveEffectiveTelegramReportFlowSteps(
  configuredSteps: readonly TelegramReportFlowStep[],
  reportMediaAllowed: boolean,
): TelegramReportFlowStep[] {
  const filtered = reportMediaAllowed
    ? [...configuredSteps]
    : configuredSteps.filter((step) => step !== "media");

  return filtered.length > 0 ? filtered : ["description"];
}

/**
 * Current wizard step type for a session index.
 *
 * @param steps - Effective step list.
 * @param stepIndex - Zero-based active index.
 * @returns Step kind or null when finished.
 */
export function getTelegramReportFlowStepAt(
  steps: readonly TelegramReportFlowStep[],
  stepIndex: number,
): TelegramReportFlowStep | null {
  return steps[stepIndex] ?? null;
}

/**
 * Whether the wizard has collected all required fields.
 *
 * @param steps - Effective step list.
 * @param stepIndex - Index after the last completed step.
 * @param draft - Collected draft fields.
 * @returns True when ready to persist via {@link TaskDomain.submitReport}.
 */
export function isTelegramReportDraftComplete(
  steps: readonly TelegramReportFlowStep[],
  stepIndex: number,
  draft: { description?: string },
): boolean {
  if (stepIndex < steps.length) return false;
  if (steps.includes("description") && !draft.description?.trim()) return false;
  return true;
}

/**
 * Wrap plain Telegram text as a minimal HTML report description.
 *
 * @param text - Performer plain-text reply.
 * @returns Sanitised single-paragraph HTML.
 */
export function plainTelegramTextToReportDescription(text: string): string {
  const trimmed = text.trim();
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
}

/**
 * Strip HTML tags for Telegram plain-text report previews.
 *
 * @param html - Stored report description HTML.
 * @returns Plain text suitable for Bot API messages.
 */
export function stripHtmlForTelegramPreview(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Compute session expiry instant from now.
 *
 * @param now - Reference time.
 * @returns Expiry date stored on the session document.
 */
export function buildTelegramBotSessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + TELEGRAM_BOT_SESSION_TTL_MS);
}
