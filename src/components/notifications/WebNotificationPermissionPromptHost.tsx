/**
 * @fileoverview Post-auth dialog prompting browser notification permission.
 *
 * @module src/components/notifications/WebNotificationPermissionPromptHost
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  WEB_NOTIFICATION_PROMPT_BODY,
  WEB_NOTIFICATION_PROMPT_DENIED_HINT,
  WEB_NOTIFICATION_PROMPT_GRANTED_HINT,
  WEB_NOTIFICATION_PROMPT_INSECURE_HINT,
  WEB_NOTIFICATION_PROMPT_UNSUPPORTED_HINT,
} from "@shared/constants/userNotificationSettings";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";
import {
  browserNotificationsSupported,
  getBrowserNotificationBlockReason,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotificationEnabledTest,
} from "@/lib/webNotificationPermission";

/** API response from GET /api/notifications/web-prompt. */
interface WebPromptState {
  needsPrompt: boolean;
  notificationChannels: TaskReminderChannel[];
  hasLinkedTelegram: boolean;
}

const AUTH_ROUTES = new Set(["/login", "/signup"]);

/**
 * Map permission / environment state to inline dialog feedback.
 *
 * @param permission - Current Notification.permission value.
 * @returns User-facing hint, or null when waiting for user action.
 */
function feedbackForPermission(permission: NotificationPermission): string | null {
  const blockReason = getBrowserNotificationBlockReason();

  if (blockReason === "insecure_context") {
    return WEB_NOTIFICATION_PROMPT_INSECURE_HINT;
  }

  if (blockReason === "unsupported") {
    return WEB_NOTIFICATION_PROMPT_UNSUPPORTED_HINT;
  }

  if (permission === "granted" || blockReason === "already_granted") {
    return WEB_NOTIFICATION_PROMPT_GRANTED_HINT;
  }

  if (permission === "denied" || blockReason === "already_denied") {
    return WEB_NOTIFICATION_PROMPT_DENIED_HINT;
  }

  return null;
}

/**
 * Shows a one-time notification permission dialog after sign-in or registration.
 *
 * @returns Dialog host or null when unauthenticated / unsupported / already answered.
 */
export function WebNotificationPermissionPromptHost() {
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [supported] = useState(() => browserNotificationsSupported());

  const recordOutcome = useCallback(
    async (outcome: "enabled" | "dismissed", browserPermission?: NotificationPermission) => {
      if (!session?.user?.id) return;

      await fetch("/api/notifications/web-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          browserPermission,
        }),
      }).catch(() => undefined);
    },
    [session?.user?.id],
  );

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || !supported) {
      return;
    }

    if (AUTH_ROUTES.has(pathname)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/notifications/web-prompt");
      if (!res.ok || cancelled) return;

      const state = (await res.json()) as WebPromptState;
      if (cancelled || !state.needsPrompt) return;

      const permission = getBrowserNotificationPermission();

      // Browser already allowed alerts — persist once and skip the dialog.
      if (permission === "granted") {
        await recordOutcome("enabled", permission);
        return;
      }

      setFeedback(feedbackForPermission(permission));
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, pathname, supported, recordOutcome]);

  /** Close dialog and persist dismiss outcome. */
  async function handleDismiss() {
    setOpen(false);
    setFeedback(null);
    await recordOutcome("dismissed", Notification.permission);
  }

  /**
   * Request browser permission from the click handler, then persist the outcome.
   *
   * Permission must be requested before any React state update — otherwise Chrome
   * may not show the native allow/block sheet.
   */
  function handleEnable() {
    const permissionPromise = requestBrowserNotificationPermission();

    void permissionPromise.then(async (permission) => {
      setLoading(true);
      try {
        const hint = feedbackForPermission(permission);
        setFeedback(hint);

        if (permission === "granted") {
          showBrowserNotificationEnabledTest();
          setOpen(false);
          await recordOutcome("enabled", permission);
          setFeedback(null);
          return;
        }

        if (permission === "denied") {
          await recordOutcome("enabled", permission);
          return;
        }

        await recordOutcome("enabled", permission);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    });
  }

  if (status !== "authenticated" || !supported) {
    return null;
  }

  const blockedBeforeClick = getBrowserNotificationBlockReason();
  const showBlockedHint =
    feedback != null &&
    (blockedBeforeClick === "already_denied" ||
      blockedBeforeClick === "insecure_context" ||
      blockedBeforeClick === "unsupported" ||
      feedback.includes("blocked"));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && void handleDismiss()}>
      <DialogContent className="border-(--color-border-default) bg-(--color-bg-panel) text-(--color-text-primary) sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-(--color-text-primary)">
            Enable web notifications?
          </DialogTitle>
          <DialogDescription className="text-(--color-text-secondary)">
            {WEB_NOTIFICATION_PROMPT_BODY}
          </DialogDescription>
        </DialogHeader>

        {feedback && (
          <FormAlert variant={feedback.includes("enabled") ? "success" : "error"}>
            {feedback}
          </FormAlert>
        )}

        <p className="text-sm leading-relaxed text-(--color-text-secondary)">
          Open{" "}
          <Link
            href="/profile/settings#notifications"
            className={cn(
              "font-medium text-(--color-accent-user) no-underline transition-colors",
              "hover:text-[color-mix(in_srgb,var(--color-accent-user)_82%,white)] hover:underline hover:underline-offset-[3px]",
              "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-user)/40 focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg-panel)",
            )}
            onClick={() => setOpen(false)}
          >
            profile settings
          </Link>{" "}
          anytime to choose web, Telegram, or both.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void handleDismiss()}>
            {showBlockedHint ? "Close" : "Not now"}
          </Button>
          <Button type="button" disabled={loading} onClick={handleEnable}>
            {loading
              ? "Requesting…"
              : blockedBeforeClick === "already_denied"
                ? "Try again"
                : blockedBeforeClick === "already_granted"
                  ? "Already allowed"
                  : "Allow notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WebNotificationPermissionPromptHost;
