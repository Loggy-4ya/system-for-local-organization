"use client";

/**
 * @fileoverview Task creation form for self-government administrators.
 *
 * @module src/components/tasks/TaskCreateForm
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import type { ITaskMediaRef, ITaskReminderSettings } from "@shared/models/Task";
import type { TaskAssignmentNotifyTarget } from "@shared/constants/taskSettings";
import { DEFAULT_TASK_ASSIGNMENT_NOTIFY_TARGETS } from "@shared/constants/taskSettings";
import { validateTaskReminderSettings } from "@shared/lib/taskReminderLogic";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { NexusDateTimePicker } from "@/components/ui/NexusDateTimePicker";
import {
  TaskPerformerPicker,
  type TaskPerformerEntry,
} from "@/components/users/UserSearchPicker";
import { TaskCategoryTagsField } from "@/components/tasks/TaskCategoryTagsField";
import { TaskCategorySelectField } from "@/components/tasks/TaskCategorySelectField";
import { TaskFormSection } from "@/components/tasks/TaskFormSection";
import { TaskMediaAttachmentsField } from "@/components/tasks/TaskMediaAttachmentsField";
import {
  TaskReminderSettingsField,
  createDefaultTaskReminderSettings,
} from "@/components/tasks/TaskReminderSettingsField";
import { TaskGroupPickerField } from "@/components/tasks/TaskGroupPickerField";
import { TaskGroupRosterQuickAdd } from "@/components/tasks/TaskGroupRosterQuickAdd";
import { TaskAssignmentNotifyField } from "@/components/tasks/TaskAssignmentNotifyField";
import { TaskDescriptionField } from "@/components/tasks/TaskDescriptionField";
import { taskFormSelectTriggerClass } from "@/components/tasks/taskFormTokens";
import { cn } from "@/lib/utils";

/**
 * New task compose form at `/tasks/new`.
 *
 * @returns Task create form JSX.
 */
export function TaskCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>("standard");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [explanationMedia, setExplanationMedia] = useState<ITaskMediaRef[]>([]);
  const [performers, setPerformers] = useState<TaskPerformerEntry[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ITaskReminderSettings>(() =>
    createDefaultTaskReminderSettings(),
  );
  const [assignmentNotifyTargets, setAssignmentNotifyTargets] = useState<
    TaskAssignmentNotifyTarget[]
  >(() => [...DEFAULT_TASK_ASSIGNMENT_NOTIFY_TARGETS]);
  const [error, setError] = useState<string | null>(null);
  const [descriptionPolicyError, setDescriptionPolicyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const preset = searchParams.get("groupId");
    if (preset) setGroupId(preset);
  }, [searchParams]);

  /** Submit create task request. */
  async function handleSubmit(dispatch: boolean) {
    setSaving(true);
    setError(null);

    if (performers.length === 0) {
      setError("Add at least one performer using the search field.");
      setSaving(false);
      return;
    }

    const reminderError = validateTaskReminderSettings(reminderSettings, dueAt);
    if (reminderError) {
      setError(reminderError);
      setSaving(false);
      return;
    }

    if (descriptionPolicyError) {
      setError(descriptionPolicyError);
      setSaving(false);
      return;
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        dueAt,
        tags,
        categoryId,
        explanationMedia,
        performers: performers.map((row) => ({
          userId: row.userId,
          roleLabel: row.roleLabel.trim() || undefined,
        })),
        reminderSettings,
        assignmentNotifyTargets,
        groupId,
        dispatch,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to create task.");
      setSaving(false);
      return;
    }

    const task = await res.json();
    router.push(`/tasks/${task.id}`);
  }

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(true);
        }}
        className="task-form glass-panel flex w-full flex-col rounded-[var(--radius-lg)] p-6 md:p-8"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border-default)] pb-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-user)_14%,transparent)] text-[var(--color-accent-user)]">
              <ClipboardList className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                New task
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Describe the assignment, set a deadline, assign performers, and configure optional
                reminders.
              </p>
            </div>
          </div>
          <Link
            href="/tasks"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
          >
            Cancel
          </Link>
        </header>

        <div className="flex flex-col gap-8 py-8">
          <TaskFormSection title="Task details" description="What needs to be done and any supporting media.">
            <FormField label="Title" required htmlFor="task-title">
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="Short headline for the assignment"
              />
            </FormField>

            <FormField label="Description">
              <TaskDescriptionField
                value={description}
                onChange={setDescription}
                onContentPolicyViolation={setDescriptionPolicyError}
              />
            </FormField>

            <FormField
              label="Explanation media"
              hint="Photos or videos that clarify the assignment."
            >
              <TaskMediaAttachmentsField value={explanationMedia} onChange={setExplanationMedia} />
            </FormField>
          </TaskFormSection>

          <TaskFormSection title="Schedule & tags" description="Organize the task and set expectations.">
            <FormField label="Due date" hint="Required for deadline-relative reminders.">
              <NexusDateTimePicker
                value={dueAt}
                onChange={setDueAt}
                emptyLabel="No due date"
                clearLabel="Clear due date"
                triggerClassName={taskFormSelectTriggerClass}
              />
            </FormField>

            <TaskCategorySelectField
              value={categoryId}
              onChange={setCategoryId}
              disabled={saving}
            />

            <FormField label="Tags" hint="Optional extra labels — search or create.">
              <TaskCategoryTagsField value={tags} onChange={setTags} />
            </FormField>
          </TaskFormSection>

          <TaskFormSection
            title="Project"
            description="Optionally attach this task as one part of a larger project."
          >
            <TaskGroupPickerField value={groupId} onChange={setGroupId} />
          </TaskFormSection>

          <TaskFormSection
            title="Assignment"
            description="Search institution members and optionally label their role on this task."
          >
            {groupId ? (
              <TaskGroupRosterQuickAdd
                groupId={groupId}
                performers={performers}
                disabled={saving}
                onAddPerformers={(entries) =>
                  setPerformers((current) => {
                    const seen = new Set(current.map((row) => row.userId));
                    const merged = [...current];
                    for (const entry of entries) {
                      if (seen.has(entry.userId)) continue;
                      seen.add(entry.userId);
                      merged.push(entry);
                    }
                    return merged;
                  })
                }
              />
            ) : null}
            <FormField label="Performers" required hint="Search by name, login, group, or email.">
              <TaskPerformerPicker value={performers} onChange={setPerformers} />
            </FormField>
          </TaskFormSection>

          <TaskFormSection
            title="Notifications"
            description="How performers are alerted when you dispatch this task."
          >
            <TaskAssignmentNotifyField
              value={assignmentNotifyTargets}
              onChange={setAssignmentNotifyTargets}
              disabled={saving}
            />
          </TaskFormSection>

          <TaskFormSection title="Reminders" description="Optional nudges for performers until completion.">
            <TaskReminderSettingsField
              value={reminderSettings}
              onChange={setReminderSettings}
              dueAt={dueAt}
            />
          </TaskFormSection>
        </div>

        {error ? (
          <FormAlert variant="error" title="Could not save task" className="mb-4">
            {error}
          </FormAlert>
        ) : null}

        <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-default)] pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Dispatch task"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void handleSubmit(false)}
          >
            Save as draft
          </Button>
        </footer>
      </form>
    </StaticPageShell>
  );
}

export default TaskCreateForm;
