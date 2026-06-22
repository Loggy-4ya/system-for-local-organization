/**
 * @fileoverview Pure helpers for Telegram project workspace strategy resolution and templates.
 *
 * @module shared/lib/telegramWorkspaceLogic
 *
 * Tests: `npm run test:telegram-workspace-logic`
 * Registry: `.ai/docs/testing.md`
 */

import {
  DEFAULT_TELEGRAM_AUTOMATION_SETTINGS,
  TELEGRAM_WORKSPACE_LINK_TOKEN_LENGTH,
  type TelegramWorkspaceDismantleAction,
  type TelegramWorkspaceState,
  type TelegramWorkspaceStrategy,
} from "@shared/constants/telegramWorkspace";
import type { ITaskGroupTelegramWorkspace } from "@shared/models/TaskGroup";
import type { ITelegramAutomationSettings } from "@shared/models/TelegramAutomationSettings";
import {
  isTelegramOperatorEnvConfigured,
} from "@shared/lib/telegramOperatorEnv";
import type { TelegramOperatorPendingAction } from "@shared/constants/telegramWorkspace";

/** Resolved provisioning mode after applying inherit/auto fallbacks. */
export type TelegramWorkspaceResolvedStrategy =
  | "manual_link"
  | "user_session"
  | "disabled";

/** Context for template interpolation. */
export interface TelegramWorkspaceTemplateContext {
  /** Project title. */
  title: string;
  /** MongoDB group id. */
  groupId: string;
  /** Bot /link token when generated. */
  linkToken?: string | null;
  /** Public web URL to project detail. */
  projectUrl?: string | null;
  /** Child task title for forum topic welcome templates. */
  taskTitle?: string | null;
  /** Public web URL to a task detail page. */
  taskUrl?: string | null;
}

/**
 * Whether an operator MTProto session string is present (admin UI hint).
 *
 * @returns True when {@link TELEGRAM_OPERATOR_SESSION} is non-empty.
 */
export function isTelegramOperatorSessionConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_OPERATOR_SESSION?.trim());
}

/**
 * Whether automatic group creation can run right now (full worker env).
 *
 * @returns True when operator session, API credentials, and bot token are set.
 */
export function canAutoCreateTelegramGroups(): boolean {
  return isTelegramOperatorEnvConfigured();
}

/**
 * Resolve the effective workspace strategy for a project.
 *
 * @param projectStrategy - Per-project override.
 * @param settings - Global automation settings.
 * @returns Concrete strategy used for provisioning.
 */
export function resolveTelegramWorkspaceStrategy(
  projectStrategy: TelegramWorkspaceStrategy,
  settings: Pick<ITelegramAutomationSettings, "defaultStrategy" | "enabled">,
): TelegramWorkspaceResolvedStrategy {
  if (!settings.enabled) return "disabled";

  let strategy: TelegramWorkspaceStrategy | ITelegramAutomationSettings["defaultStrategy"] =
    projectStrategy;

  if (strategy === "inherit") {
    strategy = settings.defaultStrategy;
  }

  if (strategy === "auto") {
    return canAutoCreateTelegramGroups() ? "user_session" : "manual_link";
  }

  if (strategy === "disabled") return "disabled";
  if (strategy === "user_session") {
    return canAutoCreateTelegramGroups() ? "user_session" : "manual_link";
  }

  return "manual_link";
}

/**
 * Whether workspace automation should run for a project status.
 *
 * @param status - Task group lifecycle status.
 * @returns True for active projects.
 */
export function shouldManageTelegramWorkspaceForGroupStatus(status: string): boolean {
  return status === "active";
}

/**
 * Whether performer count meets the auto-group threshold.
 *
 * @param performerCount - Distinct performers across child tasks.
 * @param minPerformers - Institutional minimum from settings.
 * @returns True when auto provisioning is allowed by size.
 */
export function meetsTelegramWorkspacePerformerThreshold(
  performerCount: number,
  minPerformers: number,
): boolean {
  return performerCount >= minPerformers;
}

/**
 * Interpolate `{{placeholder}}` tokens in workspace templates.
 *
 * @param template - Raw template string.
 * @param context - Replacement values.
 * @returns Interpolated plain text.
 */
export function interpolateTelegramWorkspaceTemplate(
  template: string,
  context: TelegramWorkspaceTemplateContext,
): string {
  return template
    .replaceAll("{{title}}", context.title)
    .replaceAll("{{groupId}}", context.groupId)
    .replaceAll("{{linkToken}}", context.linkToken ?? "")
    .replaceAll("{{projectUrl}}", context.projectUrl ?? "")
    .replaceAll("{{taskTitle}}", context.taskTitle ?? "")
    .replaceAll("{{taskUrl}}", context.taskUrl ?? "");
}

/**
 * Build the Telegram group title from settings.
 *
 * @param settings - Automation settings document.
 * @param title - Project title.
 * @returns Group title (max 128 chars for Telegram).
 */
export function buildTelegramGroupTitle(
  settings: Pick<ITelegramAutomationSettings, "groupTitleTemplate">,
  title: string,
): string {
  const raw = interpolateTelegramWorkspaceTemplate(settings.groupTitleTemplate, {
    title,
    groupId: "",
  });
  return raw.trim().slice(0, 128) || title.slice(0, 128);
}

/**
 * Generate a random link token for the bot `/link` command.
 *
 * @returns Lowercase alphanumeric token.
 */
export function generateTelegramWorkspaceLinkToken(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < TELEGRAM_WORKSPACE_LINK_TOKEN_LENGTH; i++) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

/**
 * Normalize a workspace subdocument for API responses.
 *
 * @param raw - Stored workspace fields.
 * @returns Canonical workspace object.
 */
export function normalizeTaskGroupTelegramWorkspace(
  raw: Partial<ITaskGroupTelegramWorkspace> | null | undefined,
): ITaskGroupTelegramWorkspace {
  return {
    strategy: (raw?.strategy ?? "inherit") as TelegramWorkspaceStrategy,
    state: (raw?.state ?? "none") as TelegramWorkspaceState,
    chatId: raw?.chatId ?? null,
    chatTitle: raw?.chatTitle ?? null,
    inviteLink: raw?.inviteLink ?? null,
    linkToken: raw?.linkToken ?? null,
    linkedAt: raw?.linkedAt ?? null,
    linkedByUserId: raw?.linkedByUserId ?? null,
    lastError: raw?.lastError ?? null,
    lastSyncAt: raw?.lastSyncAt ?? null,
    forumEnabled: Boolean(raw?.forumEnabled),
    operatorPendingAction: (raw?.operatorPendingAction ?? null) as TelegramOperatorPendingAction | null,
  };
}

/**
 * Whether MTProto operator maintenance jobs can run in the current process env.
 *
 * @returns True when telegram-worker credentials are complete.
 */
export function canRunTelegramOperatorMaintenance(): boolean {
  return isTelegramOperatorEnvConfigured();
}

/**
 * Default automation settings shape for DTOs.
 *
 * @returns Default settings fields.
 */
export function buildDefaultTelegramAutomationPublicConfig() {
  return {
    _id: "nexus_telegram_automation" as const,
    enabled: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.enabled,
    defaultStrategy: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.defaultStrategy,
    autoProvisionOnActivate: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.autoProvisionOnActivate,
    minPerformersForAutoGroup: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.minPerformersForAutoGroup,
    createForumTopicPerTask: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.createForumTopicPerTask,
    taskForumTopicWelcomeTemplate:
      DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskForumTopicWelcomeTemplate,
    dismantleOnComplete: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.dismantleOnComplete,
    dismantleAction: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.dismantleAction,
    groupTitleTemplate: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.groupTitleTemplate,
    groupWelcomeTemplate: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.groupWelcomeTemplate,
    dismantleNoticeTemplate: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.dismantleNoticeTemplate,
    linkCommandHelpTemplate: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.linkCommandHelpTemplate,
    operatorSessionConfigured: isTelegramOperatorSessionConfigured(),
  };
}

/**
 * Pick dismantle action when global settings allow override.
 *
 * @param action - Configured dismantle action.
 * @returns Whether a notice should be posted on dismantle.
 */
export function shouldPostTelegramDismantleNotice(
  action: TelegramWorkspaceDismantleAction,
): boolean {
  return action === "archive_notice";
}

/**
 * Whether a linked workspace should receive dismantle processing.
 *
 * @param workspace - Project workspace state.
 * @returns True when chat id exists and state is active or failed link recovery.
 */
export function canDismantleTelegramWorkspace(workspace: ITaskGroupTelegramWorkspace): boolean {
  return workspace.chatId != null && workspace.state === "active";
}
