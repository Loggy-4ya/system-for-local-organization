"use client";

/**
 * @fileoverview Task group detail — child tasks, reminders, add part action.
 *
 * @module src/components/tasks/TaskGroupDetailShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TaskGroupDetailDto } from "@shared/domains/TaskGroupDomain";
import {
  TASK_GROUP_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "@shared/constants/taskSettings";
import { formatTaskReminderSchedule } from "@shared/lib/taskReminderLogic";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { NexusRichTextView } from "@/components/editor/NexusRichTextView";
import { TaskGroupTelegramWorkspacePanel } from "@/components/tasks/TaskGroupTelegramWorkspacePanel";
import {
  TaskGroupRosterPanel,
  rosterRowsToPerformerEntries,
} from "@/components/tasks/TaskGroupRosterPanel";
import { Button, buttonVariants } from "@/components/ui/button";
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

  if (loading) {
    return (
      <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
        <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
      </StaticPageShell>
    );
  }

  if (!group) {
    return (
      <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
        <div className="glass-panel w-full rounded-[var(--radius-lg)] p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Project not found.</p>
          <Link href="/task-groups" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 inline-flex")}>
            Back to projects
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
              ← Projects
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              {group.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {TASK_GROUP_STATUS_LABELS[group.status]} · {group.openTaskCount} open /{" "}
              {group.taskCount} parts
            </p>
          </div>
          {canAddPart && (
            <Link
              href={`/tasks/new?groupId=${encodeURIComponent(group.id)}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Add task part
            </Link>
          )}
        </div>

        {group.description ? (
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Overview</h2>
            <NexusRichTextView
              html={group.description}
              className="nexus-rich-text mt-2 text-sm text-[var(--color-text-secondary)]"
            />
          </section>
        ) : null}

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Project team</h2>
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
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Long-run reminders</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {formatTaskReminderSchedule(group.reminderSettings, group.dueAt)}
          </p>
          {group.dueAt ? (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Project deadline:{" "}
              {new Date(group.dueAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">Task parts</h2>
          {group.tasks.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No tasks linked yet. Add the first part to start tracking progress.
            </p>
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
                      {TASK_STATUS_LABELS[task.status]} · {task.performerCount} performer
                      {task.performerCount === 1 ? "" : "s"}
                      {task.telegramForumTopicId != null ? " · Telegram topic linked" : ""}
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
