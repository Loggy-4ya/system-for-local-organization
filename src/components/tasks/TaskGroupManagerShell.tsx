"use client";

/**
 * @fileoverview Task group list shell for multi-part projects.
 *
 * @module src/components/tasks/TaskGroupManagerShell
 */

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { TaskGroupListRow } from "@shared/domains/TaskGroupDomain";
import type { TaskGroupStatus } from "@shared/constants/taskSettings";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link TaskGroupManagerShell}. */
export interface TaskGroupManagerShellProps {
  /** Whether the viewer may create new groups. */
  canDispatch: boolean;
}

type GroupScope = "all" | "authored" | "involved";

const SCOPE_LABEL_KEYS: Record<GroupScope, "scopeAll" | "scopeAuthored" | "scopeInvolved"> = {
  all: "scopeAll",
  authored: "scopeAuthored",
  involved: "scopeInvolved",
};

/**
 * Institutional task group list at `/task-groups`.
 *
 * @param props - Dispatch capability flag from server.
 * @returns Task group manager shell JSX.
 */
export function TaskGroupManagerShell({ canDispatch }: TaskGroupManagerShellProps) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [groups, setGroups] = useState<TaskGroupListRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [scope, setScope] = useState<GroupScope>(canDispatch ? "all" : "involved");
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
      scope,
    });
    const res = await fetch(`/api/task-groups?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
      setTotalCount(data.meta?.totalCount ?? 0);
    }
    setLoading(false);
  }, [page, scope]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    setPage(1);
  }, [scope]);

  /** Render localized group status label. */
  function groupStatusLabel(status: TaskGroupStatus): string {
    return t(`groupStatus.${status}`);
  }

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <div className="glass-panel flex w-full flex-col gap-4 rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{t("projects")}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("groupsSubtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/tasks" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {t("title")}
            </Link>
            {canDispatch && (
              <Link href="/task-groups/new" className={cn(buttonVariants({ size: "sm" }))}>
                {t("newProject")}
              </Link>
            )}
          </div>
        </div>

        <div
          className="inline-flex w-fit gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-1"
          role="tablist"
        >
          {(canDispatch
            ? (["all", "authored", "involved"] as const)
            : (["involved", "authored"] as const)
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={scope === tab}
              onClick={() => setScope(tab)}
              className={cn(
                "rounded-[6px] px-4 py-2 text-xs font-medium transition-colors",
                scope === tab
                  ? "bg-[var(--color-accent-user)] text-[#0f172a]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              {t(SCOPE_LABEL_KEYS[tab])}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{tCommon("loading")}</p>
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{t("noProjects")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/task-groups/${group.id}`)}
                  className="flex w-full flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-4 py-3 text-left transition-colors hover:border-[var(--color-accent-user)]"
                >
                  <span className="font-medium text-[var(--color-text-primary)]">{group.title}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {groupStatusLabel(group.status)} ·{" "}
                    {t("openParts", { open: group.openTaskCount, total: group.taskCount })}
                    {group.dueAt
                      ? ` · ${t("due", {
                          date: new Date(group.dueAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }),
                        })}`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <NexusListPagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>
    </StaticPageShell>
  );
}

export default TaskGroupManagerShell;
