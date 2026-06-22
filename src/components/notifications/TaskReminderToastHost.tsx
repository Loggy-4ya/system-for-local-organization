"use client";

/**
 * @fileoverview Task reminder toast host — polls active performer reminders.
 *
 * @module src/components/notifications/TaskReminderToastHost
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Active task reminder toast from GET /api/notifications/task-reminders. */
interface TaskReminderToast {
  id: string;
  kind: "task" | "group" | "institutional";
  taskId: string | null;
  groupId: string | null;
  ruleId: string | null;
  title: string;
  body: string;
  variant: "info" | "warning";
  createdAt: string;
}

const VARIANT_CLASS: Record<TaskReminderToast["variant"], string> = {
  info: "site-broadcast-toast--info",
  warning: "site-broadcast-toast--warning",
};

/**
 * Fixed toast stack for task reminder notifications assigned to the signed-in user.
 *
 * @returns Task reminder toast host markup or null when empty / signed out.
 */
export function TaskReminderToastHost() {
  const { status } = useSession();
  const [toasts, setToasts] = useState<TaskReminderToast[]>([]);

  const loadToasts = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/task-reminders");
      if (!res.ok) return;
      const data = (await res.json()) as { toasts?: TaskReminderToast[] };
      setToasts(data.toasts ?? []);
    } catch {
      // Non-fatal — reminders are best-effort.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setToasts([]);
      return;
    }

    void loadToasts();
    const interval = window.setInterval(() => {
      void loadToasts();
    }, 60_000);

    const onFocus = () => {
      void loadToasts();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadToasts, status]);

  /**
   * Dismiss a reminder toast locally and persist dismissal server-side.
   *
   * @param id - Reminder notification document id.
   */
  async function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    try {
      await fetch(`/api/notifications/task-reminders/${encodeURIComponent(id)}/dismiss`, {
        method: "POST",
      });
    } catch {
      // Optimistic UI already removed the toast.
    }
  }

  if (status !== "authenticated" || toasts.length === 0) {
    return null;
  }

  return (
    <div className="site-notification-toast-group" role="region" aria-label="Task reminders">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn("site-broadcast-toast glass-panel", VARIANT_CLASS[toast.variant])}
        >
          <div className="site-broadcast-toast__content">
            <p className="site-broadcast-toast__title">{toast.title}</p>
            <p className="site-broadcast-toast__body">{toast.body}</p>
            <Link
              href={
                toast.kind === "group" && toast.groupId
                  ? `/task-groups/${toast.groupId}`
                  : toast.taskId
                    ? `/tasks/${toast.taskId}`
                    : "/tasks"
              }
              className="site-broadcast-toast__action"
              onClick={() => void dismissToast(toast.id)}
            >
              {toast.kind === "group"
                ? "View project"
                : toast.kind === "institutional" && toast.taskId
                  ? "View task"
                  : toast.kind === "institutional"
                    ? "View tasks"
                    : "View task"}
            </Link>
          </div>
          <button
            type="button"
            className="site-broadcast-toast__dismiss"
            onClick={() => void dismissToast(toast.id)}
            aria-label="Dismiss task reminder"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

export default TaskReminderToastHost;
