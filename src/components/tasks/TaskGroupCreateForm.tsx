"use client";

/**
 * @fileoverview Task group creation form with long-run reminder defaults.
 *
 * @module src/components/tasks/TaskGroupCreateForm
 */

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { FolderKanban } from "lucide-react";
import type { ITaskReminderSettings } from "@shared/models/Task";
import { validateTaskReminderSettings } from "@shared/lib/taskReminderLogic";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { NexusDateTimePicker } from "@/components/ui/NexusDateTimePicker";
import { TaskCategoryTagsField } from "@/components/tasks/TaskCategoryTagsField";
import { TaskFormSection } from "@/components/tasks/TaskFormSection";
import {
  TaskReminderSettingsField,
  createDefaultTaskGroupReminderSettings,
} from "@/components/tasks/TaskReminderSettingsField";
import { TaskDescriptionField } from "@/components/tasks/TaskDescriptionField";
import { TaskGroupRosterPanel } from "@/components/tasks/TaskGroupRosterPanel";
import type { TaskPerformerEntry } from "@/components/users/UserSearchPicker";
import { taskFormSelectTriggerClass } from "@/components/tasks/taskFormTokens";
import { cn } from "@/lib/utils";

/**
 * New task group compose form at `/task-groups/new`.
 *
 * @returns Task group create form JSX.
 */
export function TaskGroupCreateForm() {
  const router = useRouter();
  const t = useTranslations("tasks.createGroup");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ITaskReminderSettings>(() =>
    createDefaultTaskGroupReminderSettings(),
  );
  const [error, setError] = useState<string | null>(null);
  const [descriptionPolicyError, setDescriptionPolicyError] = useState<string | null>(null);
  const [roster, setRoster] = useState<TaskPerformerEntry[]>([]);
  const [saving, setSaving] = useState(false);

  /** Submit create group request. */
  async function handleSubmit(activate: boolean) {
    setSaving(true);
    setError(null);

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

    const res = await fetch("/api/task-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        dueAt,
        tags,
        reminderSettings,
        roster: roster.map((row) => ({
          userId: row.userId,
          roleLabel: row.roleLabel.trim() || undefined,
        })),
        activate,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("createFailed"));
      setSaving(false);
      return;
    }

    const group = await res.json();
    router.push(`/task-groups/${group.id}`);
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
              <FolderKanban className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                {t("title")}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <Link
            href="/task-groups"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
          >
            {t("cancel")}
          </Link>
        </header>

        <div className="flex flex-col gap-8 py-8">
          <TaskFormSection title={t("sectionDetailsTitle")} description={t("sectionDetailsDesc")}>
            <FormField label={t("titleLabel")} required htmlFor="group-title">
              <Input
                id="group-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder={t("titlePlaceholder")}
              />
            </FormField>

            <FormField label={t("descriptionLabel")}>
              <TaskDescriptionField
                value={description}
                onChange={setDescription}
                placeholder={t("descriptionPlaceholder")}
                onContentPolicyViolation={setDescriptionPolicyError}
              />
            </FormField>
          </TaskFormSection>

          <TaskFormSection title={t("sectionScheduleTitle")}>
            <FormField label={t("deadlineLabel")} hint={t("deadlineHint")}>
              <NexusDateTimePicker
                value={dueAt}
                onChange={setDueAt}
                emptyLabel={t("noDeadline")}
                clearLabel={t("clearDeadline")}
                triggerClassName={taskFormSelectTriggerClass}
              />
            </FormField>

            <FormField label={t("tagsLabel")}>
              <TaskCategoryTagsField value={tags} onChange={setTags} />
            </FormField>
          </TaskFormSection>

          <TaskFormSection
            title={t("sectionTeamTitle")}
            description={t("sectionTeamDesc")}
          >
            <TaskGroupRosterPanel value={roster} onChange={setRoster} disabled={saving} />
          </TaskFormSection>

          <TaskFormSection
            title={t("sectionRemindersTitle")}
            description={t("sectionRemindersDesc")}
          >
            <TaskReminderSettingsField
              value={reminderSettings}
              onChange={setReminderSettings}
              dueAt={dueAt}
              variant="group"
            />
          </TaskFormSection>
        </div>

        {error ? (
          <FormAlert variant="error" title={t("saveErrorTitle")} className="mb-4">
            {error}
          </FormAlert>
        ) : null}

        <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-default)] pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? t("creating") : t("activate")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void handleSubmit(false)}
          >
            {t("saveDraft")}
          </Button>
        </footer>
      </form>
    </StaticPageShell>
  );
}

export default TaskGroupCreateForm;
