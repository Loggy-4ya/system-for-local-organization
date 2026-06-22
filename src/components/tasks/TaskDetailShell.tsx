"use client";

/**
 * @fileoverview Task detail view — acknowledge, report, score, delegate.
 *
 * @module src/components/tasks/TaskDetailShell
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { TaskDetailDto } from "@shared/domains/TaskDomain";
import type { ITaskMediaRef } from "@shared/models/Task";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";
import { formatTaskReminderSchedule } from "@shared/lib/taskReminderLogic";
import {
  canReopenTask,
  canStartTask,
  type TaskActorSlice,
} from "@shared/lib/taskAccessLogic";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { FormField } from "@/components/ui/form-field";
import { UserSearchPicker } from "@/components/users/UserSearchPicker";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { TaskMediaAttachmentsField } from "@/components/tasks/TaskMediaAttachmentsField";
import { TaskMediaGallery } from "@/components/tasks/TaskMediaGallery";
import { NexusRichTextView } from "@/components/editor/NexusRichTextView";
import { TaskScorePanel } from "@/components/tasks/TaskScorePanel";
import { Button } from "@/components/ui/button";

/** Props for {@link TaskDetailShell}. */
export interface TaskDetailShellProps {
  /** Initial task id from the route. */
  taskId: string;
  /** Viewer MongoDB user id. */
  viewerUserId: string;
  /** Whether viewer may dispatch/score tasks. */
  canDispatch: boolean;
}

/**
 * Task detail page shell at `/tasks/[taskId]`.
 *
 * @param props - Route id and viewer capabilities.
 * @returns Task detail JSX.
 */
export function TaskDetailShell({ taskId, viewerUserId, canDispatch }: TaskDetailShellProps) {
  const [task, setTask] = useState<TaskDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportText, setReportText] = useState("");
  const [reportMedia, setReportMedia] = useState<ITaskMediaRef[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadTask = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) setTask(await res.json());
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const isPerformer = task?.performers.some((p) => p.userId === viewerUserId) ?? false;
  const isAuthor = task?.authorUserId === viewerUserId;

  const taskAccessSlice = useMemo(
    () =>
      task
        ? {
            authorUserId: task.authorUserId,
            performerUserIds: task.performers.map((p) => p.userId),
            status: task.status,
            delegationCount: task.delegationCount,
          }
        : null,
    [task],
  );

  const viewerActorSlice = useMemo((): TaskActorSlice | null => {
    if (!taskAccessSlice) return null;
    return {
      userId: viewerUserId,
      role: canDispatch ? "StudentCouncil" : "Student",
      accessLevelIndex: canDispatch ? 1 : 6,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
      permissions: canDispatch ? ["tasks.dispatch", "tasks.receive"] : ["tasks.receive"],
    };
  }, [canDispatch, taskAccessSlice, viewerUserId]);

  const mayStart =
    viewerActorSlice && taskAccessSlice
      ? canStartTask(viewerActorSlice, taskAccessSlice)
      : false;
  const mayReopen =
    viewerActorSlice && taskAccessSlice
      ? canReopenTask(viewerActorSlice, taskAccessSlice)
      : false;
  const mayScore = task?.canScore === true;

  /** POST helper for task sub-actions. */
  async function postAction(path: string, body?: unknown) {
    setMessage(null);
    const res = await fetch(`/api/tasks/${taskId}/${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(typeof data.error === "string" ? data.error : "Action failed.");
      return;
    }
    setTask(await res.json());
    setMessage("Saved.");
  }

  /** Submit scores with optional completion. */
  async function submitScores(payload: {
    complete: boolean;
    baseScore: number;
    scores: Array<{
      userId: string;
      qualityPercent: number;
      timePercent: number;
    }>;
  }) {
    await postAction("score", payload);
  }

  if (loading) {
    return (
      <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
        <p className="text-sm text-[var(--color-text-secondary)]">Loading task…</p>
      </StaticPageShell>
    );
  }

  if (!task) {
    return (
      <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
        <p className="text-sm text-[var(--color-text-secondary)]">Task not found.</p>
      </StaticPageShell>
    );
  }

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <div className="glass-panel flex w-full flex-col gap-4 rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/tasks" className="text-xs text-[var(--color-accent-user)] hover:underline">
              ← All tasks
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{task.title}</h1>
            {task.groupId && task.groupTitle ? (
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Part of{" "}
                <Link
                  href={`/task-groups/${task.groupId}`}
                  className="text-[var(--color-accent-user)] hover:underline"
                >
                  {task.groupTitle}
                </Link>
              </p>
            ) : null}
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {TASK_STATUS_LABELS[task.status]} · by {task.authorDisplayName}
              {task.categoryLabel ? ` · ${task.categoryLabel}` : ""}
              {task.baseScore != null ? ` · Base ${task.baseScore}` : ""}
              {task.dueAt ? ` · Due ${new Date(task.dueAt).toLocaleString()}` : ""}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Created {new Date(task.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="badge badge-group">{TASK_STATUS_LABELS[task.status]}</span>
        </div>

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {task.tags.map((tag) => (
              <span key={tag} className="badge badge-group">
                {tag}
              </span>
            ))}
          </div>
        )}

        {task.description ? (
          <div className="glass-panel rounded-[var(--radius-md)] p-4 text-sm text-[var(--color-text-secondary)]">
            <NexusRichTextView html={task.description} className="nexus-rich-text" />
          </div>
        ) : null}

        <TaskMediaGallery items={task.explanationMedia} label="Explanation media" />

        {task.completedAtHistory.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Completion history</h2>
            <ul className="mt-2 list-disc pl-5 text-xs text-[var(--color-text-secondary)]">
              {task.completedAtHistory.map((stamp, index) => (
                <li key={`${stamp}-${index}`}>{new Date(stamp).toLocaleString()}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Performers</h2>
          <ul className="mt-2 flex list-none flex-col gap-2 p-0">
            {task.performers.map((performer) => (
              <li
                key={performer.userId}
                className="glass-panel flex gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm"
              >
                <UserAvatarImage src={performer.avatar} alt={performer.displayName} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    <Link
                      href={`/users/${performer.userId}`}
                      className="text-[var(--color-accent-user)] hover:underline"
                    >
                      {performer.displayName}
                    </Link>
                    {performer.roleLabel ? ` · ${performer.roleLabel}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {performer.acknowledgedAt
                      ? `Acknowledged ${new Date(performer.acknowledgedAt).toLocaleString()}`
                      : "Not acknowledged"}
                    {performer.score != null ? ` · Final ${performer.score}` : ""}
                    {performer.qualityPercent != null && performer.timePercent != null
                      ? ` (Q ${performer.qualityPercent}% · T ${performer.timePercent}%)`
                      : ""}
                  </p>
                  {performer.report && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs whitespace-pre-wrap text-[var(--color-text-secondary)]">
                        Report: {performer.report.description}
                      </p>
                      <TaskMediaGallery items={performer.report.media ?? []} label="Proof media" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {task.reminderSettings.enabled && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            {formatTaskReminderSchedule(task.reminderSettings, task.dueAt)}
          </p>
        )}

        {isPerformer && task.status === "dispatched" && (
          <Button type="button" onClick={() => postAction("acknowledge")}>
            Confirm receipt
          </Button>
        )}

        {mayStart && (
          <Button type="button" variant="outline" onClick={() => postAction("start")}>
            Start work
          </Button>
        )}

        {mayReopen && (
          <Button type="button" variant="outline" onClick={() => postAction("reopen")}>
            Reopen for redo
          </Button>
        )}

        {isPerformer && task.status !== "completed" && task.status !== "cancelled" && (
          <div className="glass-panel flex flex-col gap-3 rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Submit report</h2>
            <FormField label="Description">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Proof media">
              <TaskMediaAttachmentsField value={reportMedia} onChange={setReportMedia} />
            </FormField>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                postAction("report", { description: reportText, media: reportMedia })
              }
            >
              Submit report
            </Button>
          </div>
        )}

        {(isPerformer || isAuthor || canDispatch) && task.status !== "completed" && task.status !== "cancelled" && (
          <div className="glass-panel flex flex-col gap-3 rounded-[var(--radius-md)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Delegate to another user</h2>
            <UserSearchPicker
              onSelect={(candidate) => postAction("delegate", { userId: candidate.userId })}
              excludedUserIds={task.performers.map((p) => p.userId)}
              placeholder="Search by name, @login, group, or email…"
            />
          </div>
        )}

        {mayScore ? (
          <TaskScorePanel task={task} onSubmit={submitScores} />
        ) : null}

        {message && <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>}
      </div>
    </StaticPageShell>
  );
}

export default TaskDetailShell;
