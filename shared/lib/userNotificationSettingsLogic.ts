/**
 * @fileoverview Normalization and filtering for user notification channel preferences.
 *
 * Tests: `tests/shared/lib/userNotificationSettingsLogic.test.ts` — `npm run test:user-notification-settings`
 *
 * @module shared/lib/userNotificationSettingsLogic
 */

import { DEFAULT_USER_NOTIFICATION_CHANNELS } from "@shared/constants/userNotificationSettings";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";

const VALID_CHANNELS: TaskReminderChannel[] = ["web", "telegram"];

/**
 * Normalize persisted user notification channels — always at least one valid channel.
 *
 * @param value - Raw MongoDB or API value.
 * @returns Sanitized channel list.
 */
export function normalizeUserNotificationChannels(
  value: unknown,
): TaskReminderChannel[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_USER_NOTIFICATION_CHANNELS];
  }

  const seen = new Set<TaskReminderChannel>();
  for (const entry of value) {
    if (entry === "web" || entry === "telegram") {
      seen.add(entry);
    }
  }

  if (seen.size === 0) {
    return [...DEFAULT_USER_NOTIFICATION_CHANNELS];
  }

  return VALID_CHANNELS.filter((channel) => seen.has(channel));
}

/**
 * Whether a user accepts deliveries on a given channel.
 *
 * @param userChannels - User preference list.
 * @param channel - Channel to test.
 * @returns True when the channel is enabled for the user.
 */
export function userAcceptsNotificationChannel(
  userChannels: unknown,
  channel: TaskReminderChannel,
): boolean {
  return normalizeUserNotificationChannels(userChannels).includes(channel);
}

/**
 * Intersect task/broadcast channel intent with user preferences.
 *
 * @param requested - Channels requested by the task or broadcast.
 * @param userChannels - User preference list.
 * @returns Channels allowed for this user.
 */
export function intersectNotificationChannels(
  requested: TaskReminderChannel[],
  userChannels: unknown,
): TaskReminderChannel[] {
  const user = normalizeUserNotificationChannels(userChannels);
  return requested.filter((channel) => user.includes(channel));
}
