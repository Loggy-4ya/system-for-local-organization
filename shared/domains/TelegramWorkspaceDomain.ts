/**
 * @fileoverview Telegram ephemeral workspace automation for task group projects.
 *
 * Provisioning modes:
 * - **manual_link** — bot `/link <token>` binds an existing group (works today).
 * - **user_session** — MTProto operator creates group (requires `TELEGRAM_OPERATOR_SESSION` + future worker).
 *
 * All policy knobs live in {@link TelegramAutomationSettings} — editable without redeploy.
 *
 * @module shared/domains/TelegramWorkspaceDomain
 *
 * Tests: `npm run test:telegram-workspace-logic`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import { SCHEDULED_EVENT_TYPES } from "@shared/constants/scheduledEventTypes";
import {
  TELEGRAM_AUTOMATION_SETTINGS_ID,
  type TelegramOperatorPendingAction,
  type TelegramWorkspaceStrategy,
} from "@shared/constants/telegramWorkspace";
import {
  buildDefaultTelegramAutomationPublicConfig,
  canAutoCreateTelegramGroups,
  canDismantleTelegramWorkspace,
  canRunTelegramOperatorMaintenance,
  generateTelegramWorkspaceLinkToken,
  interpolateTelegramWorkspaceTemplate,
  isTelegramOperatorSessionConfigured,
  meetsTelegramWorkspacePerformerThreshold,
  normalizeTaskGroupTelegramWorkspace,
  resolveTelegramWorkspaceStrategy,
  shouldManageTelegramWorkspaceForGroupStatus,
  shouldPostTelegramDismantleNotice,
} from "@shared/lib/telegramWorkspaceLogic";
import { formatTaskForumTopicTitle } from "@shared/lib/taskGroupRosterLogic";
import Task from "@shared/models/Task";
import TaskGroup, { type ITaskGroup, type ITaskGroupTelegramWorkspace } from "@shared/models/TaskGroup";
import TelegramAutomationSettings, {
  type ITelegramAutomationSettings,
} from "@shared/models/TelegramAutomationSettings";
import User, { type IUser } from "@shared/models/User";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { TelegramBotDomain } from "@shared/domains/TelegramBotDomain";
import { canEditTaskGroup, type TaskGroupAccessSlice } from "@shared/lib/taskGroupAccessLogic";
import type { TaskActorSlice } from "@shared/lib/taskAccessLogic";
import { Types } from "mongoose";

/** Public automation config for admin UI. */
export type TelegramAutomationPublicConfig = ReturnType<
  typeof buildDefaultTelegramAutomationPublicConfig
> & {
  operatorSessionConfigured: boolean;
  /** True when telegram-worker has full MTProto + bot env. */
  workerEnvReady: boolean;
};

/** Workspace slice on task group detail DTOs. */
export interface TaskGroupTelegramWorkspaceDto {
  strategy: TelegramWorkspaceStrategy;
  resolvedStrategy: ReturnType<typeof resolveTelegramWorkspaceStrategy>;
  state: ITaskGroupTelegramWorkspace["state"];
  chatId: number | null;
  chatTitle: string | null;
  inviteLink: string | null;
  linkToken: string | null;
  linkedAt: Date | null;
  lastError: string | null;
  lastSyncAt: Date | null;
  forumEnabled: boolean;
  operatorPendingAction: TelegramOperatorPendingAction | null;
  linkInstructions: string | null;
}

/**
 * Map singleton document to public admin config.
 *
 * @param doc - Settings document.
 * @returns Serializable config.
 */
function toPublicAutomationConfig(
  doc: ITelegramAutomationSettings,
): TelegramAutomationPublicConfig {
  return {
    _id: doc._id,
    enabled: doc.enabled,
    defaultStrategy: doc.defaultStrategy,
    autoProvisionOnActivate: doc.autoProvisionOnActivate,
    minPerformersForAutoGroup: doc.minPerformersForAutoGroup,
    createForumTopicPerTask: doc.createForumTopicPerTask,
    taskForumTopicWelcomeTemplate: doc.taskForumTopicWelcomeTemplate,
    dismantleOnComplete: doc.dismantleOnComplete,
    dismantleAction: doc.dismantleAction,
    groupTitleTemplate: doc.groupTitleTemplate,
    groupWelcomeTemplate: doc.groupWelcomeTemplate,
    dismantleNoticeTemplate: doc.dismantleNoticeTemplate,
    linkCommandHelpTemplate: doc.linkCommandHelpTemplate,
    reportFlowSteps: [...doc.reportFlowSteps],
    botCompletedCommandEnabled: doc.botCompletedCommandEnabled,
    tasksHeaderTemplate: doc.tasksHeaderTemplate,
    tasksLineTemplate: doc.tasksLineTemplate,
    tasksFooterTemplate: doc.tasksFooterTemplate,
    tasksEmptyTemplate: doc.tasksEmptyTemplate,
    tasksDmHeaderTemplate: doc.tasksDmHeaderTemplate,
    tasksDmLineTemplate: doc.tasksDmLineTemplate,
    tasksDmFooterTemplate: doc.tasksDmFooterTemplate,
    tasksDmEmptyTemplate: doc.tasksDmEmptyTemplate,
    tasksUnlinkedGroupTemplate: doc.tasksUnlinkedGroupTemplate,
    taskReportPickTemplate: doc.taskReportPickTemplate,
    taskReportDescriptionPromptTemplate: doc.taskReportDescriptionPromptTemplate,
    taskReportMediaPromptTemplate: doc.taskReportMediaPromptTemplate,
    taskReportSuccessTemplate: doc.taskReportSuccessTemplate,
    taskReportCancelledTemplate: doc.taskReportCancelledTemplate,
    taskReportSessionInterruptedTemplate: doc.taskReportSessionInterruptedTemplate,
    taskCompletedSuccessTemplate: doc.taskCompletedSuccessTemplate,
    taskCompletedForbiddenTemplate: doc.taskCompletedForbiddenTemplate,
    seeReportHeaderTemplate: doc.seeReportHeaderTemplate,
    seeReportBodyTemplate: doc.seeReportBodyTemplate,
    seeReportEmptyTemplate: doc.seeReportEmptyTemplate,
    operatorSessionConfigured: isTelegramOperatorSessionConfigured(),
    workerEnvReady: canAutoCreateTelegramGroups(),
  } as TelegramAutomationPublicConfig;
}

/**
 * Build workspace DTO for API responses.
 *
 * @param doc - Task group document.
 * @param settings - Automation settings.
 * @param baseUrl - Optional public site base for template URLs.
 * @returns Workspace DTO.
 */
export function toTaskGroupTelegramWorkspaceDto(
  doc: ITaskGroup,
  settings: ITelegramAutomationSettings,
  baseUrl?: string,
): TaskGroupTelegramWorkspaceDto {
  const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
  const resolvedStrategy = resolveTelegramWorkspaceStrategy(workspace.strategy, settings);
  const groupId = String(doc._id);
  const projectUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/task-groups/${groupId}` : null;

  const linkInstructions =
    resolvedStrategy !== "disabled" && workspace.linkToken
      ? interpolateTelegramWorkspaceTemplate(settings.linkCommandHelpTemplate, {
          title: doc.title,
          groupId,
          linkToken: workspace.linkToken,
          projectUrl,
        })
      : null;

  return {
    strategy: workspace.strategy,
    resolvedStrategy,
    state: workspace.state,
    chatId: workspace.chatId,
    chatTitle: workspace.chatTitle,
    inviteLink: workspace.inviteLink,
    linkToken: workspace.linkToken,
    linkedAt: workspace.linkedAt,
    lastError: workspace.lastError,
    lastSyncAt: workspace.lastSyncAt,
    forumEnabled: workspace.forumEnabled,
    operatorPendingAction: workspace.operatorPendingAction,
    linkInstructions,
  };
}

/**
 * Telegram workspace automation domain.
 */
export const TelegramWorkspaceDomain = {
  /**
   * Load or seed automation settings singleton.
   *
   * @returns Settings document.
   */
  async loadOrSeedSettings(): Promise<ITelegramAutomationSettings> {
    await connectDB();
    let doc = await TelegramAutomationSettings.findById(TELEGRAM_AUTOMATION_SETTINGS_ID);
    if (!doc) {
      doc = await TelegramAutomationSettings.create({
        _id: TELEGRAM_AUTOMATION_SETTINGS_ID,
      });
    }
    return doc;
  },

  /**
   * Read public automation config for admin UI.
   *
   * @returns Serializable settings.
   */
  async getPublicConfig(): Promise<TelegramAutomationPublicConfig> {
    const doc = await TelegramWorkspaceDomain.loadOrSeedSettings();
    return toPublicAutomationConfig(doc);
  },

  /**
   * Replace automation settings from admin editor.
   *
   * @param input - Partial settings patch.
   * @returns Updated public config.
   */
  async updateSettings(
    input: Partial<
      Pick<
        ITelegramAutomationSettings,
        | "enabled"
        | "defaultStrategy"
        | "autoProvisionOnActivate"
        | "minPerformersForAutoGroup"
        | "createForumTopicPerTask"
        | "taskForumTopicWelcomeTemplate"
        | "dismantleOnComplete"
        | "dismantleAction"
        | "groupTitleTemplate"
        | "groupWelcomeTemplate"
        | "dismantleNoticeTemplate"
        | "linkCommandHelpTemplate"
        | "reportFlowSteps"
        | "botCompletedCommandEnabled"
        | "tasksHeaderTemplate"
        | "tasksLineTemplate"
        | "tasksFooterTemplate"
        | "tasksEmptyTemplate"
        | "tasksDmHeaderTemplate"
        | "tasksDmLineTemplate"
        | "tasksDmFooterTemplate"
        | "tasksDmEmptyTemplate"
        | "tasksUnlinkedGroupTemplate"
        | "taskReportPickTemplate"
        | "taskReportDescriptionPromptTemplate"
        | "taskReportMediaPromptTemplate"
        | "taskReportSuccessTemplate"
        | "taskReportCancelledTemplate"
        | "taskReportSessionInterruptedTemplate"
        | "taskCompletedSuccessTemplate"
        | "taskCompletedForbiddenTemplate"
        | "seeReportHeaderTemplate"
        | "seeReportBodyTemplate"
        | "seeReportEmptyTemplate"
      >
    >,
  ): Promise<TelegramAutomationPublicConfig> {
    const doc = await TelegramWorkspaceDomain.loadOrSeedSettings();
    Object.assign(doc, input);
    await doc.save();
    return toPublicAutomationConfig(doc);
  },

  /**
   * Queue or refresh workspace provisioning when a project becomes active.
   *
   * @param groupId - MongoDB task group id.
   * @param performerCount - Distinct performers across child tasks.
   */
  async syncWorkspaceForGroup(groupId: string, performerCount = 0): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    if (!settings.enabled || !settings.autoProvisionOnActivate) return;
    if (!shouldManageTelegramWorkspaceForGroupStatus(doc.status)) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    if (workspace.state === "active" || workspace.state === "dismantling") return;

    const resolved = resolveTelegramWorkspaceStrategy(workspace.strategy, settings);
    if (resolved === "disabled") {
      doc.telegramWorkspace = { ...workspace, state: "none", lastSyncAt: new Date() };
      await doc.save();
      return;
    }

    if (
      !meetsTelegramWorkspacePerformerThreshold(
        performerCount,
        settings.minPerformersForAutoGroup,
      )
    ) {
      return;
    }

    if (!workspace.linkToken) {
      workspace.linkToken = generateTelegramWorkspaceLinkToken();
    }

    workspace.state = "queued";
    workspace.lastError = null;
    workspace.lastSyncAt = new Date();
    doc.telegramWorkspace = workspace;
    await doc.save();

    await SchedulerDomain.scheduleEvent({
      eventType: SCHEDULED_EVENT_TYPES.telegram_workspace_provision,
      dueAt: new Date(),
      idempotencyKey: `telegram_workspace_provision:${groupId}`,
      payload: { groupId },
    });
  },

  /**
   * Queue workspace dismantle when a project completes or is cancelled.
   *
   * @param groupId - MongoDB task group id.
   */
  async queueDismantleForGroup(groupId: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    if (!settings.enabled || !settings.dismantleOnComplete) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    if (!canDismantleTelegramWorkspace(workspace)) return;

    workspace.state = "dismantling";
    workspace.lastSyncAt = new Date();
    doc.telegramWorkspace = workspace;
    await doc.save();

    await SchedulerDomain.scheduleEvent({
      eventType: SCHEDULED_EVENT_TYPES.telegram_workspace_dismantle,
      dueAt: new Date(),
      idempotencyKey: `telegram_workspace_dismantle:${groupId}`,
      payload: { groupId },
    });
  },

  /**
   * Execute provisioning job — user session stub or manual link handoff.
   *
   * @param groupId - MongoDB task group id.
   */
  async executeProvisionJob(groupId: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    const resolved = resolveTelegramWorkspaceStrategy(workspace.strategy, settings);

    if (resolved === "disabled") {
      workspace.state = "none";
      doc.telegramWorkspace = { ...workspace, lastSyncAt: new Date() };
      await doc.save();
      return;
    }

    workspace.state = "provisioning";
    workspace.lastSyncAt = new Date();
    if (!workspace.linkToken) {
      workspace.linkToken = generateTelegramWorkspaceLinkToken();
    }
    doc.telegramWorkspace = workspace;
    await doc.save();

    if (resolved === "user_session") {
      if (!canAutoCreateTelegramGroups()) {
        workspace.state = "awaiting_manual_link";
        workspace.lastError =
          "Operator session not configured — link manually with /link or start telegram-worker.";
        doc.telegramWorkspace = { ...workspace, lastSyncAt: new Date() };
        await doc.save();
        await TelegramWorkspaceDomain.notifyProjectAuthorForManualLink(doc, settings);
        return;
      }

      workspace.state = "provisioning";
      workspace.lastError = null;
      doc.telegramWorkspace = { ...workspace, lastSyncAt: new Date() };
      await doc.save();
      return;
    }

    workspace.state = "awaiting_manual_link";
    workspace.lastError = null;
    doc.telegramWorkspace = { ...workspace, lastSyncAt: new Date() };
    await doc.save();
    await TelegramWorkspaceDomain.notifyProjectAuthorForManualLink(doc, settings);
  },

  /**
   * Execute dismantle job — post notice and mark workspace closed.
   *
   * @param groupId - MongoDB task group id.
   */
  async executeDismantleJob(groupId: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

    if (botToken && workspace.chatId && shouldPostTelegramDismantleNotice(settings.dismantleAction)) {
      const text = interpolateTelegramWorkspaceTemplate(settings.dismantleNoticeTemplate, {
        title: doc.title,
        groupId,
      });
      await TelegramBotDomain.sendGroupMessage(botToken, workspace.chatId, text);
    }

    if (botToken && workspace.chatId && settings.dismantleAction === "leave") {
      await TelegramBotDomain.leaveChat(botToken, workspace.chatId).catch(() => undefined);
    }

    if (canRunTelegramOperatorMaintenance() && workspace.chatId != null) {
      workspace.operatorPendingAction = "dismantle";
      workspace.lastSyncAt = new Date();
      doc.telegramWorkspace = workspace;
      await doc.save();
      return;
    }

    workspace.state = "closed";
    workspace.lastSyncAt = new Date();
    doc.telegramWorkspace = workspace;
    await doc.save();
  },

  /**
   * Bind a Telegram chat to a project via bot `/link` command.
   *
   * @param linkToken - Short token from project workspace.
   * @param chatId - Telegram group chat id.
   * @param chatTitle - Cached chat title.
   * @param linkerTelegramId - Telegram user id running the command.
   * @param inviteLink - Optional invite link from getChat.
   * @returns Linked group id.
   */
  async linkChatByToken(
    linkToken: string,
    chatId: number,
    chatTitle: string,
    linkerTelegramId: number,
    inviteLink?: string | null,
  ): Promise<string> {
    await connectDB();
    const doc = await TaskGroup.findOne({ "telegramWorkspace.linkToken": linkToken.trim() });
    if (!doc) throw new Error("LINK_TOKEN_NOT_FOUND");

    const linker = await User.findOne({ telegramId: linkerTelegramId });
    if (!linker) throw new Error("LINKER_NOT_REGISTERED");

    const performerIds = (doc.performerUserIds ?? []).map(String);
    const slice: TaskGroupAccessSlice = {
      authorUserId: String(doc.authorUserId),
      status: doc.status,
      performerUserIds: performerIds,
    };
    const actor: TaskActorSlice = {
      userId: String(linker._id),
      role: linker.role,
      accessLevelIndex: linker.accessLevelIndex ?? 6,
      delegatedPermissions: linker.delegatedPermissions ?? [],
      sociumRoles: linker.sociumRoles ?? [],
      studentTitle: linker.studentTitle ?? null,
      permissions: [],
    };

    if (!canEditTaskGroup(actor, slice)) {
      throw new Error("FORBIDDEN");
    }

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    workspace.state = "active";
    workspace.chatId = chatId;
    workspace.chatTitle = chatTitle;
    workspace.inviteLink = inviteLink ?? workspace.inviteLink;
    workspace.linkedAt = new Date();
    workspace.linkedByUserId = linker._id as Types.ObjectId;
    workspace.lastError = null;
    workspace.lastSyncAt = new Date();
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (botToken) {
      try {
        const chatMeta = await TelegramBotDomain.getChat(botToken, chatId);
        workspace.forumEnabled = Boolean(chatMeta.is_forum);
        workspace.inviteLink = inviteLink ?? chatMeta.invite_link ?? workspace.inviteLink;
      } catch {
        workspace.forumEnabled = false;
      }
    }
    doc.telegramWorkspace = workspace;
    await doc.save();

    if (
      !workspace.forumEnabled &&
      settings.createForumTopicPerTask &&
      canRunTelegramOperatorMaintenance()
    ) {
      await TelegramWorkspaceDomain.queueOperatorAction(String(doc._id), "enable_forum");
    } else if (
      canRunTelegramOperatorMaintenance() &&
      workspace.state === "active"
    ) {
      await TelegramWorkspaceDomain.queueOperatorAction(String(doc._id), "sync_members");
    }

    if (botToken) {
      const welcome = interpolateTelegramWorkspaceTemplate(settings.groupWelcomeTemplate, {
        title: doc.title,
        groupId: String(doc._id),
        linkToken: workspace.linkToken,
      });
      await TelegramBotDomain.sendGroupMessage(botToken, chatId, welcome);
    }

    return String(doc._id);
  },

  /**
   * Patch per-project workspace strategy and optionally re-queue provisioning.
   *
   * @param actor - Authenticated actor.
   * @param groupId - MongoDB group id.
   * @param input - Strategy patch.
   * @param accessSlice - Group access slice.
   * @param performerCount - Performer count for threshold checks.
   */
  async updateProjectWorkspace(
    actor: TaskActorSlice,
    groupId: string,
    input: { strategy?: TelegramWorkspaceStrategy; requeue?: boolean },
    accessSlice: TaskGroupAccessSlice,
    performerCount: number,
  ): Promise<ITaskGroupTelegramWorkspace> {
    if (!canEditTaskGroup(actor, accessSlice)) throw new Error("FORBIDDEN");

    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) throw new Error("GROUP_NOT_FOUND");

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    if (input.strategy != null) {
      workspace.strategy = input.strategy;
    }
    doc.telegramWorkspace = workspace;
    await doc.save();

    if (input.requeue) {
      await TelegramWorkspaceDomain.syncWorkspaceForGroup(groupId, performerCount);
    }

    const refreshed = await TaskGroup.findById(groupId);
    return normalizeTaskGroupTelegramWorkspace(refreshed?.telegramWorkspace);
  },

  /**
   * DM project author with manual link instructions.
   *
   * @param doc - Task group document.
   * @param settings - Automation settings.
   */
  async notifyProjectAuthorForManualLink(
    doc: ITaskGroup,
    settings: ITelegramAutomationSettings,
  ): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!botToken) return;

    const author = await User.findById(doc.authorUserId);
    if (!author?.telegramId) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    const text = interpolateTelegramWorkspaceTemplate(settings.linkCommandHelpTemplate, {
      title: doc.title,
      groupId: String(doc._id),
      linkToken: workspace.linkToken,
    });

    await TelegramBotDomain.sendDirectMessage(botToken, author.telegramId, text);
  },

  /**
   * Mark operator provisioning failure and fall back to manual link instructions.
   *
   * @param groupId - MongoDB group id.
   * @param error - Failure reason.
   */
  async markOperatorProvisionFailed(groupId: string, error: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    workspace.state = "awaiting_manual_link";
    workspace.lastError = error;
    workspace.lastSyncAt = new Date();
    doc.telegramWorkspace = workspace;
    await doc.save();
    await TelegramWorkspaceDomain.notifyProjectAuthorForManualLink(doc, settings);
  },

  /**
   * Finalize MTProto-created group binding after telegram-worker succeeds.
   *
   * @param groupId - MongoDB group id.
   * @param result - Telegram chat metadata from operator session.
   */
  async completeOperatorProvision(
    groupId: string,
    result: {
      chatId: number;
      chatTitle: string;
      inviteLink: string | null;
      forumEnabled?: boolean;
    },
  ): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    workspace.state = "active";
    workspace.chatId = result.chatId;
    workspace.chatTitle = result.chatTitle;
    workspace.inviteLink = result.inviteLink;
    workspace.linkedAt = new Date();
    workspace.lastError = null;
    workspace.lastSyncAt = new Date();
    workspace.forumEnabled = result.forumEnabled ?? true;
    workspace.operatorPendingAction = null;
    doc.telegramWorkspace = workspace;
    await doc.save();

    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (botToken) {
      const welcome = interpolateTelegramWorkspaceTemplate(settings.groupWelcomeTemplate, {
        title: doc.title,
        groupId,
        linkToken: workspace.linkToken,
      });
      await TelegramBotDomain.sendGroupMessage(botToken, result.chatId, welcome);
    }

    if (workspace.forumEnabled && settings.createForumTopicPerTask) {
      await TelegramWorkspaceDomain.syncPendingTaskForumTopicsForGroup(groupId);
    }
  },

  /**
   * Queue an MTProto maintenance job for telegram-worker.
   *
   * @param groupId - MongoDB task group id.
   * @param action - Maintenance action to run.
   */
  async queueOperatorAction(
    groupId: string,
    action: TelegramOperatorPendingAction,
  ): Promise<void> {
    if (!canRunTelegramOperatorMaintenance()) return;

    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    if (workspace.chatId == null && action !== "dismantle") return;
    if (workspace.operatorPendingAction === action) return;

    workspace.operatorPendingAction = action;
    workspace.lastError = null;
    workspace.lastSyncAt = new Date();
    doc.telegramWorkspace = workspace;
    await doc.save();
  },

  /**
   * Record operator maintenance success and optionally close the workspace.
   *
   * @param groupId - MongoDB task group id.
   * @param result - Post-action workspace fields.
   */
  async completeOperatorMaintenance(
    groupId: string,
    result: {
      forumEnabled?: boolean;
      clearAction?: boolean;
      closeWorkspace?: boolean;
    },
  ): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    if (result.forumEnabled != null) {
      workspace.forumEnabled = result.forumEnabled;
    }
    if (result.clearAction) {
      workspace.operatorPendingAction = null;
    }
    if (result.closeWorkspace) {
      workspace.state = "closed";
    }
    workspace.lastError = null;
    workspace.lastSyncAt = new Date();
    doc.telegramWorkspace = workspace;
    await doc.save();
  },

  /**
   * Record operator maintenance failure without clearing the queued action.
   *
   * @param groupId - MongoDB task group id.
   * @param error - Failure reason for project detail UI.
   */
  async markOperatorMaintenanceFailed(groupId: string, error: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    workspace.lastError = error;
    workspace.lastSyncAt = new Date();
    doc.telegramWorkspace = workspace;
    await doc.save();
  },

  /**
   * Create forum topics for dispatched child tasks that are still missing a topic id.
   *
   * @param groupId - MongoDB task group id.
   */
  async syncPendingTaskForumTopicsForGroup(groupId: string): Promise<void> {
    await connectDB();
    const tasks = await Task.find({
      groupId,
      status: { $nin: ["draft", "cancelled"] },
      telegramForumTopicId: null,
    })
      .select("_id")
      .lean();

    for (const task of tasks) {
      await TelegramWorkspaceDomain.syncTaskForumTopic(String(task._id));
    }
  },

  /**
   * Notify roster growth on an active workspace — operator invites new Telegram users.
   *
   * @param groupId - MongoDB task group id.
   */
  async syncOperatorMembersForGroup(groupId: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
    if (workspace.state !== "active" || workspace.chatId == null) return;
    if (!canRunTelegramOperatorMaintenance()) return;

    await TelegramWorkspaceDomain.queueOperatorAction(groupId, "sync_members");
  },

  /**
   * Create a Telegram forum topic for a dispatched task part when the project workspace supports topics.
   *
   * @param taskId - MongoDB task id.
   */
  async syncTaskForumTopic(taskId: string): Promise<void> {
    await connectDB();

    const task = await Task.findById(taskId);
    if (!task?.groupId) return;
    if (task.telegramForumTopicId != null) return;
    if (task.status === "draft" || task.status === "cancelled") return;

    const group = await TaskGroup.findById(task.groupId);
    if (!group) return;

    const workspace = normalizeTaskGroupTelegramWorkspace(group.telegramWorkspace);
    if (workspace.state !== "active" || workspace.chatId == null) {
      return;
    }

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    if (!settings.createForumTopicPerTask) return;

    if (!workspace.forumEnabled) {
      if (canRunTelegramOperatorMaintenance()) {
        await TelegramWorkspaceDomain.queueOperatorAction(String(group._id), "enable_forum");
      }
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!botToken) return;

    const topicId = await TelegramBotDomain.createForumTopic(
      botToken,
      workspace.chatId,
      formatTaskForumTopicTitle(task.title),
    );

    task.telegramForumTopicId = topicId;
    await task.save();

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
    const taskUrl = baseUrl ? `${baseUrl}/tasks/${taskId}` : `/tasks/${taskId}`;
    const welcome = interpolateTelegramWorkspaceTemplate(settings.taskForumTopicWelcomeTemplate, {
      title: group.title,
      groupId: String(group._id),
      linkToken: workspace.linkToken,
      projectUrl: baseUrl ? `${baseUrl}/task-groups/${String(group._id)}` : null,
      taskTitle: task.title,
      taskUrl,
    });

    await TelegramBotDomain.sendGroupTopicMessage(
      botToken,
      workspace.chatId,
      topicId,
      welcome,
    );
  },
};

export default TelegramWorkspaceDomain;
