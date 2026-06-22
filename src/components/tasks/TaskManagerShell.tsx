"use client";

/**
 * @fileoverview Task manager list shell for self-government task dispatch.
 *
 * @module src/components/tasks/TaskManagerShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TaskListRow } from "@shared/domains/TaskDomain";
import type { TaskCategoryDefinition } from "@shared/constants/taskCategoryDefaults";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Props for {@link TaskManagerShell}. */
export interface TaskManagerShellProps {
  /** Whether the viewer may create new tasks. */
  canDispatch: boolean;
}

type TaskScope = "all" | "authored" | "assigned";

/**
 * Institutional task list at `/tasks`.
 *
 * @param props - Dispatch capability flag from server.
 * @returns Task manager shell JSX.
 */
export function TaskManagerShell({ canDispatch }: TaskManagerShellProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [scope, setScope] = useState<TaskScope>(canDispatch ? "all" : "assigned");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<TaskCategoryDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canDispatch) return;
    void fetch("/api/tasks/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { categories?: TaskCategoryDefinition[] } | null) => {
        setCategories(data?.categories ?? []);
      });
  }, [canDispatch]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
      scope,
    });
    if (categoryId) params.set("categoryId", categoryId);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
      setTotalCount(data.meta?.totalCount ?? 0);
    }
    setLoading(false);
  }, [page, scope, categoryId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setPage(1);
  }, [scope, categoryId]);

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <div className="glass-panel flex w-full flex-col gap-4 rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Tasks</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Assign, track, and complete institutional tasks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/task-groups"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Projects
            </Link>
            {canDispatch && (
              <Link href="/tasks/new" className={cn(buttonVariants({ size: "sm" }))}>
                New task
              </Link>
            )}
          </div>
        </div>

        <div
          className="inline-flex w-fit gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-1"
          role="tablist"
        >
          {(canDispatch ? (["all", "authored", "assigned"] as const) : (["assigned"] as const)).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={scope === tab}
                onClick={() => setScope(tab)}
                className={cn(
                  "rounded-[6px] px-4 py-2 text-xs font-medium capitalize transition-colors",
                  scope === tab
                    ? "bg-[var(--color-accent-user)] text-[#0f172a]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                )}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        {canDispatch && categories.length > 0 ? (
          <div className="max-w-xs">
            <Select
              value={categoryId ?? "all"}
              onValueChange={(value) => setCategoryId(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="All categories">
                  All categories
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} label={category.label}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No tasks found.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="glass-panel flex w-full items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left transition-opacity hover:opacity-90"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{task.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {task.authorDisplayName} · {task.performerCount} performer
                      {task.performerCount === 1 ? "" : "s"}
                      {task.categoryLabel ? ` · ${task.categoryLabel}` : ""}
                      {task.groupTitle ? ` · ${task.groupTitle}` : ""}
                      {task.dueAt ? ` · Due ${new Date(task.dueAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <span className="badge badge-group">{TASK_STATUS_LABELS[task.status]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <NexusListPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          disabled={loading}
          summary={totalCount > 0 ? `${totalCount} task${totalCount === 1 ? "" : "s"} total` : undefined}
        />
      </div>
    </StaticPageShell>
  );
}

export default TaskManagerShell;
