"use client";

/**
 * @fileoverview Task manager list shell for self-government task dispatch.
 *
 * @module src/components/tasks/TaskManagerShell
 */

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { TaskListRow } from "@shared/domains/TaskDomain";
import type { TaskCategoryDefinition } from "@shared/constants/taskCategoryDefaults";
import type { TaskStatus } from "@shared/constants/taskSettings";
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

const SCOPE_LABEL_KEYS: Record<TaskScope, "scopeAll" | "scopeAuthored" | "scopeAssigned"> = {
  all: "scopeAll",
  authored: "scopeAuthored",
  assigned: "scopeAssigned",
};

/**
 * Institutional task list at `/tasks`.
 *
 * @param props - Dispatch capability flag from server.
 * @returns Task manager shell JSX.
 */
export function TaskManagerShell({ canDispatch }: TaskManagerShellProps) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
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

  /** Localized task status label. */
  function taskStatusLabel(status: TaskStatus): string {
    return t(`status.${status}`);
  }

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <div className="glass-panel flex w-full flex-col gap-4 rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{t("title")}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/task-groups"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("projects")}
            </Link>
            {canDispatch && (
              <Link href="/tasks/new" className={cn(buttonVariants({ size: "sm" }))}>
                {t("newTask")}
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
                {t(SCOPE_LABEL_KEYS[tab])}
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
                <SelectValue placeholder={t("allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label={t("allCategories")}>
                  {t("allCategories")}
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
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{tCommon("loading")}</p>
        ) : tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{t("noTasks")}</p>
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
                      {task.authorDisplayName} · {t("performers", { count: task.performerCount })}
                      {task.categoryLabel ? ` · ${task.categoryLabel}` : ""}
                      {task.groupTitle ? ` · ${task.groupTitle}` : ""}
                      {task.dueAt
                        ? ` · ${t("due", { date: new Date(task.dueAt).toLocaleDateString() })}`
                        : ""}
                    </p>
                  </div>
                  <span className="badge badge-group">{taskStatusLabel(task.status)}</span>
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
          summary={totalCount > 0 ? t("tasksTotal", { count: totalCount }) : undefined}
        />
      </div>
    </StaticPageShell>
  );
}

export default TaskManagerShell;
