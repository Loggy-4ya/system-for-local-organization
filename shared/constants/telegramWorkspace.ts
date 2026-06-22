/**
 * @fileoverview Telegram ephemeral workspace automation for multi-part task projects.
 *
 * Bot API alone cannot create groups — auto-provision requires an operator MTProto
 * session ({@link TELEGRAM_OPERATOR_SESSION} env). Manual link and disabled modes
 * work without a sacrificed account.
 *
 * @module shared/constants/telegramWorkspace
 */

/** Singleton MongoDB document id for workspace automation settings. */
export const TELEGRAM_AUTOMATION_SETTINGS_ID = "nexus_telegram_automation";

/** Per-project strategy stored on task groups. */
export const TELEGRAM_WORKSPACE_PROJECT_STRATEGIES = [
  "inherit",
  "auto",
  "manual_link",
  "user_session",
  "disabled",
] as const;

/** Per-project strategy override. */
export type TelegramWorkspaceStrategy = (typeof TELEGRAM_WORKSPACE_PROJECT_STRATEGIES)[number];

/** Stored lifecycle states on a task group workspace subdocument. */
export const TELEGRAM_WORKSPACE_STATES = [
  "none",
  "queued",
  "provisioning",
  "awaiting_manual_link",
  "active",
  "failed",
  "dismantling",
  "closed",
] as const;

/** Workspace provisioning lifecycle. */
export type TelegramWorkspaceState = (typeof TELEGRAM_WORKSPACE_STATES)[number];

/** What to do when a project completes or is cancelled. */
export const TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS = ["leave", "archive_notice", "none"] as const;

/** Post-completion group handling — full delete requires operator session (future). */
export type TelegramWorkspaceDismantleAction =
  (typeof TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS)[number];

/** Human-readable strategy labels for admin UI. */
export const TELEGRAM_WORKSPACE_STRATEGY_LABELS: Record<
  TelegramWorkspaceStrategy,
  string
> = {
  inherit: "Use institution default",
  auto: "Automatic (best available)",
  manual_link: "Manual link — bot /link in existing group",
  user_session: "Operator session — auto-create group",
  disabled: "Disabled",
};

/** Human-readable workspace state labels. */
export const TELEGRAM_WORKSPACE_STATE_LABELS: Record<TelegramWorkspaceState, string> = {
  none: "Not configured",
  queued: "Queued",
  provisioning: "Provisioning…",
  awaiting_manual_link: "Awaiting manual link",
  active: "Linked",
  failed: "Failed",
  dismantling: "Closing…",
  closed: "Closed",
};

/** Default automation settings seeded on first load. */
export const DEFAULT_TELEGRAM_AUTOMATION_SETTINGS = {
  enabled: true,
  defaultStrategy: "auto" as const,
  autoProvisionOnActivate: true,
  minPerformersForAutoGroup: 2,
  /** When true, each dispatched child task gets a forum topic in the project Telegram group. */
  createForumTopicPerTask: true,
  /** Posted inside a new task forum topic after creation. */
  taskForumTopicWelcomeTemplate:
    "Task part: {{taskTitle}}\n\nTrack progress in Nexus: {{taskUrl}}",
  dismantleOnComplete: true,
  dismantleAction: "archive_notice" as TelegramWorkspaceDismantleAction,
  groupTitleTemplate: "{{title}} — Nexus",
  groupWelcomeTemplate:
    "Project workspace for **{{title}}**.\n\nUse /status for open parts · /link to bind this chat to Nexus.",
  dismantleNoticeTemplate:
    "This Nexus project is complete. This group will remain read-only — thank you!",
  linkCommandHelpTemplate:
    "To link this chat to Nexus project «{{title}}», an editor runs:\n/link {{linkToken}}",
};

/** Placeholders supported in workspace message templates. */
export const TELEGRAM_WORKSPACE_TEMPLATE_PLACEHOLDERS = [
  "{{title}}",
  "{{linkToken}}",
  "{{groupId}}",
  "{{projectUrl}}",
  "{{taskTitle}}",
  "{{taskUrl}}",
] as const;

/** Length of the bot /link token suffix. */
export const TELEGRAM_WORKSPACE_LINK_TOKEN_LENGTH = 12;

/** Operator maintenance jobs polled by `telegram-worker` (Bot API cannot run these). */
export const TELEGRAM_OPERATOR_PENDING_ACTIONS = [
  /** Enable forum topics on a linked supergroup (`channels.ToggleForum`). */
  "enable_forum",
  /** Invite roster/task performers who joined Nexus after group creation. */
  "sync_members",
  /** Operator leaves or deletes the supergroup after project completion. */
  "dismantle",
] as const;

/** Pending MTProto maintenance action on a project workspace. */
export type TelegramOperatorPendingAction =
  (typeof TELEGRAM_OPERATOR_PENDING_ACTIONS)[number];

/** Human-readable operator job labels for admin/detail UIs. */
export const TELEGRAM_OPERATOR_PENDING_ACTION_LABELS: Record<
  TelegramOperatorPendingAction,
  string
> = {
  enable_forum: "Enable forum topics",
  sync_members: "Sync project members",
  dismantle: "Close Telegram group",
};
