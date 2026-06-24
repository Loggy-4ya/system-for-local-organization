"use client";

/**
 * @fileoverview Task reminder toast host — polls active performer reminders.
 *
 * @module src/components/notifications/TaskReminderToastHost
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SiteToastCard } from "@/components/notifications/SiteToastCard";

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

/**
 * Resolve the in-app destination for a task reminder toast action link.
 *
 * @param toast - Reminder payload.
 * @returns Internal route href.
 */
function resolveTaskReminderHref(toast: TaskReminderToast): string {
  if (toast.kind === "group" && toast.groupId) {
    return `/task-groups/${toast.groupId}`;
  }
  if (toast.taskId) {
    return `/tasks/${toast.taskId}`;
  }
  return "/tasks";
}

/**
 * Resolve the action label for a task reminder toast.
 *
 * @param toast - Reminder payload.
 * @returns Link label copy.
 */
function resolveTaskReminderActionLabel(toast: TaskReminderToast): string {
  if (toast.kind === "group") return "View project";
  if (toast.kind === "institutional" && toast.taskId) return "View task";
  if (toast.kind === "institutional") return "View tasks";
  return "View task";
}

/**
 * Fixed toast stack for task reminder notifications assigned to the signed-in user.
 *
 * @returns Task reminder toast host markup or null when empty / signed out.
 */
export function TaskReminderToastHost() {
  const router = useRouter();
  const { status } = useSession();
  const [toasts, setToasts] = useState<TaskReminderToast[]>([]);
  const pendingNavRef = useRef<Map<string, string>>(new Map());

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
   * Remove a reminder locally after its exit animation and persist dismissal server-side.
   *
   * @param id - Reminder notification document id.
   */
  const finalizeDismiss = useCallback(
    async (id: string) => {
      const nextHref = pendingNavRef.current.get(id);
      pendingNavRef.current.delete(id);

      setToasts((current) => current.filter((toast) => toast.id !== id));
      try {
        await fetch(`/api/notifications/task-reminders/${encodeURIComponent(id)}/dismiss`, {
          method: "POST",
        });
      } catch {
        // Optimistic UI already removed the toast.
      }

      if (nextHref) {
        router.push(nextHref);
      }
    },
    [router],
  );

  if (status !== "authenticated" || toasts.length === 0) {
    return null;
  }

  return (
    <div className="site-notification-toast-group" role="region" aria-label="Task reminders">
      {toasts.map((toast) => {
        const href = resolveTaskReminderHref(toast);

        return (
          <SiteToastCard
            key={toast.id}
            variant={toast.variant}
            dismissLabel="Dismiss task reminder"
            onDismissComplete={() => void finalizeDismiss(toast.id)}
            footer={({ beginExit }) => (
              <Link
                href={href}
                className="site-broadcast-toast__action"
                onClick={(event) => {
                  event.preventDefault();
                  pendingNavRef.current.set(toast.id, href);
                  beginExit();
                }}
              >
                {resolveTaskReminderActionLabel(toast)}
              </Link>
            )}
          >
            <p className="site-broadcast-toast__title">{toast.title}</p>
            <p className="site-broadcast-toast__body">{toast.body}</p>
          </SiteToastCard>
        );
      })}
    </div>
  );
}

export default TaskReminderToastHost;
