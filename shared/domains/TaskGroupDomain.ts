/**
 * @fileoverview Consolidated task group domain — multi-part projects and long-run reminders.
 *
 * @module shared/domains/TaskGroupDomain
 *
 * Tests: `npm run test:task-group-domain`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import {
  DEFAULT_TASK_GROUP_REMINDER_SETTINGS,
  type TaskGroupStatus,
  type TaskStatus,
} from "@shared/constants/taskSettings";
import { SCHEDULED_EVENT_TYPES } from "@shared/constants/scheduledEventTypes";
import type { PaginatedListMeta } from "@shared/constants/listPagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import {
  canAddTasksToGroup,
  canCreateTaskGroup,
  canEditTaskGroup,
  canListTaskGroups,
  canViewTaskGroup,
  type TaskGroupAccessSlice,
} from "@shared/lib/taskGroupAccessLogic";
import {
  OPEN_TASK_STATUSES,
  shouldCompleteTaskGroup,
  statusAfterGroupActivation,
} from "@shared/lib/taskGroupStatusLogic";
import { normalizePageCategoryList } from "@shared/lib/pageCategoryLogic";
import { sanitizeNexusEditorHtml } from "@shared/lib/nexusRichTextSanitize";
import {
  clampListPageSize,
  clampPageIndex,
  computeTotalPages,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";
import {
  computeNextTaskReminderAt,
  normalizeTaskReminderSettings,
} from "@shared/lib/taskReminderLogic";
import { buildTaskGroupReminderNotificationCopy } from "@shared/lib/taskGroupReminderNotificationCopy";
import {
  buildInboxDeliveryKey,
  mapTaskReminderKindToInboxKind,
} from "@shared/lib/notificationInboxLogic";
import type { NotificationInboxChannel } from "@shared/constants/notificationInbox";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import { canCreateTask, type TaskActorSlice } from "@shared/lib/taskAccessLogic";
import Task from "@shared/models/Task";
import { mergeGroupPerformerUserIds, dedupeTaskGroupRosterInputs } from "@shared/lib/taskGroupRosterLogic";
import TaskGroup, { type ITaskGroup, type ITaskGroupRosterMember } from "@shared/models/TaskGroup";
import TaskReminderNotification from "@shared/models/TaskReminderNotification";
import User, { type IUser } from "@shared/models/User";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { TelegramBotDomain } from "@shared/domains/TelegramBotDomain";
import {
  TelegramWorkspaceDomain,
  toTaskGroupTelegramWorkspaceDto,
  type TaskGroupTelegramWorkspaceDto,
} from "@shared/domains/TelegramWorkspaceDomain";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";
import type {
  TaskGroupCreateInput,
  TaskGroupListQuery,
  TaskGroupUpdateInput,
} from "@shared/validation/taskGroupSchemas";
import type { TelegramWorkspaceStrategy } from "@shared/constants/telegramWorkspace";
import { Types } from "mongoose";

/** Public list row for task group manager UI. */
export interface TaskGroupListRow {
  id: string;
  title: string;
  status: TaskGroupStatus;
  dueAt: Date | null;
  tags: string[];
  authorUserId: string;
  authorDisplayName: string;
  taskCount: number;
  openTaskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Child task summary on group detail. */
export interface TaskGroupChildRow {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt: Date | null;
  performerCount: number;
  telegramForumTopicId: number | null;
}

/** Planned project team member on group detail. */
export interface TaskGroupRosterRow {
  userId: string;
  displayName: string;
  avatar: string | null;
  roleLabel: string | null;
}

/** Public task group detail DTO. */
export interface TaskGroupDetailDto extends TaskGroupListRow {
  description: string;
  completedAtHistory: Date[];
  reminderSettings: ITaskGroup["reminderSettings"];
  telegramWorkspace: TaskGroupTelegramWorkspaceDto;
  roster: TaskGroupRosterRow[];
  tasks: TaskGroupChildRow[];
}

/**
 * Resolve display label for a user document.
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
 * Build access slice from a group document and optional performer override.
 *
 * @param doc - Task group document.
 * @param performerUserIds - Optional performer id override.
 * @returns Access slice for pure helpers.
 */
function toGroupAccessSlice(doc: ITaskGroup, performerUserIds?: string[]): TaskGroupAccessSlice {
  return {
    authorUserId: String(doc.authorUserId),
    status: doc.status,
    performerUserIds:
      performerUserIds ?? (doc.performerUserIds ?? []).map((id) => String(id)),
  };
}

/**
 * Count open child tasks for a group id.
 *
 * @param groupId - MongoDB group id.
 * @returns Number of non-terminal child tasks.
 */
async function countOpenTasksForGroup(groupId: string): Promise<number> {
  return Task.countDocuments({
    groupId,
    status: { $in: OPEN_TASK_STATUSES },
  });
}

/**
 * Load child task rows for a group detail view.
 *
 * @param groupId - MongoDB group id.
 * @returns Child task summary rows sorted by updatedAt desc.
 */
async function loadChildTasksForGroup(groupId: string): Promise<TaskGroupChildRow[]> {
  const docs = await Task.find({ groupId }).sort({ updatedAt: -1 }).lean();
  return docs.map((doc) => ({
    id: String(doc._id),
    title: doc.title,
    status: doc.status as TaskStatus,
    dueAt: doc.dueAt ?? null,
    performerCount: doc.performers?.length ?? 0,
    telegramForumTopicId: doc.telegramForumTopicId ?? null,
  }));
}

/**
 * Collect performer user ids assigned on child tasks only.
 *
 * @param groupId - MongoDB group id.
 * @returns Distinct performer user id strings from task parts.
 */
async function collectChildTaskPerformerIds(groupId: string): Promise<string[]> {
  const docs = await Task.find({ groupId }).select("performers.userId").lean();
  const ids = new Set<string>();
  for (const doc of docs) {
    for (const performer of doc.performers ?? []) {
      ids.add(String(performer.userId));
    }
  }
  return [...ids];
}

/**
 * Resolve union of planned roster and child-task performers for access and Telegram.
 *
 * @param groupId - MongoDB group id.
 * @returns Distinct performer user id strings.
 */
async function resolveGroupPerformerUserIds(groupId: string): Promise<string[]> {
  await connectDB();
  const doc = await TaskGroup.findById(groupId).select("plannedRoster").lean();
  const rosterIds = (doc?.plannedRoster ?? []).map((row) => String(row.userId));
  const childIds = await collectChildTaskPerformerIds(groupId);
  return mergeGroupPerformerUserIds(rosterIds, childIds);
}

/**
 * Extract roster user ids from a loaded group document.
 *
 * @param doc - Task group document.
 * @returns Roster user id strings.
 */
function rosterUserIdsFromDoc(doc: ITaskGroup): string[] {
  return (doc.plannedRoster ?? []).map((row) => String(row.userId));
}

/**
 * Recompute {@link ITaskGroup.performerUserIds} from roster + child task performers.
 *
 * @param doc - Mutable group document.
 * @param childTaskPerformerUserIds - Performer ids from child tasks.
 */
function applyMergedPerformerUserIds(doc: ITaskGroup, childTaskPerformerUserIds: string[]): void {
  const merged = mergeGroupPerformerUserIds(
    rosterUserIdsFromDoc(doc),
    childTaskPerformerUserIds,
  );
  doc.performerUserIds = merged.map((id) => new Types.ObjectId(id));
}

/**
 * Resolve planned roster rows from user ids and optional role labels.
 *
 * @param rosterInputs - API roster payload.
 * @returns Persisted roster subdocuments.
 */
async function resolvePlannedRoster(
  rosterInputs: Array<{ userId: string; roleLabel?: string }>,
): Promise<ITaskGroupRosterMember[]> {
  const deduped = dedupeTaskGroupRosterInputs(rosterInputs);
  if (deduped.length === 0) return [];

  const users = await User.find({ _id: { $in: deduped.map((row) => row.userId) } }).lean();
  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const now = new Date();

  return deduped.map((input) => {
    const user = userMap.get(input.userId);
    return {
      userId: new Types.ObjectId(input.userId),
      displayName: displayNameForUser(user as IUser | null),
      avatar: user?.avatar ?? null,
      roleLabel: input.roleLabel,
      addedAt: now,
    };
  });
}

/**
 * Map stored roster subdocuments to API rows.
 *
 * @param doc - Task group document.
 * @returns Public roster rows.
 */
function toGroupRosterRows(doc: ITaskGroup): TaskGroupRosterRow[] {
  return (doc.plannedRoster ?? []).map((row) => ({
    userId: String(row.userId),
    displayName: row.displayName,
    avatar: row.avatar ?? null,
    roleLabel: row.roleLabel ?? null,
  }));
}

/** @deprecated Use {@link collectChildTaskPerformerIds} or {@link resolveGroupPerformerUserIds}. */
async function aggregateGroupPerformerIds(groupId: string): Promise<string[]> {
  return resolveGroupPerformerUserIds(groupId);
}

/**
 * Convert a group document into a list row with counts.
 *
 * @param doc - Mongoose group document.
 * @param taskCount - Total child tasks.
 * @param openTaskCount - Open child tasks.
 * @returns Slim list row.
 */
function toGroupListRow(
  doc: ITaskGroup,
  taskCount: number,
  openTaskCount: number,
): TaskGroupListRow {
  return {
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
    dueAt: doc.dueAt ?? null,
    tags: doc.tags ?? [],
    authorUserId: String(doc.authorUserId),
    authorDisplayName: doc.authorDisplayName,
    taskCount,
    openTaskCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Convert a group document into a detail DTO.
 *
 * @param doc - Mongoose group document.
 * @param tasks - Child task rows.
 * @returns Full detail payload.
 */
function toGroupDetail(
  doc: ITaskGroup,
  tasks: TaskGroupChildRow[],
  telegramWorkspace: TaskGroupTelegramWorkspaceDto,
): TaskGroupDetailDto {
  const openTaskCount = tasks.filter(
    (task) => task.status !== "completed" && task.status !== "cancelled",
  ).length;

  return {
    ...toGroupListRow(doc, tasks.length, openTaskCount),
    description: doc.description ?? "",
    completedAtHistory: doc.completedAtHistory ?? [],
    reminderSettings: normalizeTaskReminderSettings(doc.reminderSettings),
    telegramWorkspace,
    roster: toGroupRosterRows(doc),
    tasks,
  };
}

/**
 * Build a detail DTO including live Telegram workspace metadata.
 *
 * @param doc - Group document.
 * @param tasks - Child task rows.
 * @returns Detail DTO.
 */
async function buildGroupDetail(
  doc: ITaskGroup,
  tasks: TaskGroupChildRow[],
): Promise<TaskGroupDetailDto> {
  const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
  const telegramWorkspace = toTaskGroupTelegramWorkspaceDto(
    doc,
    settings,
    process.env.NEXTAUTH_URL,
  );
  return toGroupDetail(doc, tasks, telegramWorkspace);
}

/**
 * Schedule or refresh long-run group reminder events.
 *
 * @param group - Persisted group document.
 */
async function syncGroupReminderSchedule(group: ITaskGroup): Promise<void> {
  const settings = normalizeTaskReminderSettings(group.reminderSettings);
  const groupId = String(group._id);
  const idempotencyKey = `task_group_reminder:${groupId}`;

  if (
    !settings.enabled ||
    group.status === "completed" ||
    group.status === "cancelled" ||
    group.status === "draft"
  ) {
    await SchedulerDomain.cancelEvent(idempotencyKey).catch(() => undefined);
    return;
  }

  const openCount = await countOpenTasksForGroup(groupId);
  if (openCount === 0) {
    await SchedulerDomain.cancelEvent(idempotencyKey).catch(() => undefined);
    return;
  }

  const nextAt = computeNextTaskReminderAt(settings, { taskDueAt: group.dueAt ?? null });
  if (!nextAt) {
    await SchedulerDomain.cancelEvent(idempotencyKey).catch(() => undefined);
    return;
  }

  await SchedulerDomain.scheduleEvent({
    eventType: SCHEDULED_EVENT_TYPES.task_group_reminder,
    dueAt: nextAt,
    idempotencyKey,
    payload: { groupId },
  });
}

/**
 * Deliver consolidated web toasts and Telegram DMs for one group reminder fire.
 *
 * @param group - Group document that fired a reminder.
 * @param firedAt - Scheduler fire instant used for dedupe keys.
 */
async function dispatchGroupReminderDeliveries(group: ITaskGroup, firedAt: Date): Promise<void> {
  const settings = normalizeTaskReminderSettings(group.reminderSettings);
  const wantsWeb = settings.channels.includes("web");
  const wantsTelegram = settings.channels.includes("telegram");
  if (!wantsWeb && !wantsTelegram) return;

  const groupId = String(group._id);
  const openTasks = await Task.find({
    groupId,
    status: { $in: OPEN_TASK_STATUSES },
  })
    .select("_id title performers.userId")
    .lean();

  if (openTasks.length === 0) return;

  const tasksByPerformer = new Map<string, Array<{ id: string; title: string }>>();

  for (const task of openTasks) {
    for (const performer of task.performers ?? []) {
      const userId = String(performer.userId);
      const list = tasksByPerformer.get(userId) ?? [];
      list.push({ id: String(task._id), title: task.title });
      tasksByPerformer.set(userId, list);
    }
  }

  const deliveryKey = `${groupId}:${firedAt.toISOString()}`;
  const groupPath = `/task-groups/${groupId}`;

  const telegramUsers =
    wantsTelegram
      ? await User.find({ _id: { $in: [...tasksByPerformer.keys()] } })
          .select("_id telegramId")
          .lean()
      : [];
  const telegramByUser = new Map(
    telegramUsers.map((row) => [String(row._id), row.telegramId as number | null | undefined]),
  );

  const botToken = wantsTelegram ? process.env.TELEGRAM_BOT_TOKEN?.trim() : undefined;

  for (const [userId, performerTasks] of tasksByPerformer) {
    const copy = buildTaskGroupReminderNotificationCopy(
      group.title,
      performerTasks,
      group.dueAt,
    );

    let notification = await TaskReminderNotification.findOne({ userId, deliveryKey });

    if (!notification) {
      notification = await TaskReminderNotification.create({
        kind: "group",
        groupId: group._id,
        taskId: null,
        userId,
        deliveryKey,
        title: copy.title,
        body: copy.body,
        variant: copy.variant,
        webChannel: wantsWeb,
        webDismissedAt: wantsWeb ? null : new Date(),
        telegramDeliveredAt: null,
        telegramError: null,
      });
    }

    const inboxChannels: NotificationInboxChannel[] = [
      ...(wantsWeb ? (["web"] as const) : []),
      ...(wantsTelegram ? (["telegram"] as const) : []),
    ];
    if (inboxChannels.length > 0) {
      await NotificationDomain.recordNotification({
        userId,
        kind: mapTaskReminderKindToInboxKind("group"),
        deliveryKey: buildInboxDeliveryKey("task_reminder", deliveryKey),
        title: copy.title,
        body: copy.body,
        variant: copy.variant,
        actionHref: groupPath,
        sourceId: String(notification._id),
        channels: [...inboxChannels],
      }).catch(() => undefined);
    }

    if (!wantsTelegram) continue;

    const telegramId = telegramByUser.get(userId);
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
      const telegramText = `${copy.title}\n\n${copy.body}\n\n${groupPath}`;
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
 * Consolidated task group management domain engine.
 */
export class TaskGroupDomain {
  /**
   * List task groups visible to the actor with pagination.
   *
   * @param actor - Authenticated actor slice.
   * @param query - List filters and pagination.
   * @returns Paginated group rows.
   */
  public static async listTaskGroups(
    actor: TaskActorSlice,
    query: TaskGroupListQuery,
  ): Promise<{ groups: TaskGroupListRow[]; meta: PaginatedListMeta }> {
    if (!canListTaskGroups(actor)) {
      throw new Error("FORBIDDEN");
    }

    await connectDB();

    const limit = clampListPageSize(query.limit, DEFAULT_LIST_PAGE_SIZE);
    const filter: Record<string, unknown> = {};
    const canDispatch = canCreateTask(actor);

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }

    if (query.scope === "authored") {
      filter.authorUserId = actor.userId;
    } else if (query.scope === "involved") {
      filter.performerUserIds = actor.userId;
    } else if (!canDispatch) {
      filter.$or = [
        { authorUserId: actor.userId },
        { performerUserIds: actor.userId },
      ];
    }

    const totalCount = await TaskGroup.countDocuments(filter);
    const totalPages = computeTotalPages(totalCount, limit);
    const page = clampPageIndex(query.page, totalPages);

    const docs = await TaskGroup.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pageToSkip(page, limit))
      .limit(limit);

    const groups: TaskGroupListRow[] = [];
    for (const doc of docs) {
      const groupId = String(doc._id);
      const taskCount = await Task.countDocuments({ groupId });
      const openTaskCount = await countOpenTasksForGroup(groupId);
      groups.push(toGroupListRow(doc, taskCount, openTaskCount));
    }

    return {
      groups,
      meta: { page, limit, totalCount, totalPages },
    };
  }

  /**
   * Fetch one task group by id when the actor may view it.
   *
   * @param actor - Authenticated actor slice.
   * @param groupId - MongoDB group id.
   * @returns Group detail DTO with child tasks.
   */
  public static async getTaskGroup(
    actor: TaskActorSlice,
    groupId: string,
  ): Promise<TaskGroupDetailDto> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) throw new Error("GROUP_NOT_FOUND");

    const performerUserIds = await resolveGroupPerformerUserIds(groupId);
    if (!canViewTaskGroup(actor, toGroupAccessSlice(doc, performerUserIds))) {
      throw new Error("FORBIDDEN");
    }

    const tasks = await loadChildTasksForGroup(groupId);
    return buildGroupDetail(doc, tasks);
  }

  /**
   * Create a new multi-part task group.
   *
   * @param actor - Authenticated actor slice.
   * @param author - Author user document.
   * @param input - Validated create payload.
   * @returns Created group detail.
   */
  public static async createTaskGroup(
    actor: TaskActorSlice,
    author: IUser,
    input: TaskGroupCreateInput,
  ): Promise<TaskGroupDetailDto> {
    if (!canCreateTaskGroup(actor)) throw new Error("FORBIDDEN");

    await connectDB();

    const reminderSettings = normalizeTaskReminderSettings(
      input.reminderSettings ?? DEFAULT_TASK_GROUP_REMINDER_SETTINGS,
    );
    const status: TaskGroupStatus = input.activate ? "active" : "draft";
    const plannedRoster = await resolvePlannedRoster(input.roster ?? []);

    const doc = await TaskGroup.create({
      title: input.title.trim(),
      description: sanitizeNexusEditorHtml(input.description ?? ""),
      status,
      tags: normalizePageCategoryList(input.tags),
      dueAt: input.dueAt ?? null,
      completedAtHistory: [],
      authorUserId: author._id,
      authorDisplayName: displayNameForUser(author),
      reminderSettings,
      plannedRoster,
      performerUserIds: plannedRoster.map((member) => member.userId),
    });

    await syncGroupReminderSchedule(doc);

    if (status === "active") {
      await TelegramWorkspaceDomain.syncWorkspaceForGroup(
        String(doc._id),
        plannedRoster.length,
      );
    }

    return buildGroupDetail(doc, []);
  }

  /**
   * Update task group fields when the actor may edit.
   *
   * @param actor - Authenticated actor slice.
   * @param groupId - MongoDB group id.
   * @param input - Validated patch payload.
   * @returns Updated group detail.
   */
  public static async updateTaskGroup(
    actor: TaskActorSlice,
    groupId: string,
    input: TaskGroupUpdateInput,
  ): Promise<TaskGroupDetailDto> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) throw new Error("GROUP_NOT_FOUND");

    const performerUserIds = await resolveGroupPerformerUserIds(groupId);
    if (!canEditTaskGroup(actor, toGroupAccessSlice(doc, performerUserIds))) {
      throw new Error("FORBIDDEN");
    }

    if (input.title != null) doc.title = input.title.trim();
    if (input.description != null) doc.description = sanitizeNexusEditorHtml(input.description);
    if (input.dueAt !== undefined) doc.dueAt = input.dueAt;
    if (input.tags != null) doc.tags = normalizePageCategoryList(input.tags);
    if (input.reminderSettings != null) {
      doc.reminderSettings = normalizeTaskReminderSettings(input.reminderSettings);
    }
    if (input.roster != null) {
      doc.plannedRoster = await resolvePlannedRoster(input.roster);
      const childIds = await collectChildTaskPerformerIds(groupId);
      applyMergedPerformerUserIds(doc, childIds);
    }

    let workspaceAction: "none" | "provision" | "dismantle" = "none";

    if (input.status != null) {
      const previousStatus = doc.status;
      doc.status = input.status;
      if (input.status === "completed") {
        doc.completedAtHistory = [...(doc.completedAtHistory ?? []), new Date()];
      }
      if (input.status === "completed" || input.status === "cancelled") {
        workspaceAction = "dismantle";
      } else if (input.status === "active" && previousStatus !== "active") {
        workspaceAction = "provision";
      }
    }

    if (input.title != null) {
      await Task.updateMany({ groupId }, { $set: { groupTitle: doc.title } });
    }

    await doc.save();
    await syncGroupReminderSchedule(doc);

    if (input.roster != null && doc.status === "active") {
      await TelegramWorkspaceDomain.syncWorkspaceForGroup(groupId, doc.performerUserIds.length);
      await TelegramWorkspaceDomain.syncOperatorMembersForGroup(groupId);
    }

    if (workspaceAction === "dismantle") {
      await TelegramWorkspaceDomain.queueDismantleForGroup(groupId);
    } else if (workspaceAction === "provision") {
      const performerCount = input.roster != null
        ? doc.performerUserIds.length
        : performerUserIds.length;
      await TelegramWorkspaceDomain.syncWorkspaceForGroup(groupId, performerCount);
    }

    const tasks = await loadChildTasksForGroup(groupId);
    return buildGroupDetail(doc, tasks);
  }

  /**
   * Cancel a task group (soft delete via status).
   *
   * @param actor - Authenticated actor slice.
   * @param groupId - MongoDB group id.
   * @returns Cancelled group detail.
   */
  public static async cancelTaskGroup(
    actor: TaskActorSlice,
    groupId: string,
  ): Promise<TaskGroupDetailDto> {
    return TaskGroupDomain.updateTaskGroup(actor, groupId, { status: "cancelled" });
  }

  /**
   * Resolve a group for attaching a child task.
   *
   * @param actor - Authenticated actor slice.
   * @param groupId - MongoDB group id.
   * @returns Group title and id when attach is permitted.
   */
  public static async resolveGroupForTaskAttach(
    actor: TaskActorSlice,
    groupId: string,
  ): Promise<{ id: string; title: string }> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) throw new Error("GROUP_NOT_FOUND");

    const performerUserIds = await resolveGroupPerformerUserIds(groupId);
    if (!canAddTasksToGroup(actor, toGroupAccessSlice(doc, performerUserIds))) {
      throw new Error("FORBIDDEN");
    }

    if (doc.status === "draft") {
      doc.status = statusAfterGroupActivation(doc.status);
      await doc.save();
      await syncGroupReminderSchedule(doc);
      await TelegramWorkspaceDomain.syncWorkspaceForGroup(String(doc._id), performerUserIds.length);
    }

    return { id: String(doc._id), title: doc.title };
  }

  /**
   * Refresh aggregated performers and auto-complete group when all parts are done.
   *
   * @param groupId - MongoDB group id from a child task mutation.
   */
  public static async refreshGroupAggregate(groupId: string | null | undefined): Promise<void> {
    if (!groupId) return;

    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) return;

    const childDocs = await Task.find({ groupId }).select("status performers.userId").lean();
    const childStatuses = childDocs.map((row) => row.status as TaskStatus);
    const childPerformerIds: string[] = [];
    for (const child of childDocs) {
      for (const performer of child.performers ?? []) {
        childPerformerIds.push(String(performer.userId));
      }
    }

    applyMergedPerformerUserIds(doc, childPerformerIds);

    const performerCount = doc.performerUserIds.length;

    const completing = shouldCompleteTaskGroup(doc.status, childStatuses);

    if (completing) {
      doc.status = "completed";
      doc.completedAtHistory = [...(doc.completedAtHistory ?? []), new Date()];
    }

    await doc.save();
    await syncGroupReminderSchedule(doc);

    if (completing) {
      await TelegramWorkspaceDomain.queueDismantleForGroup(groupId);
    } else if (doc.status === "active") {
      await TelegramWorkspaceDomain.syncWorkspaceForGroup(groupId, performerCount);
      await TelegramWorkspaceDomain.syncOperatorMembersForGroup(groupId);
    }
  }

  /**
   * Execute periodic group reminder from scheduler handler.
   *
   * @param groupId - MongoDB group id from payload.
   */
  public static async executeGroupReminder(groupId: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc || doc.status === "completed" || doc.status === "cancelled" || doc.status === "draft") {
      return;
    }
    if (!normalizeTaskReminderSettings(doc.reminderSettings).enabled) return;

    const openCount = await countOpenTasksForGroup(groupId);
    if (openCount === 0) {
      await syncGroupReminderSchedule(doc);
      return;
    }

    const firedAt = new Date();
    await dispatchGroupReminderDeliveries(doc, firedAt);
    await syncGroupReminderSchedule(doc);
  }

  /**
   * Patch Telegram workspace strategy for one project.
   *
   * @param actor - Authenticated actor slice.
   * @param groupId - MongoDB group id.
   * @param input - Strategy patch.
   * @returns Updated group detail.
   */
  public static async patchTelegramWorkspace(
    actor: TaskActorSlice,
    groupId: string,
    input: { strategy?: TelegramWorkspaceStrategy; requeue?: boolean },
  ): Promise<TaskGroupDetailDto> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) throw new Error("GROUP_NOT_FOUND");

    const performerUserIds = await resolveGroupPerformerUserIds(groupId);
    const slice = toGroupAccessSlice(doc, performerUserIds);

    await TelegramWorkspaceDomain.updateProjectWorkspace(
      actor,
      groupId,
      input,
      slice,
      performerUserIds.length,
    );

    return TaskGroupDomain.getTaskGroup(actor, groupId);
  }

  /**
   * List active groups for task create picker (authored + active/draft).
   *
   * @param actor - Authenticated actor slice.
   * @returns Selectable group options.
   */
  public static async listGroupsForTaskPicker(
    actor: TaskActorSlice,
  ): Promise<Array<{ id: string; title: string; status: TaskGroupStatus }>> {
    if (!canCreateTask(actor)) return [];

    await connectDB();
    const docs = await TaskGroup.find({
      authorUserId: actor.userId,
      status: { $in: ["draft", "active"] },
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select("title status")
      .lean();

    return docs.map((doc) => ({
      id: String(doc._id),
      title: doc.title,
      status: doc.status as TaskGroupStatus,
    }));
  }
}
