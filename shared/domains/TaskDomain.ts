/**
 * @fileoverview Consolidated task domain — CRUD, delegation, reports, scoring, reminders.
 *
 * @module shared/domains/TaskDomain
 *
 * Tests: `npm run test:task-domain`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import {
  DEFAULT_TASK_REMINDER_SETTINGS,
  type TaskAssignmentNotifyTarget,
  type TaskGroupStatus,
  type TaskStatus,
} from "@shared/constants/taskSettings";
import {
  computeNextTaskReminderAt,
  normalizeTaskReminderSettings,
} from "@shared/lib/taskReminderLogic";
import { SCHEDULED_EVENT_TYPES } from "@shared/constants/scheduledEventTypes";
import type { PaginatedListMeta } from "@shared/constants/listPagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import {
  canAcknowledgeTask,
  canCancelTask,
  canCreateTask,
  canDelegateTask,
  canEditTask,
  canListTasks,
  canReopenTask,
  canScoreTask,
  canStartTask,
  canSubmitTaskReport,
  canViewTask,
  type TaskActorSlice,
} from "@shared/lib/taskAccessLogic";
import { normalizeTaskDelegationLimits } from "@shared/lib/taskDelegationLimitsLogic";
import { normalizePageCategoryList } from "@shared/lib/pageCategoryLogic";
import {
  findTaskCategoryById,
  listEnabledTaskCategories,
  normalizeTaskCategories,
} from "@shared/lib/taskCategoriesSettingsLogic";
import type { TaskCategoryDefinition } from "@shared/constants/taskCategoryDefaults";
import { computeTaskPerformerFinalScore, isBaseScoreAllowedForCategory } from "@shared/lib/taskScoreLogic";
import { sanitizeNexusEditorHtml } from "@shared/lib/nexusRichTextSanitize";
import {
  clampListPageSize,
  clampPageIndex,
  computeTotalPages,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";
import {
  canTransitionTaskStatus,
  shouldMarkTaskOverdue,
  statusAfterTaskCompletion,
  statusAfterTaskReport,
} from "@shared/lib/taskStatusLogic";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";
import { buildTaskReminderNotificationCopy } from "@shared/lib/taskReminderNotificationCopy";
import {
  normalizeUserNotificationChannels,
  userAcceptsNotificationChannel,
} from "@shared/lib/userNotificationSettingsLogic";
import {
  buildInboxDeliveryKey,
} from "@shared/lib/notificationInboxLogic";
import type { NotificationInboxChannel } from "@shared/constants/notificationInbox";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import Task, {
  type ITask,
  type ITaskMediaRef,
  type ITaskPerformer,
  type ITaskReminderSettings,
} from "@shared/models/Task";
import TaskReminderNotification from "@shared/models/TaskReminderNotification";
import TaskGroup from "@shared/models/TaskGroup";
import User, { type IUser } from "@shared/models/User";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { TelegramBotDomain } from "@shared/domains/TelegramBotDomain";
import { TaskGroupDomain } from "@shared/domains/TaskGroupDomain";
import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";
import type {
  TaskCreateInput,
  TaskDelegateInput,
  TaskListQuery,
  TaskReportInput,
  TaskScoreInput,
  TaskUpdateInput,
} from "@shared/validation/taskSchemas";
import { Types } from "mongoose";

/** Aggregated task metrics for profile dashboard panels. */
export interface ProfileTaskSnapshot {
  /** Total open assigned tasks (excludes completed/cancelled). */
  openCount: number;
  /** Open task counts keyed by lifecycle status. */
  openByStatus: Partial<Record<TaskStatus, number>>;
  /** Recently updated open tasks for activity sidebar. */
  recentOpenTasks: TaskListRow[];
  /** Assigned tasks completed within the last 30 days. */
  completedLast30Days: number;
  /** Active multi-part projects where the user is on the roster. */
  activeGroupCount: number;
}

/** Public list row for task manager UI. */
export interface TaskListRow {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt: Date | null;
  tags: string[];
  categoryId: string | null;
  categoryLabel: string | null;
  authorUserId: string;
  authorDisplayName: string;
  performerCount: number;
  groupId: string | null;
  groupTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Public task detail DTO. */
export interface TaskDetailDto extends TaskListRow {
  description: string;
  explanationMedia: ITaskMediaRef[];
  completedAtHistory: Date[];
  /** Base score (B) — visible only to the task author. */
  baseScore: number | null;
  assignmentNotifyTargets: TaskAssignmentNotifyTarget[];
  /** When true, completion reports may include proof media (web + Telegram bot). */
  reportMediaAllowed: boolean;
  performers: Array<{
    userId: string;
    displayName: string;
    avatar: string | null;
    roleLabel?: string;
    assignedAt: Date;
    acknowledgedAt: Date | null;
    qualityPercent: number | null;
    timePercent: number | null;
    score: number | null;
    report: ITaskPerformer["report"];
  }>;
  scoringCategory: {
    id: string;
    label: string;
    baseScoreMin: number;
    baseScoreMax: number;
    defaultQualityPercent: number;
    defaultTimePercent: number;
  } | null;
  /** True when the viewer may edit B/Q/T via the score API. */
  canScore: boolean;
  reminderSettings: ITaskReminderSettings;
  delegationCount: number;
}

/** Active web toast for a task reminder delivery row. */
export interface ActiveWebTaskReminderToast {
  id: string;
  kind: "task" | "group" | "institutional";
  taskId: string | null;
  groupId: string | null;
  ruleId: string | null;
  title: string;
  body: string;
  variant: "info" | "warning";
  createdAt: Date;
}

/**
 * Build a task actor slice from a user document and resolved permissions.
 *
 * @param user - MongoDB user document.
 * @param permissions - Effective permission keys.
 * @returns Actor slice for pure access helpers.
 */
export function buildTaskActor(user: IUser, permissions: string[]): TaskActorSlice {
  return {
    userId: String(user._id),
    role: user.role,
    accessLevelIndex: user.accessLevelIndex,
    delegatedPermissions: user.delegatedPermissions ?? [],
    sociumRoles: user.sociumRoles ?? [],
    studentTitle: user.studentTitle,
    permissions: permissions as TaskActorSlice["permissions"],
  };
}

/**
 * Convert a task document into a list row DTO.
 *
 * @param doc - Mongoose task document.
 * @returns Slim list row.
 */
function toTaskListRow(doc: ITask): TaskListRow {
  return {
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
    dueAt: doc.dueAt ?? null,
    tags: doc.tags ?? [],
    categoryId: doc.categoryId ?? null,
    categoryLabel: doc.categoryLabel ?? null,
    authorUserId: String(doc.authorUserId),
    authorDisplayName: doc.authorDisplayName,
    performerCount: doc.performers?.length ?? 0,
    groupId: doc.groupId ? String(doc.groupId) : null,
    groupTitle: doc.groupTitle ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function readPerformerQualityPercent(performer: ITaskPerformer): number | null {
  if (performer.qualityPercent != null) return performer.qualityPercent;
  if (performer.qualityCoefficient != null) {
    return Math.round(performer.qualityCoefficient * 100);
  }
  return performer.qualityScore ?? null;
}

function readPerformerTimePercent(performer: ITaskPerformer): number | null {
  if (performer.timePercent != null) return performer.timePercent;
  if (performer.timeCoefficient != null) {
    return Math.round(performer.timeCoefficient * 100);
  }
  return performer.timeScore ?? null;
}

/**
 * Convert a task document into a detail DTO.
 *
 * Scores (B, Q, T, final) are visible to everyone who can open the task detail.
 *
 * @param doc - Mongoose task document.
 * @param category - Resolved scoring category.
 * @param canScore - Whether this viewer may POST score updates.
 * @returns Full detail payload.
 */
function toTaskDetail(
  doc: ITask,
  category: TaskCategoryDefinition | null = null,
  canScore = false,
): TaskDetailDto {
  return {
    ...toTaskListRow(doc),
    description: doc.description ?? "",
    explanationMedia: doc.explanationMedia ?? [],
    completedAtHistory: doc.completedAtHistory ?? [],
    baseScore: doc.baseScore ?? null,
    assignmentNotifyTargets: (doc.assignmentNotifyTargets ?? []) as TaskAssignmentNotifyTarget[],
    reportMediaAllowed: Boolean(doc.reportMediaAllowed),
    performers: (doc.performers ?? []).map((performer) => ({
      userId: String(performer.userId),
      displayName: performer.displayName,
      avatar: performer.avatar ?? null,
      roleLabel: performer.roleLabel,
      assignedAt: performer.assignedAt,
      acknowledgedAt: performer.acknowledgedAt ?? null,
      qualityPercent: readPerformerQualityPercent(performer),
      timePercent: readPerformerTimePercent(performer),
      score: performer.score ?? null,
      report: performer.report ?? null,
    })),
    scoringCategory: category
      ? {
          id: category.id,
          label: category.label,
          baseScoreMin: category.baseScoreMin,
          baseScoreMax: category.baseScoreMax,
          defaultQualityPercent: category.defaultQualityPercent,
          defaultTimePercent: category.defaultTimePercent,
        }
      : null,
    canScore,
    reminderSettings: normalizeTaskReminderSettings(doc.reminderSettings),
    delegationCount: doc.delegationCount ?? 0,
  };
}

/**
 * Resolve task category fields from general rules.
 *
 * @param categoryId - Requested category slug (falls back to first enabled category).
 * @returns Persisted category id/label and definition row.
 */
async function resolveTaskCategoryFields(categoryId?: string | null): Promise<{
  categoryId: string | null;
  categoryLabel: string | null;
  category: TaskCategoryDefinition | null;
}> {
  const rules = await GeneralRulesDomain.loadOrSeed();
  const categories = normalizeTaskCategories(rules.taskCategories as TaskCategoryDefinition[]);
  const enabled = listEnabledTaskCategories(categories);
  const fallback = enabled[0] ?? categories[0] ?? null;
  const resolved =
    findTaskCategoryById(categories, categoryId) ??
    (categoryId ? null : fallback);

  if (!resolved) {
    return { categoryId: null, categoryLabel: null, category: null };
  }

  return {
    categoryId: resolved.id,
    categoryLabel: resolved.label,
    category: resolved,
  };
}

/**
 * Load scoring category metadata for a persisted task document.
 *
 * @param doc - Task document.
 * @returns Category definition or null.
 */
async function loadScoringCategoryForTask(doc: ITask): Promise<TaskCategoryDefinition | null> {
  const rules = await GeneralRulesDomain.loadOrSeed();
  const categories = normalizeTaskCategories(rules.taskCategories as TaskCategoryDefinition[]);
  return findTaskCategoryById(categories, doc.categoryId) ?? null;
}

async function buildTaskDetailDto(doc: ITask, actor: TaskActorSlice): Promise<TaskDetailDto> {
  const category = await loadScoringCategoryForTask(doc);
  const canScore = canScoreTask(actor, toTaskAccessSlice(doc));
  return toTaskDetail(doc, category, canScore);
}

/**
 * Build task access slice from a document.
 *
 * @param doc - Task document.
 * @returns Access slice.
 */
function toTaskAccessSlice(doc: ITask) {
  return {
    authorUserId: String(doc.authorUserId),
    performerUserIds: (doc.performers ?? []).map((p) => String(p.userId)),
    status: doc.status,
    delegationCount: doc.delegationCount ?? 0,
  };
}

/**
 * Resolve display label for a user id.
 *
 * @param user - User document or null.
 * @returns Display label fallback.
 */
function displayNameForUser(user: IUser | null): string {
  if (!user) return "Unknown user";
  return (
    resolveUserDisplayLabel({
      name: user.name,
      surname: user.surname,
      login: user.login,
    }) ?? user.name
  );
}

/**
 * Load performer rows from user ids.
 *
 * @param performerInputs - Create/update performer payloads.
 * @param assignedByUserId - Assigning actor id.
 * @returns Performer subdocuments.
 */
async function resolvePerformers(
  performerInputs: Array<{ userId: string; roleLabel?: string }>,
  assignedByUserId: string,
): Promise<ITaskPerformer[]> {
  const ids = performerInputs.map((p) => p.userId);
  const users = await User.find({ _id: { $in: ids } }).lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const now = new Date();
  return performerInputs.map((input) => {
    const user = userMap.get(input.userId);
    return {
      userId: new Types.ObjectId(input.userId),
      displayName: displayNameForUser(user as IUser | null),
      avatar: user?.avatar ?? null,
      roleLabel: input.roleLabel,
      assignedByUserId: new Types.ObjectId(assignedByUserId),
      assignedAt: now,
      acknowledgedAt: null,
      score: null,
      report: null,
    };
  });
}

/**
 * Schedule or refresh periodic task reminder events.
 *
 * @param task - Persisted task document.
 */
async function syncTaskReminderSchedule(task: ITask): Promise<void> {
  const settings = normalizeTaskReminderSettings(task.reminderSettings);
  const taskId = String(task._id);
  const idempotencyKey = `task_reminder:${taskId}`;

  if (!settings.enabled || task.status === "completed" || task.status === "cancelled") {
    await SchedulerDomain.cancelEvent(idempotencyKey).catch(() => undefined);
    return;
  }

  const nextAt = computeNextTaskReminderAt(settings, { taskDueAt: task.dueAt ?? null });
  if (!nextAt) {
    await SchedulerDomain.cancelEvent(idempotencyKey).catch(() => undefined);
    return;
  }

  await SchedulerDomain.scheduleEvent({
    eventType: SCHEDULED_EVENT_TYPES.task_reminder,
    dueAt: nextAt,
    idempotencyKey,
    payload: { taskId },
  });
}

/**
 * Notify performers via Telegram when a task is dispatched.
 *
 * @param task - Dispatched task document.
 */
async function dispatchTaskAssignmentNotifications(task: ITask): Promise<void> {
  const targets = (task.assignmentNotifyTargets ?? []) as TaskAssignmentNotifyTarget[];
  if (targets.length === 0 || task.status !== "dispatched") return;

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const taskPath = `/tasks/${String(task._id)}`;
  const taskUrl = baseUrl ? `${baseUrl}${taskPath}` : taskPath;
  const text = `New task assigned: ${task.title}\n\nOpen in Nexus: ${taskUrl}\n\nConfirm receipt on the task page when you are ready.`;

  const performerIds = (task.performers ?? []).map((performer) => String(performer.userId));
  const users = await User.find({ _id: { $in: performerIds } })
    .select("telegramId displayName name")
    .lean();

  for (const user of users) {
    await NotificationDomain.recordNotification({
      userId: String(user._id),
      kind: "task_assignment",
      deliveryKey: buildInboxDeliveryKey("task_assignment", String(task._id), String(user._id)),
      title: "New task assigned",
      body: task.title,
      variant: "info",
      actionHref: taskPath,
      sourceId: String(task._id),
      channels: targets.includes("telegram_dm")
        ? (["web", "telegram"] as NotificationInboxChannel[])
        : (["web"] as NotificationInboxChannel[]),
    }).catch(() => undefined);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return;

  if (targets.includes("telegram_dm")) {
    for (const user of users) {
      if (typeof user.telegramId === "number" && user.telegramId > 0) {
        await TelegramBotDomain.sendDirectMessage(botToken, user.telegramId, text).catch(
          () => undefined,
        );
      }
    }
  }

  if (targets.includes("telegram_group") && task.groupId) {
    const group = await TaskGroup.findById(task.groupId).lean();
    const chatId = group?.telegramWorkspace?.chatId;
    if (typeof chatId === "number") {
      const names = users
        .map((user) => displayNameForUser(user) || user.name || "team member")
        .join(", ");
      const groupText = names ? `${text}\n\nAssigned to: ${names}` : text;
      await TelegramBotDomain.sendGroupMessage(botToken, chatId, groupText).catch(() => undefined);
    }
  }
}

/**
 * Deliver web toasts and Telegram DMs for one scheduler reminder fire.
 *
 * @param task - Task document that fired a reminder.
 * @param firedAt - Scheduler fire instant used for dedupe keys.
 */
async function dispatchTaskReminderDeliveries(task: ITask, firedAt: Date): Promise<void> {
  const settings = normalizeTaskReminderSettings(task.reminderSettings);
  const wantsWeb = settings.channels.includes("web");
  const wantsTelegram = settings.channels.includes("telegram");
  if (!wantsWeb && !wantsTelegram) return;

  const performerIds = (task.performers ?? []).map((performer) => String(performer.userId));
  if (performerIds.length === 0) return;

  const deliveryKey = `${String(task._id)}:${firedAt.toISOString()}`;
  const copy = buildTaskReminderNotificationCopy({
    title: task.title,
    status: task.status,
    dueAt: task.dueAt,
  });

  const performerUsers = await User.find({ _id: { $in: performerIds } })
    .select("_id telegramId notificationChannels")
    .lean();

  const botToken = wantsTelegram ? process.env.TELEGRAM_BOT_TOKEN?.trim() : undefined;
  const taskPath = `/tasks/${String(task._id)}`;

  for (const performer of performerUsers) {
    const userId = String(performer._id);
    const userChannels = normalizeUserNotificationChannels(performer.notificationChannels);
    const deliverWeb = wantsWeb && userChannels.includes("web");
    const deliverTelegram = wantsTelegram && userChannels.includes("telegram");
    if (!deliverWeb && !deliverTelegram) continue;

    let notification = await TaskReminderNotification.findOne({ userId, deliveryKey });

    if (!notification) {
      notification = await TaskReminderNotification.create({
        kind: "task",
        taskId: task._id,
        groupId: null,
        userId,
        deliveryKey,
        title: copy.title,
        body: copy.body,
        variant: copy.variant,
        webChannel: deliverWeb,
        webDismissedAt: deliverWeb ? null : new Date(),
        telegramDeliveredAt: null,
        telegramError: null,
      });
    }

    const inboxChannels: NotificationInboxChannel[] = [
      ...(deliverWeb ? (["web"] as const) : []),
      ...(deliverTelegram ? (["telegram"] as const) : []),
    ];
    if (inboxChannels.length > 0) {
      await NotificationDomain.recordNotification({
        userId,
        kind: "task_reminder",
        deliveryKey: buildInboxDeliveryKey("task_reminder", deliveryKey),
        title: copy.title,
        body: copy.body,
        variant: copy.variant,
        actionHref: taskPath,
        sourceId: String(notification._id),
        channels: [...inboxChannels],
      }).catch(() => undefined);
    }

    if (!deliverTelegram) continue;

    const telegramId = performer.telegramId;
    if (telegramId == null) {
      await TaskReminderNotification.updateOne(
        { _id: notification._id },
        { $set: { telegramError: "User has no linked Telegram account." } },
      );
      continue;
    }

    if (!botToken) {
      await TaskReminderNotification.updateOne(
        { _id: notification._id },
        { $set: { telegramError: "TELEGRAM_BOT_TOKEN is not configured." } },
      );
      continue;
    }

    try {
      const telegramText = `${copy.title}\n\n${copy.body}\n\n${taskPath}`;
      await TelegramBotDomain.sendDirectMessage(botToken, telegramId, telegramText);
      await TaskReminderNotification.updateOne(
        { _id: notification._id },
        { $set: { telegramDeliveredAt: new Date(), telegramError: null } },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Telegram delivery failed.";
      await TaskReminderNotification.updateOne(
        { _id: notification._id },
        { $set: { telegramError: message } },
      );
    }
  }
}

/**
 * Consolidated task management domain engine.
 */
export class TaskDomain {
  /**
   * List tasks visible to the actor with pagination.
   *
   * @param actor - Authenticated actor slice.
   * @param query - List filters and pagination.
   * @returns Paginated task rows.
   */
  public static async listTasks(
    actor: TaskActorSlice,
    query: TaskListQuery,
  ): Promise<{ tasks: TaskListRow[]; meta: PaginatedListMeta }> {
    if (!canListTasks(actor)) {
      throw new Error("FORBIDDEN");
    }

    await connectDB();

    const limit = clampListPageSize(query.limit, DEFAULT_LIST_PAGE_SIZE);
    const filter: Record<string, unknown> = {};
    const canDispatch = canCreateTask(actor);

    if (
      query.assigneeUserId &&
      query.assigneeUserId !== actor.userId &&
      !canDispatch &&
      query.scope !== "assigned"
    ) {
      throw new Error("FORBIDDEN");
    }

    if (query.status) filter.status = query.status;
    if (query.tag) filter.tags = query.tag;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.groupId) filter.groupId = query.groupId;

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }

    if (query.scope === "authored") {
      filter.authorUserId = actor.userId;
    } else if (query.scope === "assigned") {
      filter["performers.userId"] = query.assigneeUserId ?? actor.userId;
    } else if (!canDispatch) {
      filter.$or = [
        { authorUserId: actor.userId },
        { "performers.userId": actor.userId },
      ];
    }

    const totalCount = await Task.countDocuments(filter);
    const totalPages = computeTotalPages(totalCount, limit);
    const page = clampPageIndex(query.page, totalPages);

    const docs = await Task.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pageToSkip(page, limit))
      .limit(limit);

    return {
      tasks: docs.map(toTaskListRow),
      meta: { page, limit, totalCount, totalPages },
    };
  }

  /**
   * Fetch one task by id when the actor may view it.
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @returns Task detail DTO.
   */
  public static async getTask(actor: TaskActorSlice, taskId: string): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");

    if (!canViewTask(actor, toTaskAccessSlice(doc))) {
      throw new Error("FORBIDDEN");
    }

    await TaskDomain.refreshOverdueStatus(doc);

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Create a new task and optionally dispatch it immediately.
   *
   * @param actor - Authenticated actor slice.
   * @param author - Author user document.
   * @param input - Validated create payload.
   * @returns Created task detail.
   */
  public static async createTask(
    actor: TaskActorSlice,
    author: IUser,
    input: TaskCreateInput,
  ): Promise<TaskDetailDto> {
    if (!canCreateTask(actor)) throw new Error("FORBIDDEN");

    await connectDB();

    const performers = await resolvePerformers(input.performers, actor.userId);
    const status: TaskStatus = input.dispatch ? "dispatched" : "draft";
    const reminderSettings = normalizeTaskReminderSettings(
      input.reminderSettings ?? DEFAULT_TASK_REMINDER_SETTINGS,
    );

    let groupId: Types.ObjectId | null = null;
    let groupTitle: string | null = null;
    if (input.groupId) {
      const group = await TaskGroupDomain.resolveGroupForTaskAttach(actor, input.groupId);
      groupId = new Types.ObjectId(group.id);
      groupTitle = group.title;
    }

    const categoryFields = await resolveTaskCategoryFields(input.categoryId);
    if (input.categoryId && !categoryFields.category) {
      throw new Error("INVALID_TASK_CATEGORY");
    }

    const doc = await Task.create({
      title: input.title.trim(),
      description: sanitizeNexusEditorHtml(input.description ?? ""),
      status,
      explanationMedia: input.explanationMedia ?? [],
      tags: normalizePageCategoryList(input.tags),
      categoryId: categoryFields.categoryId,
      categoryLabel: categoryFields.categoryLabel,
      assignmentNotifyTargets: input.assignmentNotifyTargets ?? ["telegram_dm"],
      reportMediaAllowed: input.reportMediaAllowed ?? false,
      dueAt: input.dueAt ?? null,
      completedAtHistory: [],
      authorUserId: author._id,
      authorDisplayName: displayNameForUser(author),
      performers,
      reminderSettings,
      delegationCount: 0,
      groupId,
      groupTitle,
    });

    await syncTaskReminderSchedule(doc);
    if (doc.dueAt) {
      await TaskDomain.scheduleOverdueCheck(doc);
    }
    if (groupId) {
      await TaskGroupDomain.refreshGroupAggregate(String(groupId));
    }

    if (input.dispatch && groupId) {
      await TelegramWorkspaceDomain.syncTaskForumTopic(String(doc._id)).catch(() => undefined);
    }

    if (input.dispatch) {
      await dispatchTaskAssignmentNotifications(doc).catch(() => undefined);
    }

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Update task fields when the actor may edit.
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @param input - Validated patch payload.
   * @returns Updated task detail.
   */
  public static async updateTask(
    actor: TaskActorSlice,
    taskId: string,
    input: TaskUpdateInput,
  ): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");

    if (!canEditTask(actor, toTaskAccessSlice(doc))) throw new Error("FORBIDDEN");

    const previousGroupId = doc.groupId ? String(doc.groupId) : null;
    const previousStatus = doc.status;

    if (input.title != null) doc.title = input.title.trim();
    if (input.description != null) doc.description = sanitizeNexusEditorHtml(input.description);
    if (input.dueAt !== undefined) doc.dueAt = input.dueAt;
    if (input.tags != null) doc.tags = normalizePageCategoryList(input.tags);
    if (input.categoryId !== undefined) {
      const categoryFields = await resolveTaskCategoryFields(input.categoryId);
      if (!categoryFields.category) {
        throw new Error("INVALID_TASK_CATEGORY");
      }
      doc.categoryId = categoryFields.categoryId;
      doc.categoryLabel = categoryFields.categoryLabel;
    }
    if (input.explanationMedia != null) doc.explanationMedia = input.explanationMedia;
    if (input.reminderSettings != null) {
      doc.reminderSettings = normalizeTaskReminderSettings(input.reminderSettings);
    }
    if (input.assignmentNotifyTargets != null) {
      doc.assignmentNotifyTargets = input.assignmentNotifyTargets;
    }
    if (input.reportMediaAllowed != null) {
      doc.reportMediaAllowed = input.reportMediaAllowed;
    }

    if (input.performers != null) {
      doc.performers = await resolvePerformers(input.performers, actor.userId);
    }

    if (input.groupId !== undefined) {
      if (input.groupId === null) {
        doc.groupId = null;
        doc.groupTitle = null;
      } else {
        const group = await TaskGroupDomain.resolveGroupForTaskAttach(actor, input.groupId);
        doc.groupId = new Types.ObjectId(group.id);
        doc.groupTitle = group.title;
      }
    }

    if (input.status != null) {
      if (!canTransitionTaskStatus(doc.status, input.status)) {
        throw new Error("INVALID_STATUS_TRANSITION");
      }
      doc.status = input.status;
      if (input.status === "completed") {
        doc.completedAtHistory = [...(doc.completedAtHistory ?? []), new Date()];
      }
    }

    await doc.save();
    await syncTaskReminderSchedule(doc);
    if (doc.dueAt) await TaskDomain.scheduleOverdueCheck(doc);

    const nextGroupId = doc.groupId ? String(doc.groupId) : null;
    if (previousGroupId && previousGroupId !== nextGroupId) {
      await TaskGroupDomain.refreshGroupAggregate(previousGroupId);
    }
    if (nextGroupId) {
      await TaskGroupDomain.refreshGroupAggregate(nextGroupId);
    }

    if (
      doc.groupId &&
      doc.status === "dispatched" &&
      previousStatus === "draft" &&
      input.status === "dispatched"
    ) {
      await TelegramWorkspaceDomain.syncTaskForumTopic(String(doc._id)).catch(() => undefined);
    }

    if (doc.status === "dispatched" && previousStatus !== "dispatched") {
      await dispatchTaskAssignmentNotifications(doc).catch(() => undefined);
    }

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Cancel a task (soft delete via status).
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @returns Cancelled task detail.
   */
  public static async cancelTask(actor: TaskActorSlice, taskId: string): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");
    if (!canCancelTask(actor, toTaskAccessSlice(doc))) throw new Error("FORBIDDEN");

    doc.status = "cancelled";
    await doc.save();
    await syncTaskReminderSchedule(doc);
    if (doc.groupId) {
      await TaskGroupDomain.refreshGroupAggregate(String(doc.groupId));
    }

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Performer acknowledges receipt of a dispatched task.
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @returns Updated task detail.
   */
  public static async acknowledgeTask(actor: TaskActorSlice, taskId: string): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");
    if (!canAcknowledgeTask(actor, toTaskAccessSlice(doc))) throw new Error("FORBIDDEN");

    const performer = doc.performers.find((p) => String(p.userId) === actor.userId);
    if (!performer) throw new Error("NOT_A_PERFORMER");

    performer.acknowledgedAt = new Date();
    doc.status = doc.status === "dispatched" ? "acknowledged" : doc.status;
    doc.markModified("performers");
    await doc.save();

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Performer submits a completion report with optional proof media.
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @param input - Report body.
   * @returns Updated task detail.
   */
  public static async submitReport(
    actor: TaskActorSlice,
    taskId: string,
    input: TaskReportInput,
  ): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");
    if (!canSubmitTaskReport(actor, toTaskAccessSlice(doc))) throw new Error("FORBIDDEN");

    const performer = doc.performers.find((p) => String(p.userId) === actor.userId);
    if (!performer) throw new Error("NOT_A_PERFORMER");

    performer.report = {
      description: input.description,
      media: input.media ?? [],
      submittedAt: new Date(),
    };
    doc.status = statusAfterTaskReport(doc.status);
    doc.markModified("performers");
    await doc.save();

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Author assigns scores to one or more performers and may complete the task.
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @param input - Score map by performer user id.
   * @param complete - When true, mark task completed after scoring.
   * @returns Updated task detail.
   */
  public static async scoreTask(
    actor: TaskActorSlice,
    taskId: string,
    input: TaskScoreInput,
    complete = true,
  ): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");
    if (!canScoreTask(actor, toTaskAccessSlice(doc))) throw new Error("FORBIDDEN");

    const category = await loadScoringCategoryForTask(doc);
    if (!category || !isBaseScoreAllowedForCategory(input.baseScore, category)) {
      throw new Error("INVALID_BASE_SCORE");
    }

    doc.baseScore = input.baseScore;

    for (const entry of input.scores) {
      const performer = doc.performers.find((p) => String(p.userId) === entry.userId);
      if (!performer) continue;

      performer.qualityPercent = entry.qualityPercent;
      performer.timePercent = entry.timePercent;
      performer.score = computeTaskPerformerFinalScore({
        baseScore: input.baseScore,
        qualityPercent: entry.qualityPercent,
        timePercent: entry.timePercent,
      });
    }

    if (complete) {
      const wasCompleted = doc.status === "completed";
      doc.status = statusAfterTaskCompletion(doc.status);
      if (!wasCompleted) {
        doc.completedAtHistory = [...(doc.completedAtHistory ?? []), new Date()];
      }
    }

    doc.markModified("performers");
    await doc.save();
    await syncTaskReminderSchedule(doc);
    if (doc.groupId) {
      await TaskGroupDomain.refreshGroupAggregate(String(doc.groupId));
    }

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Load persisted task delegation limits from General Rules.
   *
   * @returns Normalized per-tier delegation quotas.
   */
  public static async loadDelegationLimits(): Promise<Record<AccessLevelIndex, number | null>> {
    const doc = await GeneralRulesDomain.loadOrSeed();
    return normalizeTaskDelegationLimits(
      doc.taskDelegationLimits as Record<string, number | null> | undefined,
    );
  }

  /**
   * Load institutional task categories from general rules.
   *
   * @returns Normalized category catalog.
   */
  public static async loadTaskCategories(): Promise<TaskCategoryDefinition[]> {
    const doc = await GeneralRulesDomain.loadOrSeed();
    return normalizeTaskCategories(doc.taskCategories as TaskCategoryDefinition[]);
  }

  /**
   * Performer marks a task as in progress (start work).
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @returns Updated task detail.
   */
  public static async startTask(actor: TaskActorSlice, taskId: string): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");
    if (!canStartTask(actor, toTaskAccessSlice(doc))) throw new Error("FORBIDDEN");

    doc.status = "in_progress";
    await doc.save();

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Author reopens a completed task for redo while preserving completion history.
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @returns Updated task detail.
   */
  public static async reopenTask(actor: TaskActorSlice, taskId: string): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");
    if (!canReopenTask(actor, toTaskAccessSlice(doc))) throw new Error("FORBIDDEN");

    doc.status = "in_progress";
    await doc.save();
    await syncTaskReminderSchedule(doc);

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * Delegate/re-assign the task to an additional performer within quota limits.
   *
   * @param actor - Authenticated actor slice.
   * @param taskId - MongoDB task id.
   * @param input - New performer assignment.
   * @param limits - Optional delegation limits override (defaults to General Rules).
   * @returns Updated task detail.
   */
  public static async delegateTask(
    actor: TaskActorSlice,
    taskId: string,
    input: TaskDelegateInput,
    limits?: Record<AccessLevelIndex, number | null>,
  ): Promise<TaskDetailDto> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) throw new Error("TASK_NOT_FOUND");

    const resolvedLimits = limits ?? (await TaskDomain.loadDelegationLimits());

    if (!canDelegateTask(actor, toTaskAccessSlice(doc), resolvedLimits)) {
      throw new Error("DELEGATION_QUOTA_EXCEEDED");
    }

    const alreadyAssigned = doc.performers.some((p) => String(p.userId) === input.userId);
    if (alreadyAssigned) throw new Error("ALREADY_ASSIGNED");

    const [performer] = await resolvePerformers(
      [{ userId: input.userId, roleLabel: input.roleLabel }],
      actor.userId,
    );
    doc.performers.push(performer);
    doc.delegationCount = (doc.delegationCount ?? 0) + 1;
    doc.markModified("performers");
    await doc.save();

    return buildTaskDetailDto(doc, actor);
  }

  /**
   * List tasks assigned to a user for profile dashboard panels.
   *
   * @param userId - Target user id.
   * @param limit - Max rows.
   * @returns Assigned task rows sorted by due date.
   */
  public static async listAssignedTasksForUser(userId: string, limit = 10): Promise<TaskListRow[]> {
    await connectDB();
    const docs = await Task.find({
      "performers.userId": userId,
      status: { $nin: ["cancelled", "completed"] },
    })
      .sort({ dueAt: 1, updatedAt: -1 })
      .limit(limit);

    return docs.map(toTaskListRow);
  }

  /**
   * Count open tasks for profile stats.
   *
   * @param userId - Target user id.
   * @returns Number of non-completed assigned tasks.
   */
  public static async countOpenTasksForUser(userId: string): Promise<number> {
    await connectDB();
    return Task.countDocuments({
      "performers.userId": userId,
      status: { $nin: ["cancelled", "completed"] },
    });
  }

  /**
   * Load task metrics and recent work for profile dashboard panels.
   *
   * @param userId - Profile owner id.
   * @returns Snapshot for stats, activity column, and task summaries.
   */
  public static async getProfileTaskSnapshot(userId: string): Promise<ProfileTaskSnapshot> {
    await connectDB();

    const performerFilter = { "performers.userId": userId };
    const openStatusFilter = { status: { $nin: ["cancelled", "completed"] as TaskStatus[] } };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [openDocs, completedLast30Days, activeGroupCount, statusAgg] = await Promise.all([
      Task.find({ ...performerFilter, ...openStatusFilter })
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean(),
      Task.countDocuments({
        ...performerFilter,
        status: "completed",
        updatedAt: { $gte: thirtyDaysAgo },
      }),
      TaskGroup.countDocuments({
        performerUserIds: userId,
        status: { $in: ["draft", "active"] as TaskGroupStatus[] },
      }),
      Task.aggregate<{ _id: TaskStatus; count: number }>([
        { $match: { ...performerFilter, ...openStatusFilter } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const openByStatus: Partial<Record<TaskStatus, number>> = {};
    for (const row of statusAgg) {
      openByStatus[row._id] = row.count;
    }

    const openCount = Object.values(openByStatus).reduce((sum, count) => sum + (count ?? 0), 0);

    return {
      openCount,
      openByStatus,
      recentOpenTasks: openDocs.map((doc) => toTaskListRow(doc as ITask)),
      completedLast30Days,
      activeGroupCount,
    };
  }

  /**
   * Mark overdue tasks when due date has passed.
   *
   * @param doc - Task document to evaluate.
   */
  public static async refreshOverdueStatus(doc: ITask): Promise<void> {
    if (shouldMarkTaskOverdue({ status: doc.status, dueAt: doc.dueAt })) {
      doc.status = "overdue";
      await doc.save();
    }
  }

  /**
   * Schedule an overdue check event for a task with a due date.
   *
   * @param doc - Task document.
   */
  public static async scheduleOverdueCheck(doc: ITask): Promise<void> {
    if (!doc.dueAt) return;
    const taskId = String(doc._id);
    await SchedulerDomain.scheduleEvent({
      eventType: SCHEDULED_EVENT_TYPES.task_overdue,
      dueAt: doc.dueAt,
      idempotencyKey: `task_overdue:${taskId}`,
      payload: { taskId },
    });
  }

  /**
   * Execute overdue transition from scheduler handler.
   *
   * @param taskId - MongoDB task id from payload.
   */
  public static async executeOverdue(taskId: string): Promise<void> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc) return;
    await TaskDomain.refreshOverdueStatus(doc);
  }

  /**
   * Execute periodic reminder from scheduler handler.
   *
   * @param taskId - MongoDB task id from payload.
   */
  public static async executeReminder(taskId: string): Promise<void> {
    await connectDB();
    const doc = await Task.findById(taskId);
    if (!doc || doc.status === "completed" || doc.status === "cancelled") return;
    if (!normalizeTaskReminderSettings(doc.reminderSettings).enabled) return;

    const firedAt = new Date();
    await dispatchTaskReminderDeliveries(doc, firedAt);
    await syncTaskReminderSchedule(doc);
  }

  /**
   * List active web reminder toasts for a signed-in performer.
   *
   * @param userId - Authenticated user id.
   * @param limit - Maximum number of toasts.
   * @returns Newest-first reminder toast payloads.
   */
  public static async getActiveWebReminderToastsForUser(
    userId: string,
    limit = 5,
  ): Promise<ActiveWebTaskReminderToast[]> {
    await connectDB();

    const user = await User.findById(userId).select("notificationChannels").lean();
    if (!user || !userAcceptsNotificationChannel(user.notificationChannels, "web")) {
      return [];
    }

    const rows = await TaskReminderNotification.find({
      userId,
      webChannel: true,
      webDismissedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean();

    const output: ActiveWebTaskReminderToast[] = [];

    for (const row of rows) {
      if (output.length >= limit) break;

      if (row.kind === "group" && row.groupId) {
        const group = await TaskGroup.findById(row.groupId).select("status").lean();
        if (!group || group.status === "completed" || group.status === "cancelled") {
          await TaskReminderNotification.updateOne(
            { _id: row._id },
            { $set: { webDismissedAt: new Date() } },
          );
          continue;
        }

        output.push({
          id: String(row._id),
          kind: "group",
          taskId: null,
          groupId: String(row.groupId),
          ruleId: null,
          title: row.title,
          body: row.body,
          variant: row.variant,
          createdAt: row.createdAt,
        });
        continue;
      }

      if (row.kind === "institutional") {
        output.push({
          id: String(row._id),
          kind: "institutional",
          taskId: row.taskId ? String(row.taskId) : null,
          groupId: null,
          ruleId: row.ruleId ? String(row.ruleId) : null,
          title: row.title,
          body: row.body,
          variant: row.variant,
          createdAt: row.createdAt,
        });
        continue;
      }

      if (!row.taskId) continue;

      const task = await Task.findById(row.taskId).select("status").lean();
      if (!task || task.status === "completed" || task.status === "cancelled") {
        await TaskReminderNotification.updateOne(
          { _id: row._id },
          { $set: { webDismissedAt: new Date() } },
        );
        continue;
      }

      output.push({
        id: String(row._id),
        kind: "task",
        taskId: String(row.taskId),
        groupId: row.groupId ? String(row.groupId) : null,
        ruleId: null,
        title: row.title,
        body: row.body,
        variant: row.variant,
        createdAt: row.createdAt,
      });
    }

    return output;
  }

  /**
   * Dismiss a task reminder web toast for the current user.
   *
   * @param userId - Authenticated user id.
   * @param notificationId - Reminder notification document id.
   */
  public static async dismissWebReminderToast(userId: string, notificationId: string): Promise<void> {
    await connectDB();

    const updated = await TaskReminderNotification.findOneAndUpdate(
      { _id: notificationId, userId, webChannel: true },
      { $set: { webDismissedAt: new Date() } },
    );

    if (!updated) {
      throw new Error("NOTIFICATION_NOT_FOUND");
    }

    await NotificationDomain.markReadByDeliveryKey(
      userId,
      buildInboxDeliveryKey("task_reminder", updated.deliveryKey),
    ).catch(() => undefined);
  }
}
