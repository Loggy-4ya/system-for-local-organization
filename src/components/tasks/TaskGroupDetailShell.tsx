"use client";

/**
 * @fileoverview Task group detail — child tasks, reminders, add part action.
 *
 * @module src/components/tasks/TaskGroupDetailShell
 */

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { TaskGroupDetailDto } from "@shared/domains/TaskGroupDomain";
import type { TaskGroupStatus, TaskStatus } from "@shared/constants/taskSettings";
import { formatTaskReminderSchedule } from "@shared/lib/taskReminderLogic";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { NexusRichTextView } from "@/components/editor/NexusRichTextView";
import { TaskGroupTelegramWorkspacePanel } from "@/components/tasks/TaskGroupTelegramWorkspacePanel";
import {
  TaskGroupRosterPanel,
  rosterRowsToPerformerEntries,
} from "@/components/tasks/TaskGroupRosterPanel";
import { buttonVariants } from "@/components/ui/button";
import type { TaskPerformerEntry } from "@/components/users/UserSearchPicker";
import { cn } from "@/lib/utils";

/** Props for {@link TaskGroupDetailShell}. */
export interface TaskGroupDetailShellProps {
  /** Group id from route. */
  groupId: string;
  /** Whether viewer may create child tasks. */
  canDispatch: boolean;
}

/**
 * Task group detail page at `/task-groups/[groupId]`.
 *
 * @param props - Group id and dispatch capability.
 * @returns Group detail JSX.
 */
export function TaskGroupDetailShell({ groupId, canDispatch }: TaskGroupDetailShellProps) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [group, setGroup] = useState<TaskGroupDetailDto | null>(null);
  const [roster, setRoster] = useState<TaskPerformerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroup = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/task-groups/${groupId}`);
    if (res.ok) setGroup(await res.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  useEffect(() => {
    if (!group) return;
    setRoster(rosterRowsToPerformerEntries(group.roster));
  }, [group]);

  /** Localized task status label. */
  function taskStatusLabel(status: TaskStatus): string {
    return t(`status.${status}`);
  }

  /** Localized group status label. */
  function groupStatusLabel(status: TaskGroupStatus): string {
    return t(`groupStatus.${status}`);
  }

  if (loading) {
    return (
      <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
        <p className="text-sm text-[var(--color-text-secondary)]">{tCommon("loading")}</p>
      </StaticPageShell>
    );
  }

  if (!group) {
    return (
      <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
        <div className="glass-panel w-full rounded-[var(--radius-lg)] p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">{t("projectNotFound")}</p>
          <Link href="/task-groups" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 inline-flex")}>
            {t("backToProjects")}
          </Link>
        </div>
      </StaticPageShell>
    );
  }

  const canAddPart =
    canDispatch && group.status !== "completed" && group.status !== "cancelled";

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <div className="glass-panel flex w-full flex-col gap-6 rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/task-groups"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {t("projectsNav")}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              {group.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {groupStatusLabel(group.status)} ·{" "}
              {t("openParts", { open: group.openTaskCount, total: group.taskCount })}
            </p>
          </div>
          {canAddPart && (
            <Link
              href={`/tasks/new?groupId=${encodeURIComponent(group.id)}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {t("addTaskPart")}
            </Link>
          )}
        </div>

        {group.description ? (
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">{t("groupDetail.overview")}</h2>
            <NexusRichTextView
              html={group.description}
              className="nexus-rich-text mt-2 text-sm text-[var(--color-text-secondary)]"
            />
          </section>
        ) : null}

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">{t("groupDetail.projectTeam")}</h2>
          <div className="mt-3">
            <TaskGroupRosterPanel
              value={roster}
              onChange={setRoster}
              groupId={group.id}
              disabled={!canDispatch || group.status === "completed" || group.status === "cancelled"}
              readOnly={!canDispatch}
            />
          </div>
        </section>

        <TaskGroupTelegramWorkspacePanel
          groupId={group.id}
          workspace={group.telegramWorkspace}
          canEdit={canDispatch}
          onUpdated={() => void loadGroup()}
        />

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">{t("groupDetail.longRunReminders")}</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {formatTaskReminderSchedule(group.reminderSettings, group.dueAt)}
          </p>
          {group.dueAt ? (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {t("groupDetail.projectDeadline")}{" "}
              {new Date(group.dueAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">{t("groupDetail.taskParts")}</h2>
          {group.tasks.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{t("groupDetail.noTasksLinked")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="flex w-full flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-4 py-3 text-left transition-colors hover:border-[var(--color-accent-user)]"
                  >
                    <span className="font-medium text-[var(--color-text-primary)]">{task.title}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {taskStatusLabel(task.status)} · {t("performers", { count: task.performerCount })}
                      {task.telegramForumTopicId != null ? ` · ${t("groupDetail.telegramTopicLinked")}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StaticPageShell>
  );
}

export default TaskGroupDetailShell;
