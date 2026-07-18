/**
 * @fileoverview Post-auth dialog prompting browser notification permission.
 *
 * @module src/components/notifications/WebNotificationPermissionPromptHost
 */

"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
import type { TaskReminderChannel } from "@shared/constants/taskSettings";
import {
  browserNotificationsSupported,
  getBrowserNotificationBlockReason,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotificationEnabledTest,
} from "@/lib/webNotificationPermission";
import { stripLocalePrefix } from "@/lib/localePathLogic";

/** API response from GET /api/notifications/web-prompt. */
interface WebPromptState {
  needsPrompt: boolean;
  notificationChannels: TaskReminderChannel[];
  hasLinkedTelegram: boolean;
}

const AUTH_ROUTES = new Set(["/login", "/signup"]);

type PermissionFeedbackKey = "granted" | "denied" | "insecure" | "unsupported";

/**
 * Map permission / environment state to inline dialog feedback key.
 *
 * @param permission - Current Notification.permission value.
 * @returns Feedback message key, or null when waiting for user action.
 */
function feedbackKeyForPermission(permission: NotificationPermission): PermissionFeedbackKey | null {
  const blockReason = getBrowserNotificationBlockReason();

  if (blockReason === "insecure_context") {
    return "insecure";
  }

  if (blockReason === "unsupported") {
    return "unsupported";
  }

  if (permission === "granted" || blockReason === "already_granted") {
    return "granted";
  }

  if (permission === "denied" || blockReason === "already_denied") {
    return "denied";
  }

  return null;
}

/**
 * Shows a one-time notification permission dialog after sign-in or registration.
 *
 * @returns Dialog host or null when unauthenticated / unsupported / already answered.
 */
export function WebNotificationPermissionPromptHost() {
  const tPerm = useTranslations("notifications.permission");
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackKey, setFeedbackKey] = useState<PermissionFeedbackKey | null>(null);
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

    const pathWithoutLocale = stripLocalePrefix(pathname);
    if (AUTH_ROUTES.has(pathWithoutLocale)) {
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

      setFeedbackKey(feedbackKeyForPermission(permission));
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, pathname, supported, recordOutcome]);

  /** Close dialog and persist dismiss outcome. */
  async function handleDismiss() {
    setOpen(false);
    setFeedbackKey(null);
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
        const key = feedbackKeyForPermission(permission);
        setFeedbackKey(key);

        if (permission === "granted") {
          showBrowserNotificationEnabledTest();
          setOpen(false);
          await recordOutcome("enabled", permission);
          setFeedbackKey(null);
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
    feedbackKey != null &&
    (blockedBeforeClick === "already_denied" ||
      blockedBeforeClick === "insecure_context" ||
      blockedBeforeClick === "unsupported" ||
      feedbackKey === "denied");

  const feedbackMessage = feedbackKey ? tPerm(`${feedbackKey}Hint`) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && void handleDismiss()}>
      <DialogContent className="border-(--color-border-default) bg-(--color-bg-panel) text-(--color-text-primary) sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-(--color-text-primary)">
            {tPerm("dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-(--color-text-secondary)">
            {tPerm("dialogBody")}
          </DialogDescription>
        </DialogHeader>

        {feedbackMessage ? (
          <FormAlert variant={feedbackKey === "granted" ? "success" : "error"}>
            {feedbackMessage}
          </FormAlert>
        ) : null}

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
            {tPerm("settingsLink")}
          </Link>{" "}
          {tPerm("settingsSuffix")}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void handleDismiss()}>
            {showBlockedHint ? tPerm("close") : tPerm("notNow")}
          </Button>
          <Button type="button" disabled={loading} onClick={handleEnable}>
            {loading
              ? tPerm("requesting")
              : blockedBeforeClick === "already_denied"
                ? tPerm("tryAgain")
                : blockedBeforeClick === "already_granted"
                  ? tPerm("alreadyAllowed")
                  : tPerm("allow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WebNotificationPermissionPromptHost;
