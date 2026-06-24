/**
 * @fileoverview Consolidated personal notification inbox domain engine.
 *
 * All producers upsert rows here; the notification center UI and future channel
 * dispatchers (Telegram, push, …) read from the same collection.
 *
 * @module shared/domains/NotificationDomain
 */

import connectDB from "@shared/lib/db";
import {
  DEFAULT_NOTIFICATION_INBOX_PAGE_SIZE,
  type NotificationInboxChannel,
  type NotificationInboxVariant,
  type UserNotificationKind,
} from "@shared/constants/notificationInbox";
import { BROADCAST_CHANNELS } from "@shared/constants/broadcastChannels";
import type { PaginatedListMeta } from "@shared/constants/listPagination";
import {
  buildInboxDeliveryKey,
  mapTaskReminderKindToInboxKind,
  normalizeNotificationInboxChannels,
} from "@shared/lib/notificationInboxLogic";
import {
  clampListPageSize,
  clampPageIndex,
  computeTotalPages,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";
import { userAcceptsNotificationChannel } from "@shared/lib/userNotificationSettingsLogic";
import User from "@shared/models/User";
import UserNotification, { type IUserNotification } from "@shared/models/UserNotification";
import SystemBroadcast from "@shared/models/SystemBroadcast";
import UserBroadcastReceipt from "@shared/models/UserBroadcastReceipt";
import TaskReminderNotification from "@shared/models/TaskReminderNotification";
import { notificationInboxListQuerySchema } from "@shared/validation/notificationInboxSchemas";

/** Input for {@link NotificationDomain.recordNotification}. */
export interface RecordUserNotificationInput {
  /** Recipient user id. */
  userId: string;
  /** Inbox category. */
  kind: UserNotificationKind;
  /** Unique upsert key within the user scope. */
  deliveryKey: string;
  /** Headline copy. */
  title: string;
  /** Body copy. */
  body: string;
  /** Visual tone. */
  variant: NotificationInboxVariant;
  /** Optional navigation target. */
  actionHref?: string | null;
  /** Optional source document id. */
  sourceId?: string | null;
  /** Intended delivery channels at creation time. */
  channels?: NotificationInboxChannel[];
}

/** Serializable inbox row for API clients. */
export interface NotificationInboxListItem {
  id: string;
  kind: UserNotificationKind;
  title: string;
  body: string;
  variant: NotificationInboxVariant;
  actionHref: string | null;
  sourceId: string | null;
  channels: NotificationInboxChannel[];
  readAt: string | null;
  createdAt: string;
}

/** Paginated inbox list response. */
export interface NotificationInboxListResult {
  items: NotificationInboxListItem[];
  unreadCount: number;
  meta: PaginatedListMeta;
}

/**
 * Personal notification inbox — durable per-user message history.
 */
export const NotificationDomain = {
  /**
   * Upsert one inbox row for a user (idempotent by `deliveryKey`).
   *
   * Does not overwrite `readAt` when the row already exists.
   *
   * @param input - Notification payload.
   * @returns Persisted document id.
   */
  async recordNotification(input: RecordUserNotificationInput): Promise<string> {
    await connectDB();

    const channels = normalizeNotificationInboxChannels(input.channels);
    const row = await UserNotification.findOneAndUpdate(
      { userId: input.userId, deliveryKey: input.deliveryKey },
      {
        $set: {
          kind: input.kind,
          title: input.title.trim(),
          body: input.body.trim(),
          variant: input.variant,
          actionHref: input.actionHref?.trim() || null,
          sourceId: input.sourceId?.trim() || null,
          channels,
        },
        $setOnInsert: {
          userId: input.userId,
          deliveryKey: input.deliveryKey,
          readAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return String(row._id);
  },

  /**
   * Mark one inbox row read for the current user.
   *
   * @param userId - Authenticated user id.
   * @param notificationId - Inbox document id.
   */
  async markRead(userId: string, notificationId: string): Promise<void> {
    await connectDB();

    const updated = await UserNotification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { readAt: new Date() } },
    );

    if (!updated) {
      throw new Error("NOTIFICATION_NOT_FOUND");
    }
  },

  /**
   * Mark all inbox rows read for a user.
   *
   * @param userId - Authenticated user id.
   * @returns Number of rows updated.
   */
  async markAllRead(userId: string): Promise<number> {
    await connectDB();

    const result = await UserNotification.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } },
    );

    return result.modifiedCount ?? 0;
  },

  /**
   * Mark a row read by delivery key (toast dismiss sync).
   *
   * @param userId - Authenticated user id.
   * @param deliveryKey - Stable delivery key.
   */
  async markReadByDeliveryKey(userId: string, deliveryKey: string): Promise<void> {
    await connectDB();

    await UserNotification.updateOne(
      { userId, deliveryKey },
      { $set: { readAt: new Date() } },
    );
  },

  /**
   * Count unread inbox rows for header badge polling.
   *
   * @param userId - Authenticated user id.
   * @returns Unread count after legacy backfill.
   */
  async getUnreadCount(userId: string): Promise<number> {
    await connectDB();
    await backfillLegacyInboxForUser(userId);

    return UserNotification.countDocuments({ userId, readAt: null });
  },

  /**
   * Paginated inbox list for `/profile/notifications`.
   *
   * @param userId - Authenticated user id.
   * @param query - Page, limit, and unread filter.
   * @returns Rows, unread count, and pagination meta.
   */
  async listForUser(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {},
  ): Promise<NotificationInboxListResult> {
    await connectDB();
    await backfillLegacyInboxForUser(userId);

    const parsed = notificationInboxListQuerySchema.parse({
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly ? "true" : "false",
    });

    const limit = clampListPageSize(parsed.limit, DEFAULT_NOTIFICATION_INBOX_PAGE_SIZE);
    const filter: Record<string, unknown> = { userId };
    if (parsed.unreadOnly) {
      filter.readAt = null;
    }

    const totalCount = await UserNotification.countDocuments(filter);
    const totalPages = computeTotalPages(totalCount, limit);
    const page = clampPageIndex(parsed.page, totalPages);
    const skip = pageToSkip(page, limit);

    const rows = await UserNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const unreadCount = await UserNotification.countDocuments({ userId, readAt: null });

    return {
      items: rows.map(toInboxListItem),
      unreadCount,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  },

  /**
   * Record inbox rows for every web-eligible user when a broadcast is sent.
   *
   * @param broadcastId - Created broadcast id.
   * @param title - Optional headline.
   * @param body - Message body.
   * @param variant - Toast tone.
   */
  async recordBroadcastInboxRows(
    broadcastId: string,
    title: string | null,
    body: string,
    variant: NotificationInboxVariant,
  ): Promise<void> {
    await connectDB();

    const deliveryKey = buildInboxDeliveryKey("broadcast", broadcastId);
    const users = await User.find({}).select("_id notificationChannels").lean();
    const ops = [];

    for (const user of users) {
      if (!userAcceptsNotificationChannel(user.notificationChannels, "web")) continue;

      ops.push({
        updateOne: {
          filter: { userId: String(user._id), deliveryKey },
          update: {
            $set: {
              kind: "broadcast" as const,
              title: title?.trim() || "Institution message",
              body: body.trim(),
              variant,
              actionHref: null,
              sourceId: broadcastId,
              channels: ["web"] as NotificationInboxChannel[],
            },
            $setOnInsert: {
              userId: String(user._id),
              deliveryKey,
              readAt: null,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length > 0) {
      await UserNotification.bulkWrite(ops, { ordered: false });
    }
  },
};

/**
 * Map a lean MongoDB document to API list item.
 *
 * @param row - Lean inbox document.
 * @returns Serializable list item.
 */
function toInboxListItem(row: Pick<
  IUserNotification,
  "_id" | "kind" | "title" | "body" | "variant" | "actionHref" | "sourceId" | "channels" | "readAt" | "createdAt"
>): NotificationInboxListItem {
  return {
    id: String(row._id),
    kind: row.kind,
    title: row.title,
    body: row.body,
    variant: row.variant,
    actionHref: row.actionHref,
    sourceId: row.sourceId,
    channels: normalizeNotificationInboxChannels(row.channels),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Import undismissed legacy broadcasts and task reminders into the inbox (idempotent).
 *
 * @param userId - Authenticated user id.
 */
async function backfillLegacyInboxForUser(userId: string): Promise<void> {
  const user = await User.findById(userId).select("notificationChannels").lean();
  if (!user || !userAcceptsNotificationChannel(user.notificationChannels, "web")) {
    return;
  }

  const now = new Date();

  const dismissedBroadcasts = await UserBroadcastReceipt.find({
    userId,
    webDismissedAt: { $ne: null },
  })
    .select("broadcastId")
    .lean();
  const dismissedBroadcastIds = dismissedBroadcasts.map((row) => row.broadcastId);

  const activeBroadcasts = await SystemBroadcast.find({
    channels: BROADCAST_CHANNELS.web_toast,
    _id: { $nin: dismissedBroadcastIds },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .select("_id title body variant createdAt")
    .lean();

  const broadcastOps = activeBroadcasts.map((row) => {
    const broadcastId = String(row._id);
    const deliveryKey = buildInboxDeliveryKey("broadcast", broadcastId);
    return {
      updateOne: {
        filter: { userId, deliveryKey },
        update: {
          $set: {
            kind: "broadcast" as const,
            title: row.title?.trim() || "Institution message",
            body: row.body,
            variant: row.variant as NotificationInboxVariant,
            actionHref: null,
            sourceId: broadcastId,
            channels: ["web"] as NotificationInboxChannel[],
          },
          $setOnInsert: {
            userId,
            deliveryKey,
            readAt: null,
            createdAt: row.createdAt,
          },
        },
        upsert: true,
      },
    };
  });

  const reminderRows = await TaskReminderNotification.find({
    userId,
    webChannel: true,
    webDismissedAt: null,
  })
    .select("_id kind deliveryKey title body variant taskId groupId ruleId createdAt")
    .lean();

  const reminderOps = reminderRows.map((row) => {
    const deliveryKey = buildInboxDeliveryKey("task_reminder", row.deliveryKey);
    const actionHref = row.groupId
      ? `/task-groups/${String(row.groupId)}`
      : row.taskId
        ? `/tasks/${String(row.taskId)}`
        : row.ruleId
          ? "/tasks"
          : null;

    return {
      updateOne: {
        filter: { userId, deliveryKey },
        update: {
          $set: {
            kind: mapTaskReminderKindToInboxKind(row.kind),
            title: row.title,
            body: row.body,
            variant: row.variant as NotificationInboxVariant,
            actionHref,
            sourceId: String(row._id),
            channels: ["web"] as NotificationInboxChannel[],
          },
          $setOnInsert: {
            userId,
            deliveryKey,
            readAt: null,
            createdAt: row.createdAt,
          },
        },
        upsert: true,
      },
    };
  });

  const ops = [...broadcastOps, ...reminderOps];
  if (ops.length > 0) {
    await UserNotification.bulkWrite(ops, { ordered: false });
  }
}

export default NotificationDomain;
