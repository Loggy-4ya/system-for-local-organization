/**
 * @fileoverview Telegram bot task commands — listings, report wizard, admin completion.
 *
 * Works in linked project groups (scoped by `telegramWorkspace.chatId`) and private DM.
 * In-progress report drafts live in {@link TelegramBotSession} only until submit.
 *
 * @module shared/domains/TelegramBotTaskDomain
 *
 * Tests: `npm run test:telegram-bot-task-logic`, `npm run test:telegram-report-flow-logic`
 */

import connectDB from "@shared/lib/db";
import { TaskDomain } from "@shared/domains/TaskDomain";
import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";
import { MediaDomain } from "@shared/domains/MediaDomain";
import {
  formatTelegramBotTaskPickerMessage,
  formatTelegramBotTasksMessage,
  interpolateTelegramBotTaskTemplate,
  resolveTelegramBotTaskTarget,
  type TelegramBotTaskListRow,
} from "@shared/lib/telegramBotTaskLogic";
import {
  buildTelegramBotSessionExpiry,
  getTelegramReportFlowStepAt,
  isTelegramReportDraftComplete,
  normalizeTelegramReportFlowSteps,
  plainTelegramTextToReportDescription,
  resolveEffectiveTelegramReportFlowSteps,
  stripHtmlForTelegramPreview,
} from "@shared/lib/telegramReportFlowLogic";
import {
  canEditTask,
  canSubmitTaskReport,
  canViewTask,
  hasTaskDispatchAuthority,
  type TaskActorSlice,
} from "@shared/lib/taskAccessLogic";
import { TelegramBotUserDomain } from "@shared/domains/TelegramBotUserDomain";
import { canTransitionTaskStatus } from "@shared/lib/taskStatusLogic";
import type { ITelegramAutomationSettings } from "@shared/models/TelegramAutomationSettings";
import TelegramBotSession, {
  buildTelegramBotSessionId,
} from "@shared/models/TelegramBotSession";
import type { ITaskMediaRef } from "@shared/models/Task";
import Task from "@shared/models/Task";
import TaskGroup from "@shared/models/TaskGroup";
import User from "@shared/models/User";
import type { TelegramReportFlowStep } from "@shared/constants/telegramWorkspace";

/** Scope for resolving which tasks a bot command may address. */
export type TelegramBotTaskScope =
  | { kind: "dm" }
  | { kind: "group"; chatId: number; projectTitle: string; groupId: string };

/** Optional Telegram file attachment on an inbound message. */
export interface TelegramInboundMediaFile {
  /** Bot API file id for `getFile`. */
  fileId: string;
  /** Original filename when present. */
  fileName?: string;
  /** MIME type when known. */
  mimeType?: string;
  /** Resolved media kind for Nexus storage. */
  kind: "image" | "video";
}

/** Result of handling a bot command or wizard step. */
export interface TelegramBotTaskReply {
  /** Plain-text reply body. */
  text: string;
  /** When true, a draft session was discarded before handling the command. */
  sessionDiscarded?: boolean;
}

/**
 * Resolve Nexus task actor from a Telegram sender id.
 *
 * Assumes {@link TelegramBotUserDomain.resolve} was already gated upstream for bot commands.
 *
 * @param telegramUserId - Telegram numeric user id.
 * @returns Actor slice or null when unregistered or profile incomplete.
 */
async function resolveActorFromTelegramId(
  telegramUserId: number,
): Promise<TaskActorSlice | null> {
  const resolution = await TelegramBotUserDomain.resolve(telegramUserId);
  return resolution.actor;
}

/**
 * Load the active project bound to a Telegram group chat.
 *
 * @param chatId - Telegram group chat id.
 * @returns Group id and title or null.
 */
async function findActiveProjectForChat(
  chatId: number,
): Promise<{ groupId: string; title: string } | null> {
  const doc = await TaskGroup.findOne({
    "telegramWorkspace.chatId": chatId,
    "telegramWorkspace.state": "active",
  }).select("title");

  if (!doc) return null;
  return { groupId: String(doc._id), title: doc.title };
}

/**
 * Map a lean task document to a bot list row.
 *
 * @param doc - MongoDB task lean document.
 * @param performerUserId - Optional performer id for role label lookup.
 * @returns Bot list row.
 */
function toBotTaskListRow(
  doc: {
    _id: unknown;
    title: string;
    status: TelegramBotTaskListRow["status"];
    dueAt?: Date | null;
    groupTitle?: string | null;
    categoryLabel?: string | null;
    reportMediaAllowed?: boolean;
    performers?: Array<{ userId: unknown; roleLabel?: string }>;
  },
  performerUserId?: string,
): TelegramBotTaskListRow {
  const performer = performerUserId
    ? doc.performers?.find((entry) => String(entry.userId) === performerUserId)
    : undefined;

  return {
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
    dueAt: doc.dueAt ?? null,
    groupTitle: doc.groupTitle ?? null,
    categoryLabel: doc.categoryLabel ?? null,
    roleLabel: performer?.roleLabel ?? null,
    reportMediaAllowed: Boolean(doc.reportMediaAllowed),
  };
}

/**
 * Resolve command scope from chat type and id.
 *
 * @param chatId - Telegram chat id.
 * @param chatType - Telegram chat type.
 * @returns Scope or null when a group is not linked.
 */
async function resolveTaskScope(
  chatId: number,
  chatType: string,
): Promise<TelegramBotTaskScope | "unlinked" | "wrong_chat"> {
  if (chatType === "private") {
    return { kind: "dm" };
  }
  if (chatType !== "group" && chatType !== "supergroup") {
    return "wrong_chat";
  }

  const project = await findActiveProjectForChat(chatId);
  if (!project) return "unlinked";

  return {
    kind: "group",
    chatId,
    groupId: project.groupId,
    projectTitle: project.title,
  };
}

/**
 * Load tasks visible for `/tasks` in the current scope.
 *
 * @param scope - DM or linked group scope.
 * @param actor - Authenticated actor when listing personal assignments.
 * @returns Task rows in stable order.
 */
async function loadTasksForScope(
  scope: TelegramBotTaskScope,
  actor: TaskActorSlice | null,
): Promise<TelegramBotTaskListRow[]> {
  if (scope.kind === "group") {
    const docs = await Task.find({ groupId: scope.groupId })
      .sort({ updatedAt: -1 })
      .select(
        "title status dueAt groupTitle categoryLabel reportMediaAllowed performers",
      )
      .lean();
    return docs.map((doc) => toBotTaskListRow(doc));
  }

  if (!actor) return [];

  const docs = await Task.find({
    "performers.userId": actor.userId,
    status: { $nin: ["cancelled", "completed", "draft"] },
  })
    .sort({ dueAt: 1, updatedAt: -1 })
    .select("title status dueAt groupTitle categoryLabel reportMediaAllowed performers")
    .lean();

  return docs.map((doc) => toBotTaskListRow(doc, actor.userId));
}

/**
 * Load submittable open tasks for the actor in the current scope.
 *
 * @param scope - DM or linked group scope.
 * @param actor - Authenticated performer.
 * @returns Tasks the actor may report on.
 */
async function loadReportableTasksForActor(
  scope: TelegramBotTaskScope,
  actor: TaskActorSlice,
): Promise<TelegramBotTaskListRow[]> {
  const rows = await loadTasksForScope(scope, actor);
  const eligible: TelegramBotTaskListRow[] = [];

  for (const row of rows) {
    const doc = await Task.findById(row.id).select(
      "authorUserId performers status delegationCount reportMediaAllowed title dueAt groupTitle categoryLabel",
    );
    if (!doc) continue;
    const slice = {
      authorUserId: String(doc.authorUserId),
      performerUserIds: (doc.performers ?? []).map((p) => String(p.userId)),
      status: doc.status,
      delegationCount: doc.delegationCount ?? 0,
    };
    if (canSubmitTaskReport(actor, slice)) {
      eligible.push(toBotTaskListRow(doc, actor.userId));
    }
  }

  return eligible;
}

/**
 * Build public site base URL for task links.
 *
 * @returns Base URL or null when unset.
 */
function resolvePublicSiteBaseUrl(): string | null {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? null;
}

/**
 * Load automation settings used by bot task commands.
 *
 * @returns Settings singleton document.
 */
async function loadAutomationSettings(): Promise<ITelegramAutomationSettings> {
  return TelegramWorkspaceDomain.loadOrSeedSettings();
}

/**
 * Delete an in-progress bot session when present.
 *
 * @param chatId - Telegram chat id.
 * @param telegramUserId - Sender Telegram id.
 * @returns True when a draft existed.
 */
async function deleteSessionIfAny(chatId: number, telegramUserId: number): Promise<boolean> {
  const id = buildTelegramBotSessionId(chatId, telegramUserId);
  const result = await TelegramBotSession.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

/**
 * Telegram bot task command domain.
 */
export const TelegramBotTaskDomain = {
  deleteSessionIfAny,

  /**
   * Discard an active wizard draft without sending a message.
   *
   * @param chatId - Telegram chat id.
   * @param telegramUserId - Sender Telegram id.
   * @returns Whether a draft existed.
   */
  cancelSessionIfAny: deleteSessionIfAny,

  /**
   * Build `/tasks` listing for a chat.
   *
   * @param chatId - Telegram chat id.
   * @param chatType - Telegram chat type.
   * @param telegramUserId - Sender Telegram id.
   * @returns Reply text.
   */
  async buildTasksMessage(
    chatId: number,
    chatType: string,
    telegramUserId: number,
  ): Promise<string> {
    await connectDB();
    const settings = await loadAutomationSettings();
    const scope = await resolveTaskScope(chatId, chatType);

    if (scope === "wrong_chat") {
      return "Task commands are available in private bot chat or linked project groups.";
    }

    if (scope === "unlinked") {
      return settings.tasksUnlinkedGroupTemplate;
    }

    const actor = await resolveActorFromTelegramId(telegramUserId);
    if (scope.kind === "dm" && !actor) {
      return "Link your Telegram account in Nexus profile settings to see your assignments.";
    }

    const rows = await loadTasksForScope(scope, actor);
    const baseUrl = resolvePublicSiteBaseUrl();

    if (scope.kind === "group") {
      return formatTelegramBotTasksMessage(
        rows,
        {
          headerTemplate: settings.tasksHeaderTemplate,
          lineTemplate: settings.tasksLineTemplate,
          footerTemplate: settings.tasksFooterTemplate,
          emptyTemplate: settings.tasksEmptyTemplate,
        },
        { title: scope.projectTitle },
        baseUrl,
      );
    }

    return formatTelegramBotTasksMessage(
      rows,
      {
        headerTemplate: settings.tasksDmHeaderTemplate,
        lineTemplate: settings.tasksDmLineTemplate,
        footerTemplate: settings.tasksDmFooterTemplate,
        emptyTemplate: settings.tasksDmEmptyTemplate,
      },
      { title: "Assignments" },
      baseUrl,
    );
  },

  /**
   * Start or continue `/task_report` for a selected task.
   *
   * @param chatId - Telegram chat id.
   * @param chatType - Telegram chat type.
   * @param telegramUserId - Sender Telegram id.
   * @param arg - Optional list index or task id prefix.
   * @returns Reply text.
   */
  async handleTaskReportCommand(
    chatId: number,
    chatType: string,
    telegramUserId: number,
    arg?: string,
  ): Promise<TelegramBotTaskReply> {
    await connectDB();
    const settings = await loadAutomationSettings();
    const scope = await resolveTaskScope(chatId, chatType);

    if (scope === "wrong_chat") {
      return { text: "Use /task_report in private bot chat or a linked project group." };
    }
    if (scope === "unlinked") {
      return { text: settings.tasksUnlinkedGroupTemplate };
    }

    const actor = await resolveActorFromTelegramId(telegramUserId);
    if (!actor) {
      return {
        text: "Link your Telegram account in Nexus profile settings before submitting reports.",
      };
    }

    const candidates = await loadReportableTasksForActor(scope, actor);
    const targetId = resolveTelegramBotTaskTarget(candidates, arg);
    if (!targetId) {
      const baseUrl = resolvePublicSiteBaseUrl();
      const lineTemplate =
        scope.kind === "group" ? settings.tasksLineTemplate : settings.tasksDmLineTemplate;
      return {
        text: formatTelegramBotTaskPickerMessage(
          settings.taskReportPickTemplate,
          candidates,
          lineTemplate,
          baseUrl,
        ),
      };
    }

    const task = candidates.find((row) => row.id === targetId);
    if (!task) {
      return { text: "Task not found." };
    }

    const configuredSteps = normalizeTelegramReportFlowSteps(settings.reportFlowSteps);
    const effectiveSteps = resolveEffectiveTelegramReportFlowSteps(
      configuredSteps,
      task.reportMediaAllowed,
    );

    await TelegramBotSession.findOneAndUpdate(
      { _id: buildTelegramBotSessionId(chatId, telegramUserId) },
      {
        _id: buildTelegramBotSessionId(chatId, telegramUserId),
        telegramUserId,
        chatId,
        kind: "task_report",
        taskId: targetId,
        stepIndex: 0,
        description: undefined,
        media: [],
        expiresAt: buildTelegramBotSessionExpiry(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const prompt = TelegramBotTaskDomain.buildStepPrompt(
      settings,
      effectiveSteps,
      0,
      task.title,
    );
    return { text: prompt };
  },

  /**
   * Build the prompt for a wizard step index.
   *
   * @param settings - Automation settings.
   * @param steps - Effective step list.
   * @param stepIndex - Active step index.
   * @param taskTitle - Task headline.
   * @returns Prompt plain text.
   */
  buildStepPrompt(
    settings: ITelegramAutomationSettings,
    steps: readonly TelegramReportFlowStep[],
    stepIndex: number,
    taskTitle: string,
  ): string {
    const step = getTelegramReportFlowStepAt(steps, stepIndex);
    const context = { taskTitle };
    if (step === "media") {
      return interpolateTelegramBotTaskTemplate(
        settings.taskReportMediaPromptTemplate,
        context,
      );
    }
    return interpolateTelegramBotTaskTemplate(
      settings.taskReportDescriptionPromptTemplate,
      context,
    );
  },

  /**
   * Handle `/cancel` — discard draft without saving to tasks.
   *
   * @param chatId - Telegram chat id.
   * @param telegramUserId - Sender Telegram id.
   * @returns Reply text.
   */
  async handleCancelCommand(chatId: number, telegramUserId: number): Promise<string> {
    await connectDB();
    const settings = await loadAutomationSettings();
    const deleted = await deleteSessionIfAny(chatId, telegramUserId);
    return deleted
      ? settings.taskReportCancelledTemplate
      : "No report draft in progress.";
  },

  /**
   * Handle wizard control commands `/done` and `/skip`.
   *
   * @param chatId - Telegram chat id.
   * @param telegramUserId - Sender Telegram id.
   * @param commandName - `/done` or `/skip`.
   * @returns Reply when handled; null when no active session.
   */
  async handleWizardControlCommand(
    chatId: number,
    telegramUserId: number,
    commandName: "/done" | "/skip",
  ): Promise<string | null> {
    await connectDB();
    const sessionId = buildTelegramBotSessionId(chatId, telegramUserId);
    const session = await TelegramBotSession.findById(sessionId);
    if (!session || session.kind !== "task_report") return null;

    const settings = await loadAutomationSettings();
    const actor = await resolveActorFromTelegramId(telegramUserId);
    if (!actor) return "Link your Telegram account in Nexus profile settings.";

    const taskDoc = await Task.findById(session.taskId).select(
      "title reportMediaAllowed",
    );
    if (!taskDoc) {
      await deleteSessionIfAny(chatId, telegramUserId);
      return "Task not found.";
    }

    const configuredSteps = normalizeTelegramReportFlowSteps(settings.reportFlowSteps);
    const steps = resolveEffectiveTelegramReportFlowSteps(
      configuredSteps,
      Boolean(taskDoc.reportMediaAllowed),
    );
    const currentStep = getTelegramReportFlowStepAt(steps, session.stepIndex);
    if (currentStep !== "media") {
      return "Send report text first, or /cancel to discard the draft.";
    }

    if (commandName === "/done" && session.media.length === 0) {
      return "Send at least one photo or video, or use /skip if media is optional.";
    }

    session.stepIndex += 1;
    session.expiresAt = buildTelegramBotSessionExpiry();
    await session.save();

    return TelegramBotTaskDomain.finalizeReportSession(
      session,
      actor,
      settings,
      steps,
      taskDoc.title,
    );
  },

  /**
   * Accept plain text or media while a report wizard session is active.
   *
   * @param chatId - Telegram chat id.
   * @param telegramUserId - Sender Telegram id.
   * @param payload - Text body and/or downloaded media file.
   * @param uploadMedia - Injected uploader for Telegram file bytes.
   * @returns Reply when handled; null when no active session.
   */
  async handleSessionPayload(
    chatId: number,
    telegramUserId: number,
    payload: {
      text?: string;
      mediaFile?: TelegramInboundMediaFile;
    },
    uploadMedia: (
      file: TelegramInboundMediaFile,
      taskId: string,
    ) => Promise<ITaskMediaRef>,
  ): Promise<string | null> {
    await connectDB();
    const sessionId = buildTelegramBotSessionId(chatId, telegramUserId);
    const session = await TelegramBotSession.findById(sessionId);
    if (!session || session.kind !== "task_report") return null;

    const settings = await loadAutomationSettings();
    const actor = await resolveActorFromTelegramId(telegramUserId);
    if (!actor) {
      await deleteSessionIfAny(chatId, telegramUserId);
      return "Link your Telegram account in Nexus profile settings.";
    }

    const taskDoc = await Task.findById(session.taskId).select(
      "title reportMediaAllowed authorUserId performers status delegationCount",
    );
    if (!taskDoc) {
      await deleteSessionIfAny(chatId, telegramUserId);
      return "Task not found.";
    }

    const configuredSteps = normalizeTelegramReportFlowSteps(settings.reportFlowSteps);
    const steps = resolveEffectiveTelegramReportFlowSteps(
      configuredSteps,
      Boolean(taskDoc.reportMediaAllowed),
    );
    const currentStep = getTelegramReportFlowStepAt(steps, session.stepIndex);
    if (!currentStep) {
      await deleteSessionIfAny(chatId, telegramUserId);
      return "No active report step. Start again with /task_report.";
    }

    if (currentStep === "description") {
      const text = payload.text?.trim();
      if (!text) {
        return "Send a plain-text description, or /cancel to discard the draft.";
      }
      session.description = plainTelegramTextToReportDescription(text);
      session.stepIndex += 1;
      session.expiresAt = buildTelegramBotSessionExpiry();
      await session.save();

      return TelegramBotTaskDomain.finalizeReportSession(
        session,
        actor,
        settings,
        steps,
        taskDoc.title,
      );
    }

    if (currentStep === "media") {
      if (!payload.mediaFile) {
        return "Send a photo or video, then /done. Use /skip to finish without media.";
      }
      if (session.media.length >= 12) {
        return "Maximum 12 attachments. Send /done to finish.";
      }

      const ref = await uploadMedia(payload.mediaFile, session.taskId);
      session.media.push(ref);
      session.expiresAt = buildTelegramBotSessionExpiry();
      await session.save();
      return `Attachment saved (${session.media.length}). Send more media or /done.`;
    }

    return null;
  },

  /**
   * Advance to the next wizard prompt or submit the report when complete.
   *
   * @param session - Active session document.
   * @param actor - Performer actor slice.
   * @param settings - Automation settings.
   * @param steps - Effective wizard steps.
   * @param taskTitle - Task headline for templates.
   * @returns User-facing reply text.
   */
  async finalizeReportSession(
    session: {
      taskId: string;
      stepIndex: number;
      description?: string;
      media: ITaskMediaRef[];
      _id: string;
      chatId: number;
      telegramUserId: number;
    },
    actor: TaskActorSlice,
    settings: ITelegramAutomationSettings,
    steps: readonly TelegramReportFlowStep[],
    taskTitle: string,
  ): Promise<string> {
    const nextStep = getTelegramReportFlowStepAt(steps, session.stepIndex);
    if (nextStep) {
      return TelegramBotTaskDomain.buildStepPrompt(settings, steps, session.stepIndex, taskTitle);
    }

    const complete = isTelegramReportDraftComplete(steps, session.stepIndex, {
      description: session.description,
    });
    if (!complete || !session.description?.trim()) {
      return "Report is incomplete. /cancel to discard and start again.";
    }

    try {
      await TaskDomain.submitReport(actor, session.taskId, {
        description: session.description,
        media: session.media,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "FORBIDDEN" || message === "NOT_A_PERFORMER") {
        await deleteSessionIfAny(session.chatId, session.telegramUserId);
        return "You are not assigned to that part.";
      }
      if (message === "TASK_NOT_FOUND") {
        await deleteSessionIfAny(session.chatId, session.telegramUserId);
        return "Task not found.";
      }
      return "Could not submit the report. Try again from the web app.";
    }

    await deleteSessionIfAny(session.chatId, session.telegramUserId);
    return interpolateTelegramBotTaskTemplate(settings.taskReportSuccessTemplate, {
      taskTitle,
    });
  },

  /**
   * Mark a task completed via `/completed` when institution settings allow it.
   *
   * @param chatId - Telegram chat id.
   * @param chatType - Telegram chat type.
   * @param telegramUserId - Sender Telegram id.
   * @param arg - Optional list index or task id prefix.
   * @returns Reply text.
   */
  async handleCompletedCommand(
    chatId: number,
    chatType: string,
    telegramUserId: number,
    arg?: string,
  ): Promise<string> {
    await connectDB();
    const settings = await loadAutomationSettings();
    if (!settings.botCompletedCommandEnabled) {
      return "The /completed command is disabled in Telegram workspace settings.";
    }

    const scope = await resolveTaskScope(chatId, chatType);
    if (scope === "wrong_chat") {
      return "Use /completed in private bot chat or a linked project group.";
    }
    if (scope === "unlinked") {
      return settings.tasksUnlinkedGroupTemplate;
    }

    const actor = await resolveActorFromTelegramId(telegramUserId);
    if (!actor || !hasTaskDispatchAuthority(actor)) {
      return settings.taskCompletedForbiddenTemplate;
    }

    const rows = await loadTasksForScope(scope, actor);
    const targetId = resolveTelegramBotTaskTarget(rows, arg);
    if (!targetId) {
      const baseUrl = resolvePublicSiteBaseUrl();
      const lineTemplate =
        scope.kind === "group" ? settings.tasksLineTemplate : settings.tasksDmLineTemplate;
      return formatTelegramBotTaskPickerMessage(
        "Choose a part to mark completed:\n\n{{taskList}}\n\nExample: /completed 1",
        rows,
        lineTemplate,
        baseUrl,
      );
    }

    const doc = await Task.findById(targetId);
    if (!doc) return "Task not found.";

    const slice = {
      authorUserId: String(doc.authorUserId),
      performerUserIds: (doc.performers ?? []).map((p) => String(p.userId)),
      status: doc.status,
      delegationCount: doc.delegationCount ?? 0,
    };

    if (!canEditTask(actor, slice)) {
      return settings.taskCompletedForbiddenTemplate;
    }
    if (!canTransitionTaskStatus(doc.status, "completed")) {
      return `Cannot complete a task in status «${doc.status}».`;
    }

    try {
      await TaskDomain.updateTask(actor, targetId, { status: "completed" });
    } catch {
      return settings.taskCompletedForbiddenTemplate;
    }

    return interpolateTelegramBotTaskTemplate(settings.taskCompletedSuccessTemplate, {
      taskTitle: doc.title,
    });
  },

  /**
   * Show a stored performer report via `/see_report`.
   *
   * @param chatId - Telegram chat id.
   * @param chatType - Telegram chat type.
   * @param telegramUserId - Sender Telegram id.
   * @param arg - Optional list index or task id prefix.
   * @returns Reply text.
   */
  async handleSeeReportCommand(
    chatId: number,
    chatType: string,
    telegramUserId: number,
    arg?: string,
  ): Promise<string> {
    await connectDB();
    const settings = await loadAutomationSettings();
    const scope = await resolveTaskScope(chatId, chatType);

    if (scope === "wrong_chat") {
      return "Use /see_report in private bot chat or a linked project group.";
    }
    if (scope === "unlinked") {
      return settings.tasksUnlinkedGroupTemplate;
    }

    const actor = await resolveActorFromTelegramId(telegramUserId);
    if (!actor) {
      return "Link your Telegram account in Nexus profile settings.";
    }

    const rows = await loadTasksForScope(scope, actor);
    const targetId = resolveTelegramBotTaskTarget(rows, arg);
    if (!targetId) {
      const baseUrl = resolvePublicSiteBaseUrl();
      const lineTemplate =
        scope.kind === "group" ? settings.tasksLineTemplate : settings.tasksDmLineTemplate;
      return formatTelegramBotTaskPickerMessage(
        "Choose a part to inspect:\n\n{{taskList}}\n\nExample: /see_report 1",
        rows,
        lineTemplate,
        baseUrl,
      );
    }

    const doc = await Task.findById(targetId);
    if (!doc) return "Task not found.";

    const slice = {
      authorUserId: String(doc.authorUserId),
      performerUserIds: (doc.performers ?? []).map((p) => String(p.userId)),
      status: doc.status,
      delegationCount: doc.delegationCount ?? 0,
    };
    if (!canViewTask(actor, slice)) {
      return "You cannot view that report.";
    }

    const performer =
      doc.performers.find((entry) => String(entry.userId) === actor.userId) ??
      doc.performers.find((entry) => entry.report?.description);

    const report = performer?.report;
    if (!report?.description) {
      return interpolateTelegramBotTaskTemplate(settings.seeReportEmptyTemplate, {
        taskTitle: doc.title,
      });
    }

    const header = interpolateTelegramBotTaskTemplate(settings.seeReportHeaderTemplate, {
      taskTitle: doc.title,
      performerName: performer?.displayName ?? "Performer",
    });
    const body = interpolateTelegramBotTaskTemplate(settings.seeReportBodyTemplate, {
      description: stripHtmlForTelegramPreview(report.description),
      mediaCount: report.media?.length ?? 0,
      submittedAt: report.submittedAt
        ? new Date(report.submittedAt).toLocaleString("en-GB")
        : "",
    });

    const mediaLines =
      report.media?.length > 0
        ? report.media.map((item, index) => `${index + 1}. ${item.url}`).join("\n")
        : "";

    return [header, "", body, mediaLines ? ["", "Attachments:", mediaLines].join("\n") : ""]
      .filter(Boolean)
      .join("\n");
  },

  /**
   * Upload a Telegram attachment into Nexus task-report storage.
   *
   * @param botToken - BotFather token.
   * @param file - Parsed inbound media file.
   * @param taskId - Owner task id.
   * @returns Media ref for report submission.
   */
  async uploadTelegramMediaFile(
    botToken: string,
    file: TelegramInboundMediaFile,
    taskId: string,
  ): Promise<ITaskMediaRef> {
    const filePath = await TelegramBotTaskDomain.resolveTelegramFilePath(botToken, file.fileId);
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error("TELEGRAM_FILE_DOWNLOAD_FAILED");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await MediaDomain.upload({
      buffer,
      originalName: file.fileName ?? `telegram-${file.kind}`,
      mimeType: file.mimeType ?? (file.kind === "video" ? "video/mp4" : "image/jpeg"),
      purpose: "task-report",
      ownerKey: taskId,
    });

    return {
      url: result.url,
      mimeType: result.mimeType,
      kind: file.kind,
    };
  },

  /**
   * Resolve Bot API file path for download.
   *
   * @param botToken - BotFather token.
   * @param fileId - Telegram file id.
   * @returns Relative file path segment.
   */
  async resolveTelegramFilePath(botToken: string, fileId: string): Promise<string> {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      },
    );
    const json = (await response.json()) as {
      ok?: boolean;
      result?: { file_path?: string };
      description?: string;
    };
    if (!response.ok || json.ok === false || !json.result?.file_path) {
      throw new Error(json.description ?? "getFile failed");
    }
    return json.result.file_path;
  },
};

export default TelegramBotTaskDomain;
