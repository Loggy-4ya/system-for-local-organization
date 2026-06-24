/**
 * @fileoverview Institutional yearly calendar rules — role-targeted infinite recurrence.
 *
 * @module shared/domains/InstitutionalCalendarDomain
 *
 * Tests: `npm run test:institutional-calendar-domain`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import {
  DEFAULT_INSTITUTIONAL_TASK_TEMPLATE,
  type InstitutionalCalendarAction,
} from "@shared/constants/institutionalCalendar";
import { INSTITUTIONAL_CALENDAR_RULE_COUNT_LIMIT } from "@shared/validation/institutionalCalendarSchemas";
import { SCHEDULED_EVENT_TYPES } from "@shared/constants/scheduledEventTypes";
import {
  computeNextYearlyAnchorAt,
  interpolateInstitutionalCalendarTemplate,
  normalizeYearlyAnchors,
  userMatchesInstitutionalCalendarTarget,
  type InstitutionalCalendarUserSlice,
} from "@shared/lib/institutionalCalendarLogic";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";
import InstitutionalCalendarRule, {
  type IInstitutionalCalendarRule,
} from "@shared/models/InstitutionalCalendarRule";
import TaskReminderNotification from "@shared/models/TaskReminderNotification";
import User, { type IUser } from "@shared/models/User";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { TelegramBotDomain } from "@shared/domains/TelegramBotDomain";
import {
  buildInboxDeliveryKey,
  mapTaskReminderKindToInboxKind,
} from "@shared/lib/notificationInboxLogic";
import type { NotificationInboxChannel } from "@shared/constants/notificationInbox";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import { TaskDomain, buildTaskActor } from "@shared/domains/TaskDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import type {
  InstitutionalCalendarCreateInput,
  InstitutionalCalendarUpdateInput,
} from "@shared/validation/institutionalCalendarSchemas";

/** Public DTO for admin list/detail. */
export interface InstitutionalCalendarRuleDto {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  action: InstitutionalCalendarAction;
  yearlyAnchors: IInstitutionalCalendarRule["yearlyAnchors"];
  targetSociumKinds: IInstitutionalCalendarRule["targetSociumKinds"];
  targetSociumRoleKeys: IInstitutionalCalendarRule["targetSociumRoleKeys"];
  targetAccessLevelIndexes: IInstitutionalCalendarRule["targetAccessLevelIndexes"];
  channels: IInstitutionalCalendarRule["channels"];
  taskTemplate: IInstitutionalCalendarRule["taskTemplate"];
  authorUserId: string;
  authorDisplayName: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert a rule document to a public DTO.
 *
 * @param doc - Mongoose rule document.
 * @returns Admin API payload.
 */
function toRuleDto(doc: IInstitutionalCalendarRule): InstitutionalCalendarRuleDto {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description ?? "",
    enabled: doc.enabled,
    action: doc.action,
    yearlyAnchors: normalizeYearlyAnchors(doc.yearlyAnchors),
    targetSociumKinds: doc.targetSociumKinds ?? [],
    targetSociumRoleKeys: doc.targetSociumRoleKeys ?? [],
    targetAccessLevelIndexes: doc.targetAccessLevelIndexes ?? [],
    channels: doc.channels ?? ["web"],
    taskTemplate: doc.taskTemplate ?? { ...DEFAULT_INSTITUTIONAL_TASK_TEMPLATE },
    authorUserId: String(doc.authorUserId),
    authorDisplayName: doc.authorDisplayName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Resolve display label for a user document.
 *
 * @param user - User document.
 * @returns Display label.
 */
function displayNameForUser(user: IUser): string {
  return (
    resolveUserDisplayLabel({
      name: user.name,
      surname: user.surname,
      login: user.login,
    }) ?? user.name
  );
}

/**
 * Build user slice for calendar targeting.
 *
 * @param user - MongoDB user document.
 * @returns Targeting slice.
 */
function toCalendarUserSlice(user: IUser): InstitutionalCalendarUserSlice {
  return {
    userId: String(user._id),
    accessLevelIndex: user.accessLevelIndex,
    sociumRoles: (user.sociumRoles ?? []).map((role) => ({
      kind: role.kind,
      roleKey: role.roleKey,
    })),
  };
}

/**
 * Load users matching a rule's socium and access filters.
 *
 * @param rule - Calendar rule document.
 * @returns Matching active users.
 */
async function resolveRuleRecipients(rule: IInstitutionalCalendarRule): Promise<IUser[]> {
  const target = {
    targetSociumKinds: rule.targetSociumKinds ?? [],
    targetSociumRoleKeys: rule.targetSociumRoleKeys ?? [],
    targetAccessLevelIndexes: rule.targetAccessLevelIndexes ?? [],
  };

  const filter: Record<string, unknown> = {};

  if (target.targetAccessLevelIndexes.length > 0) {
    filter.accessLevelIndex = { $in: target.targetAccessLevelIndexes };
  }

  if (target.targetSociumKinds.length > 0 || target.targetSociumRoleKeys.length > 0) {
    const sociumOr: Record<string, unknown>[] = [];
    if (target.targetSociumKinds.length > 0) {
      sociumOr.push({ "sociumRoles.kind": { $in: target.targetSociumKinds } });
    }
    if (target.targetSociumRoleKeys.length > 0) {
      sociumOr.push({ "sociumRoles.roleKey": { $in: target.targetSociumRoleKeys } });
    }
    filter.$or = sociumOr;
  }

  const users = await User.find(filter).lean();
  return users.filter((user) =>
    userMatchesInstitutionalCalendarTarget(toCalendarUserSlice(user as IUser), target),
  ) as IUser[];
}

/**
 * Schedule or refresh the next fire for one calendar rule.
 *
 * @param rule - Persisted rule document.
 */
async function syncRuleSchedule(rule: IInstitutionalCalendarRule): Promise<void> {
  const ruleId = String(rule._id);
  const idempotencyKey = `institutional_calendar:${ruleId}`;

  if (!rule.enabled) {
    await SchedulerDomain.cancelEvent(idempotencyKey).catch(() => undefined);
    return;
  }

  const anchors = normalizeYearlyAnchors(rule.yearlyAnchors);
  const nextAt = computeNextYearlyAnchorAt(anchors, new Date());
  if (!nextAt) {
    await SchedulerDomain.cancelEvent(idempotencyKey).catch(() => undefined);
    return;
  }

  await SchedulerDomain.scheduleEvent({
    eventType: SCHEDULED_EVENT_TYPES.institutional_calendar,
    dueAt: nextAt,
    idempotencyKey,
    payload: { ruleId },
  });
}

/**
 * Deliver web/Telegram notifications for one institutional calendar fire.
 *
 * @param rule - Rule document.
 * @param user - Target user.
 * @param firedAt - Fire instant.
 * @param year - Interpolation year.
 * @param taskId - Optional spawned task id for deep link.
 */
async function dispatchInstitutionalNotification(
  rule: IInstitutionalCalendarRule,
  user: IUser,
  firedAt: Date,
  year: number,
  taskId?: string | null,
): Promise<void> {
  const wantsWeb = rule.channels.includes("web");
  const wantsTelegram = rule.channels.includes("telegram");
  if (!wantsWeb && !wantsTelegram) return;

  const userId = String(user._id);
  const deliveryKey = `${String(rule._id)}:${year}:${firedAt.toISOString()}:${userId}`;
  const title = interpolateInstitutionalCalendarTemplate(rule.title, year);
  const body =
    rule.description.trim() ||
    interpolateInstitutionalCalendarTemplate(rule.taskTemplate.description, year);

  let notification = await TaskReminderNotification.findOne({ userId, deliveryKey });
  if (!notification) {
    notification = await TaskReminderNotification.create({
      kind: "institutional",
      ruleId: rule._id,
      taskId: taskId ? taskId : null,
      groupId: null,
      userId,
      deliveryKey,
      title,
      body,
      variant: "info",
      webChannel: wantsWeb,
      webDismissedAt: wantsWeb ? null : new Date(),
      telegramDeliveredAt: null,
      telegramError: null,
    });
  }

  const path = taskId ? `/tasks/${taskId}` : "/tasks";
  const inboxChannels: NotificationInboxChannel[] = [
    ...(wantsWeb ? (["web"] as const) : []),
    ...(wantsTelegram ? (["telegram"] as const) : []),
  ];
  if (inboxChannels.length > 0) {
    await NotificationDomain.recordNotification({
      userId,
      kind: mapTaskReminderKindToInboxKind("institutional"),
      deliveryKey: buildInboxDeliveryKey("task_reminder", deliveryKey),
      title,
      body,
      variant: "info",
      actionHref: path,
      sourceId: String(notification._id),
      channels: [...inboxChannels],
    }).catch(() => undefined);
  }

  if (!wantsTelegram || user.telegramId == null) {
    if (wantsTelegram && user.telegramId == null) {
      await TaskReminderNotification.updateOne(
        { _id: notification._id },
        { $set: { telegramError: "User has no linked Telegram account." } },
      );
    }
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    await TaskReminderNotification.updateOne(
      { _id: notification._id },
      { $set: { telegramError: "TELEGRAM_BOT_TOKEN is not configured." } },
    );
    return;
  }

  try {
    await TelegramBotDomain.sendDirectMessage(botToken, user.telegramId, `${title}\n\n${body}\n\n${path}`);
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

/**
 * Institutional yearly calendar domain engine.
 */
export class InstitutionalCalendarDomain {
  /**
   * List all calendar rules for the admin editor.
   *
   * @returns Rule rows sorted by title.
   */
  public static async listRules(): Promise<InstitutionalCalendarRuleDto[]> {
    await connectDB();
    const docs = await InstitutionalCalendarRule.find().sort({ title: 1 });
    return docs.map(toRuleDto);
  }

  /**
   * Fetch one rule by id.
   *
   * @param ruleId - MongoDB rule id.
   * @returns Rule DTO.
   */
  public static async getRule(ruleId: string): Promise<InstitutionalCalendarRuleDto> {
    await connectDB();
    const doc = await InstitutionalCalendarRule.findById(ruleId);
    if (!doc) throw new Error("RULE_NOT_FOUND");
    return toRuleDto(doc);
  }

  /**
   * Create a calendar rule and schedule its next fire.
   *
   * @param author - Admin user document.
   * @param input - Validated create payload.
   * @returns Created rule DTO.
   */
  public static async createRule(
    author: IUser,
    input: InstitutionalCalendarCreateInput,
  ): Promise<InstitutionalCalendarRuleDto> {
    await connectDB();

    const count = await InstitutionalCalendarRule.countDocuments();
    if (count >= INSTITUTIONAL_CALENDAR_RULE_COUNT_LIMIT) {
      throw new Error("RULE_LIMIT_EXCEEDED");
    }

    const doc = await InstitutionalCalendarRule.create({
      title: input.title.trim(),
      description: input.description ?? "",
      enabled: input.enabled,
      action: input.action,
      yearlyAnchors: input.yearlyAnchors,
      targetSociumKinds: input.targetSociumKinds,
      targetSociumRoleKeys: input.targetSociumRoleKeys,
      targetAccessLevelIndexes: input.targetAccessLevelIndexes,
      channels: input.channels,
      taskTemplate: input.taskTemplate ?? { ...DEFAULT_INSTITUTIONAL_TASK_TEMPLATE },
      authorUserId: author._id,
      authorDisplayName: displayNameForUser(author),
    });

    await syncRuleSchedule(doc);
    return toRuleDto(doc);
  }

  /**
   * Update a calendar rule and refresh its scheduler entry.
   *
   * @param ruleId - MongoDB rule id.
   * @param input - Validated patch payload.
   * @returns Updated rule DTO.
   */
  public static async updateRule(
    ruleId: string,
    input: InstitutionalCalendarUpdateInput,
  ): Promise<InstitutionalCalendarRuleDto> {
    await connectDB();
    const doc = await InstitutionalCalendarRule.findById(ruleId);
    if (!doc) throw new Error("RULE_NOT_FOUND");

    if (input.title != null) doc.title = input.title.trim();
    if (input.description != null) doc.description = input.description;
    if (input.enabled != null) doc.enabled = input.enabled;
    if (input.action != null) doc.action = input.action;
    if (input.yearlyAnchors != null) doc.yearlyAnchors = input.yearlyAnchors;
    if (input.targetSociumKinds != null) doc.targetSociumKinds = input.targetSociumKinds;
    if (input.targetSociumRoleKeys != null) doc.targetSociumRoleKeys = input.targetSociumRoleKeys;
    if (input.targetAccessLevelIndexes != null) {
      doc.targetAccessLevelIndexes = input.targetAccessLevelIndexes;
    }
    if (input.channels != null) doc.channels = input.channels;
    if (input.taskTemplate != null) doc.taskTemplate = input.taskTemplate;

    await doc.save();
    await syncRuleSchedule(doc);
    return toRuleDto(doc);
  }

  /**
   * Delete a calendar rule and cancel its scheduler entry.
   *
   * @param ruleId - MongoDB rule id.
   */
  public static async deleteRule(ruleId: string): Promise<void> {
    await connectDB();
    const doc = await InstitutionalCalendarRule.findById(ruleId);
    if (!doc) throw new Error("RULE_NOT_FOUND");

    await InstitutionalCalendarRule.deleteOne({ _id: doc._id });
    await SchedulerDomain.cancelEvent(`institutional_calendar:${ruleId}`).catch(() => undefined);
  }

  /**
   * Execute one scheduler fire for a calendar rule.
   *
   * @param ruleId - MongoDB rule id from payload.
   */
  public static async executeRule(ruleId: string): Promise<void> {
    await connectDB();
    const rule = await InstitutionalCalendarRule.findById(ruleId);
    if (!rule || !rule.enabled) return;

    const firedAt = new Date();
    const year = firedAt.getFullYear();
    const recipients = await resolveRuleRecipients(rule);
    const author = await User.findById(rule.authorUserId);
    if (!author) return;

    const permissions = await AccessControlDomain.resolvePermissionsForUser(author);
    const taskActor = buildTaskActor(author, permissions);

    const shouldSpawn =
      rule.action === "spawn_task" || rule.action === "spawn_task_and_notify";
    const shouldNotify =
      rule.action === "notify_only" || rule.action === "spawn_task_and_notify";

    for (const user of recipients) {
      let spawnedTaskId: string | null = null;

      if (shouldSpawn) {
        const template = rule.taskTemplate ?? DEFAULT_INSTITUTIONAL_TASK_TEMPLATE;
        const task = await TaskDomain.createTask(taskActor, author, {
          title: interpolateInstitutionalCalendarTemplate(template.title, year),
          description: interpolateInstitutionalCalendarTemplate(template.description, year),
          tags: [],
          explanationMedia: [],
          performers: [{ userId: String(user._id) }],
          dispatch: template.dispatch,
        });
        spawnedTaskId = task.id;
      }

      if (shouldNotify) {
        await dispatchInstitutionalNotification(rule, user, firedAt, year, spawnedTaskId);
      }
    }

    await syncRuleSchedule(rule);
  }

  /**
   * Re-sync scheduler entries for all enabled rules (maintenance helper).
   */
  public static async resyncAllSchedules(): Promise<void> {
    await connectDB();
    const docs = await InstitutionalCalendarRule.find({ enabled: true });
    for (const doc of docs) {
      await syncRuleSchedule(doc);
    }
  }
}
