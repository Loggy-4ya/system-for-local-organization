"use client";

/**
 * @fileoverview Header bell button with unread badge linking to the notification center.
 *
 * @module src/components/notifications/NotificationBellButton
 */

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { fetchNotificationUnreadCount } from "@/lib/notificationInboxClient";
import { cn } from "@/lib/utils";

/** Props for {@link NotificationBellButton}. */
export interface NotificationBellButtonProps {
  /** Whether the viewer is signed in (from site chrome bootstrap). */
  isAuthenticated?: boolean;
  /** Live-preview chrome: link does not navigate. */
  preview?: boolean;
}

/**
 * Bell icon with unread count badge — polls every 60s when signed in.
 *
 * @param props - Preview flag for global layout editor.
 * @returns Bell link JSX or null when signed out.
 */
export function NotificationBellButton({
  isAuthenticated: isAuthenticatedProp,
  preview = false,
}: NotificationBellButtonProps) {
  const t = useTranslations("notifications.bell");
  const { status } = useSession();
  const isAuthenticated =
    isAuthenticatedProp ?? (preview ? false : status === "authenticated");
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    const count = await fetchNotificationUnreadCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || preview) {
      setUnreadCount(0);
      return;
    }

    void loadUnreadCount();
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 60_000);

    const onFocus = () => {
      void loadUnreadCount();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, loadUnreadCount, preview]);

  if (!isAuthenticated) {
    return null;
  }

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  const blockPreviewNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (preview) {
      event.preventDefault();
    }
  };

  return (
    <Link
      href="/profile/notifications"
      className={cn(
        "notification-bell-button relative inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-2 text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)]",
      )}
      aria-label={
        unreadCount > 0
          ? t("labelUnread", { count: unreadCount })
          : t("label")
      }
      title={t("label")}
      onClick={blockPreviewNavigation}
    >
      <Bell {...siteChromeLucideProps({ className: "size-4" })} aria-hidden />
      {unreadCount > 0 ? (
        <span className="notification-bell-button__badge" aria-hidden>
          {badgeLabel}
        </span>
      ) : null}
    </Link>
  );
}

export default NotificationBellButton;
