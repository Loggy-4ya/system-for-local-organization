"use client";

/**
 * @fileoverview Single row in the personal notification inbox.
 *
 * @module src/components/notifications/NotificationInboxRow
 */

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NotificationInboxListItem } from "@shared/domains/NotificationDomain";
import type { UserNotificationKind } from "@shared/constants/notificationInbox";
import {
  isNotificationInboxUnread,
  notificationInboxVariantClass,
} from "@shared/lib/notificationInboxLogic";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Known inbox kind slugs with dedicated translation keys. */
const INBOX_KIND_KEYS = [
  "broadcast",
  "task_reminder",
  "task_group_reminder",
  "institutional_reminder",
  "task_assignment",
  "page_published",
  "page_mention",
] as const satisfies readonly UserNotificationKind[];

/** Props for {@link NotificationInboxRow}. */
export interface NotificationInboxRowProps {
  /** Inbox row payload from the API. */
  item: NotificationInboxListItem;
  /** Called when the user opens or explicitly marks the row read. */
  onMarkRead: (notificationId: string) => void;
}

/**
 * Format inbox timestamp for list metadata.
 *
 * @param iso - ISO timestamp string.
 * @returns Localized date/time label.
 */
function formatInboxTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * One notification row with kind badge, body preview, and optional deep link.
 *
 * @param props - Row item and read handler.
 * @returns Inbox row JSX.
 */
export function NotificationInboxRow({ item, onMarkRead }: NotificationInboxRowProps) {
  const tKinds = useTranslations("notifications.kinds");
  const tInbox = useTranslations("notifications.inbox");
  const unread = isNotificationInboxUnread(item.readAt ? new Date(item.readAt) : null);
  const kindLabel = (INBOX_KIND_KEYS as readonly string[]).includes(item.kind)
    ? tKinds(item.kind as UserNotificationKind)
    : tKinds("fallback");

  const handleOpen = () => {
    if (unread) {
      onMarkRead(item.id);
    }
  };

  const content = (
    <div
      className={cn(
        "notification-inbox-row flex w-full flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-4 text-left transition-colors",
        notificationInboxVariantClass(item.variant),
        unread
          ? "bg-[var(--color-bg-surface)]"
          : "bg-[var(--color-bg-panel)] opacity-90",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{kindLabel}</Badge>
          {unread ? <Badge variant="default">{tInbox("newBadge")}</Badge> : null}
        </div>
        <time
          className="text-xs text-[var(--color-text-secondary)]"
          dateTime={item.createdAt}
        >
          {formatInboxTimestamp(item.createdAt)}
        </time>
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</p>
      <p className="text-sm text-[var(--color-text-secondary)]">{item.body}</p>
    </div>
  );

  if (item.actionHref) {
    return (
      <Link
        href={item.actionHref}
        className="no-underline"
        onClick={handleOpen}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className="w-full cursor-pointer border-0 bg-transparent p-0 text-left" onClick={handleOpen}>
      {content}
    </button>
  );
}

export default NotificationInboxRow;
