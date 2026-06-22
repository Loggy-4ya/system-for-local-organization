/**
 * @fileoverview User-level notification delivery preferences.
 *
 * @module shared/constants/userNotificationSettings
 */

import type { TaskReminderChannel } from "@shared/constants/taskSettings";

/** Default channels for new users — in-app / browser web notifications. */
export const DEFAULT_USER_NOTIFICATION_CHANNELS: TaskReminderChannel[] = ["web"];

/** Profile settings helper — delivery channel choice. */
export const USER_NOTIFICATION_CHANNELS_HINT =
  "Choose how Nexus reaches you for task reminders and institution messages: on the web, in Telegram, or both.";

/** Post-auth prompt body — points users to profile settings for later changes. */
export const WEB_NOTIFICATION_PROMPT_BODY =
  "Allow browser notifications so Nexus can alert you about tasks and announcements even when this tab is in the background. You can choose web, Telegram, or both in profile settings.";

/** Telegram channel note when the account is not linked. */
export const USER_NOTIFICATION_TELEGRAM_LINK_HINT =
  "Link Telegram under Connected accounts to receive Telegram notifications.";

/** Shown when permission was granted (including if it was already granted). */
export const WEB_NOTIFICATION_PROMPT_GRANTED_HINT =
  "Browser notifications are enabled for this site.";

/** Shown when the user previously blocked notifications — browser will not ask again. */
export const WEB_NOTIFICATION_PROMPT_DENIED_HINT =
  "This site is blocked from sending notifications. Open your browser’s site settings (lock icon in the address bar) and allow notifications for Nexus, then try again.";

/** Shown when not on HTTPS / localhost — Notification API is unavailable. */
export const WEB_NOTIFICATION_PROMPT_INSECURE_HINT =
  "Browser notifications require HTTPS or localhost. Open Nexus via https:// or http://localhost instead of a plain HTTP LAN address.";

/** Shown when the browser does not support web notifications. */
export const WEB_NOTIFICATION_PROMPT_UNSUPPORTED_HINT =
  "This browser does not support web notifications on this device.";
