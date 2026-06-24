/**
 * @fileoverview Consolidated system broadcast domain engine.
 *
 * Sends institution-wide messages through web toasts, Telegram direct messages,
 * and future channels registered in {@link BROADCAST_CHANNELS}.
 *
 * @module shared/domains/BroadcastDomain
 */

import connectDB from "@shared/lib/db";
import User from "@shared/models/User";
import SystemBroadcast, {
  type BroadcastToastVariant,
  type ISystemBroadcast,
} from "@shared/models/SystemBroadcast";
import UserBroadcastReceipt from "@shared/models/UserBroadcastReceipt";
import {
  BROADCAST_CHANNELS,
  type BroadcastChannel,
  isBroadcastChannel,
} from "@shared/constants/broadcastChannels";
import { sendBroadcastSchema, type SendBroadcastInput } from "@shared/validation/broadcastSchemas";
import { TelegramBotDomain } from "@shared/domains/TelegramBotDomain";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { formatTelegramBroadcastMessage } from "@shared/lib/telegramBroadcastFormat";
import { userAcceptsNotificationChannel } from "@shared/lib/userNotificationSettingsLogic";
import { buildInboxDeliveryKey } from "@shared/lib/notificationInboxLogic";
import { NotificationDomain } from "@shared/domains/NotificationDomain";

/** Input for creating and dispatching a broadcast. */
export interface SendBroadcastRequest extends SendBroadcastInput {}

/** Public web toast payload for authenticated clients. */
export interface ActiveWebBroadcastToast {
  id: string;
  title: string | null;
  body: string;
  variant: BroadcastToastVariant;
  createdAt: Date;
}

/** Result summary returned from {@link BroadcastDomain.sendBroadcast}. */
export interface SendBroadcastResult {
  broadcastId: string;
  deliveryStats: ISystemBroadcast["deliveryStats"];
}

/**
 * System broadcast domain — create messages and dispatch across channels.
 */
export const BroadcastDomain = {
  /**
   * Send a message to all users through the requested delivery channels.
   *
   * @param input - Validated broadcast payload.
   * @param actorUserId - Administrator user id performing the send.
   * @returns Created broadcast id and delivery statistics.
   */
  async sendBroadcast(input: SendBroadcastRequest, actorUserId: string): Promise<SendBroadcastResult> {
    await connectDB();
    await GeneralRulesDomain.ensureLoaded();

    const parsed = sendBroadcastSchema.parse(input);
    const channels = normalizeChannels(parsed.channels);

    const broadcast = await SystemBroadcast.create({
      title: parsed.title,
      body: parsed.body,
      variant: parsed.variant,
      channels,
      createdByUserId: actorUserId,
      expiresAt: parsed.expiresAt ?? null,
    });

    const totalUsers = await User.countDocuments({});
    const telegramUsers = channels.includes(BROADCAST_CHANNELS.telegram_dm)
      ? await User.find({ telegramId: { $ne: null } }).select("_id telegramId notificationChannels").lean()
      : [];

    let telegramSent = 0;
    let telegramFailed = 0;

    if (channels.includes(BROADCAST_CHANNELS.telegram_dm)) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (!botToken) {
        throw new Error("TELEGRAM_BOT_TOKEN is not configured — cannot send Telegram broadcasts.");
      }

      const telegramText = formatTelegramBroadcastMessage(parsed.title, parsed.body);

      for (const row of telegramUsers) {
        if (row.telegramId == null) continue;
        if (!userAcceptsNotificationChannel(row.notificationChannels, "telegram")) continue;

        try {
          await TelegramBotDomain.sendDirectMessage(botToken, row.telegramId, telegramText);
          telegramSent += 1;
          await UserBroadcastReceipt.updateOne(
            { broadcastId: broadcast._id, userId: String(row._id) },
            {
              $set: { telegramDeliveredAt: new Date(), telegramError: null },
              $setOnInsert: { webDismissedAt: null },
            },
            { upsert: true },
          );
        } catch (err) {
          telegramFailed += 1;
          const message = err instanceof Error ? err.message : "Telegram delivery failed.";
          await UserBroadcastReceipt.updateOne(
            { broadcastId: broadcast._id, userId: String(row._id) },
            {
              $set: { telegramError: message },
              $setOnInsert: { webDismissedAt: null, telegramDeliveredAt: null },
            },
            { upsert: true },
          );
        }
      }
    }

    const deliveryStats = {
      totalUsers,
      webToastEligible: channels.includes(BROADCAST_CHANNELS.web_toast) ? totalUsers : 0,
      telegramEligible: telegramUsers.length,
      telegramSent,
      telegramFailed,
    };

    broadcast.deliveryStats = deliveryStats;
    await broadcast.save();

    if (channels.includes(BROADCAST_CHANNELS.web_toast)) {
      await NotificationDomain.recordBroadcastInboxRows(
        String(broadcast._id),
        parsed.title,
        parsed.body,
        parsed.variant,
      ).catch(() => undefined);
    }

    return {
      broadcastId: String(broadcast._id),
      deliveryStats,
    };
  },

  /**
   * List active web toast broadcasts not yet dismissed by the user.
   *
   * @param userId - Authenticated user id.
   * @param limit - Maximum number of toasts to return.
   * @returns Newest-first toast payloads.
   */
  async getActiveWebToastsForUser(userId: string, limit = 5): Promise<ActiveWebBroadcastToast[]> {
    await connectDB();

    const user = await User.findById(userId).select("notificationChannels").lean();
    if (!user || !userAcceptsNotificationChannel(user.notificationChannels, "web")) {
      return [];
    }

    const now = new Date();
    const dismissed = await UserBroadcastReceipt.find({
      userId,
      webDismissedAt: { $ne: null },
    })
      .select("broadcastId")
      .lean();

    const dismissedIds = dismissed.map((row) => row.broadcastId);

    const broadcasts = await SystemBroadcast.find({
      channels: BROADCAST_CHANNELS.web_toast,
      _id: { $nin: dismissedIds },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return broadcasts.map((row) => ({
      id: String(row._id),
      title: row.title,
      body: row.body,
      variant: row.variant,
      createdAt: row.createdAt,
    }));
  },

  /**
   * Dismiss a web toast for the current user.
   *
   * @param userId - Authenticated user id.
   * @param broadcastId - Broadcast document id.
   */
  async dismissWebToast(userId: string, broadcastId: string): Promise<void> {
    await connectDB();

    const exists = await SystemBroadcast.exists({ _id: broadcastId });
    if (!exists) {
      throw new Error("Broadcast not found.");
    }

    await UserBroadcastReceipt.updateOne(
      { broadcastId, userId },
      { $set: { webDismissedAt: new Date() } },
      { upsert: true },
    );

    await NotificationDomain.markReadByDeliveryKey(
      userId,
      buildInboxDeliveryKey("broadcast", broadcastId),
    ).catch(() => undefined);
  },
};

/**
 * Deduplicate and validate channel slugs.
 *
 * @param channels - Requested delivery channels.
 * @returns Normalised unique channel list.
 */
function normalizeChannels(channels: string[]): BroadcastChannel[] {
  const unique = [...new Set(channels)];
  for (const channel of unique) {
    if (!isBroadcastChannel(channel)) {
      throw new Error(`Unknown broadcast channel: ${channel}`);
    }
  }
  return unique;
}

export default BroadcastDomain;
