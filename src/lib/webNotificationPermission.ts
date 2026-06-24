/**
 * @fileoverview Browser Notification API helpers for Nexus web alerts.
 *
 * @module src/lib/webNotificationPermission
 */

/** Why the native browser prompt cannot appear. */
export type BrowserNotificationBlockReason =
  | "unsupported"
  | "insecure_context"
  | "already_denied"
  | "already_granted";

/**
 * Whether the browser exposes the Notification API in a secure context.
 *
 * @returns True when native permission can be requested.
 */
export function browserNotificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window
  );
}

/**
 * Explain why the OS/browser permission sheet may not open.
 *
 * @returns Block reason, or null when {@link Notification.requestPermission} may run.
 */
export function getBrowserNotificationBlockReason(): BrowserNotificationBlockReason | null {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  if (!window.isSecureContext || !("Notification" in window)) {
    return window.isSecureContext ? "unsupported" : "insecure_context";
  }

  if (Notification.permission === "denied") {
    return "already_denied";
  }

  if (Notification.permission === "granted") {
    return "already_granted";
  }

  return null;
}

/**
 * Read the current browser notification permission when supported.
 *
 * @returns Permission state, or `"denied"` when unsupported.
 */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (!browserNotificationsSupported()) {
    return "denied";
  }

  return Notification.permission;
}

/**
 * Request native browser notification permission.
 *
 * Must be invoked synchronously from a user click/tap handler — do not `await`
 * anything before calling this function or some browsers skip the permission sheet.
 *
 * @returns Resulting permission state.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!browserNotificationsSupported()) {
    return "denied";
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

/**
 * Fire a one-shot confirmation notification after permission is granted.
 */
export function showBrowserNotificationEnabledTest(): void {
  if (!browserNotificationsSupported() || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification("Nexus notifications enabled", {
      body: "You will receive alerts for tasks and institution messages.",
      tag: "nexus-notification-enabled",
    });
  } catch {
    // Some browsers require a service worker for Notification construction — ignore.
  }
}
