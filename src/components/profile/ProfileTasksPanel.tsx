/**
 * @fileoverview Assigned tasks panel on user profile dashboards.
 *
 * @module src/components/profile/ProfileTasksPanel
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { TaskListRow } from "@shared/domains/TaskDomain";
import type { TaskStatus } from "@shared/constants/taskSettings";
import {
  formatProfileTaskMetaLine,
  formatProfileTaskRelativeTime,
  isProfileOpenTaskStatus,
  profileTaskStatusBadgeClass,
  sortProfileTaskRows,
} from "@shared/lib/profileTaskDisplayLogic";
import { ProfileTaskStatusStrip } from "@/components/profile/ProfileTaskStatusStrip";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileTasksPanel}. */
export interface ProfileTasksPanelProps {
  /** Profile owner whose assigned tasks are listed. */
  userId: string;
  /** When true, hide action buttons (viewing another member). */
  readOnly?: boolean;
  /** Optional precomputed open-by-status counts from the server snapshot. */
  initialOpenByStatus?: Partial<Record<TaskListRow["status"], number>>;
}

/** Result of loading assigned tasks for a profile owner. */
interface AssignedTasksLoadResult {
  tasks: TaskListRow[];
  error: string | null;
}

/**
 * Fetch assigned tasks without touching React state (safe to call from effects).
 *
 * @param userId - Profile owner id.
 * @returns Task rows or an error message.
 */
async function fetchAssignedTasks(userId: string): Promise<AssignedTasksLoadResult> {
  try {
    const params = new URLSearchParams({
      scope: "assigned",
      assigneeUserId: userId,
      limit: "12",
    });
    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load tasks.");
    const data = (await res.json()) as { tasks: TaskListRow[] };
    const openTasks = sortProfileTaskRows(
      (data.tasks ?? []).filter((task) => isProfileOpenTaskStatus(task.status)),
    );
    return { tasks: openTasks, error: null };
  } catch (err) {
    return {
      tasks: [],
      error: err instanceof Error ? err.message : "Failed to load tasks.",
    };
  }
}

/**
 * Derive open-by-status counts from loaded task rows.
 *
 * @param tasks - Open task rows.
 * @returns Status count map.
 */
function deriveOpenByStatus(tasks: TaskListRow[]): Partial<Record<TaskListRow["status"], number>> {
  const counts: Partial<Record<TaskListRow["status"], number>> = {};
  for (const task of tasks) {
    counts[task.status] = (counts[task.status] ?? 0) + 1;
  }
  return counts;
}

/**
 * Assigned-task list backed by GET `/api/tasks` with urgency sorting and rich meta.
 *
 * @param props - Profile owner id and read-only flag.
 * @returns Tasks panel JSX.
 */
export function ProfileTasksPanel({
  userId,
  readOnly = false,
  initialOpenByStatus,
}: ProfileTasksPanelProps) {
  const t = useTranslations("profile.tasksPanel");
  const tTasks = useTranslations("tasks");
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchAssignedTasks(userId).then((result) => {
      if (cancelled) return;
      setTasks(result.tasks);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const openByStatus = useMemo(
    () => initialOpenByStatus ?? deriveOpenByStatus(tasks),
    [initialOpenByStatus, tasks],
  );

  /** Acknowledge a dispatched task and refresh the list in place. */
  async function handleAcknowledge(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/acknowledge`, { method: "POST" });
    if (!res.ok) return;

    const result = await fetchAssignedTasks(userId);
    setTasks(result.tasks);
    setError(result.error);
  }

  /** Localized task status label. */
  function taskStatusLabel(status: TaskStatus): string {
    return tTasks(`status.${status}`);
  }

  return (
    <div className="glass-panel flex flex-1 flex-col gap-3 rounded-[var(--radius-md)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{t("subtitle")}</p>
        </div>
        {!readOnly && (
          <Link
            href="/tasks"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 text-[var(--color-accent-user)]")}
          >
            {t("manageAll")}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {!loading && !error && <ProfileTaskStatusStrip openByStatus={openByStatus} />}

      {loading && (
        <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">{t("loading")}</p>
      )}
      {error && (
        <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">{t("loadError")}</p>
      )}
      {!loading && !error && tasks.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{t("noOpenAssigned")}</p>
      )}

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/tasks/${task.id}`}
                  className="text-sm font-semibold text-[var(--color-text-primary)] hover:underline"
                >
                  {task.title}
                </Link>
                {task.categoryLabel && (
                  <span className="badge badge-group">{task.categoryLabel}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {formatProfileTaskMetaLine(task)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                <Clock3 className="size-3" aria-hidden="true" />
                {formatProfileTaskRelativeTime(task.updatedAt)}
              </p>
              {task.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="badge badge-group">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <span className={cn("badge", profileTaskStatusBadgeClass(task.status))}>
                {taskStatusLabel(task.status)}
              </span>
              {!readOnly && task.status === "dispatched" && (
                <Button variant="outline" size="sm" type="button" onClick={() => void handleAcknowledge(task.id)}>
                  {t("acknowledge")}
                </Button>
              )}
              {!readOnly && task.status !== "dispatched" && (
                <Link href={`/tasks/${task.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  {t("open")}
                </Link>
              )}
              {readOnly && (
                <Link href={`/tasks/${task.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  {t("viewTask")}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileTasksPanel;
