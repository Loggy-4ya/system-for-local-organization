/**
 * @fileoverview Assigned tasks panel on user profile dashboards.
 *
 * @module src/components/profile/ProfileTasksPanel
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TaskListRow } from "@shared/domains/TaskDomain";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileTasksPanel}. */
export interface ProfileTasksPanelProps {
  /** Profile owner whose assigned tasks are listed. */
  userId: string;
  /** When true, hide action buttons (viewing another member). */
  readOnly?: boolean;
}

/**
 * Format task meta line for list rows.
 *
 * @param task - Task list row.
 * @returns Secondary line text.
 */
function formatTaskMeta(task: TaskListRow): string {
  const due = task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date";
  return `${due} · ${TASK_STATUS_LABELS[task.status]}`;
}

/**
 * Tabbed assigned-task list backed by GET `/api/tasks`.
 *
 * @param props - Profile owner id and read-only flag.
 * @returns Tasks panel JSX.
 */
export function ProfileTasksPanel({ userId, readOnly = false }: ProfileTasksPanelProps) {
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        scope: "assigned",
        assigneeUserId: userId,
        limit: "8",
      });
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load tasks.");
      const data = (await res.json()) as { tasks: TaskListRow[] };
      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  /** Acknowledge a dispatched task. */
  async function handleAcknowledge(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/acknowledge`, { method: "POST" });
    if (res.ok) void loadTasks();
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Assigned tasks</h2>
        {!readOnly && (
          <Link href="/tasks" className="text-xs text-[var(--color-accent-user)] hover:underline">
            Manage all
          </Link>
        )}
      </div>

      {loading && (
        <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">Loading tasks…</p>
      )}
      {error && (
        <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">{error}</p>
      )}
      {!loading && !error && tasks.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
          No open tasks assigned.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="glass-panel flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/tasks/${task.id}`}
                className="text-sm font-semibold text-[var(--color-text-primary)] hover:underline"
              >
                {task.title}
              </Link>
              <p className="text-xs text-[var(--color-text-secondary)]">{formatTaskMeta(task)}</p>
            </div>
            <span
              className={cn(
                "badge",
                task.status === "overdue" ? "badge-warning" : "badge-group",
              )}
            >
              {TASK_STATUS_LABELS[task.status]}
            </span>
            {!readOnly && task.status === "dispatched" && (
              <Button variant="outline" size="sm" type="button" onClick={() => handleAcknowledge(task.id)}>
                Confirm
              </Button>
            )}
            {!readOnly && task.status !== "dispatched" && (
              <Link
                href={`/tasks/${task.id}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Open
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileTasksPanel;
