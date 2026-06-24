/**
 * @fileoverview Fixed toast stack wrapper for site-wide in-app notifications.
 *
 * @module src/components/notifications/SiteNotificationToastStack
 */

"use client";

import { SiteBroadcastToastHost } from "@/components/notifications/SiteBroadcastToastHost";
import { SiteClientToastHost } from "@/components/notifications/SiteClientToastHost";
import { TaskReminderToastHost } from "@/components/notifications/TaskReminderToastHost";

/**
 * Shared fixed-position stack for broadcast and task reminder toasts.
 *
 * @returns Notification toast stack JSX.
 */
export function SiteNotificationToastStack() {
  return (
    <div className="site-notification-toast-stack" aria-live="polite">
      <SiteClientToastHost />
      <TaskReminderToastHost />
      <SiteBroadcastToastHost />
    </div>
  );
}

export default SiteNotificationToastStack;
