"use client";

/**
 * @fileoverview Admin editor for Telegram project workspace automation policy.
 *
 * @module src/components/admin/TelegramWorkspaceEditorShell
 */

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { TelegramAutomationPublicConfig } from "@shared/domains/TelegramWorkspaceDomain";
import {
  TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS,
  TELEGRAM_WORKSPACE_TEMPLATE_PLACEHOLDERS,
} from "@shared/constants/telegramWorkspace";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { TaskFormCheckbox } from "@/components/tasks/TaskFormCheckbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** Props for {@link TelegramWorkspaceEditorShell}. */
export interface TelegramWorkspaceEditorShellProps {
  /** Initial config from server. */
  initialConfig: TelegramAutomationPublicConfig;
}

/**
 * Admin Telegram workspace policy editor at `/admin/telegram-workspaces`.
 *
 * @param props - Initial automation config.
 * @returns Editor shell JSX.
 */
export function TelegramWorkspaceEditorShell({
  initialConfig,
}: TelegramWorkspaceEditorShellProps) {
  const tAdmin = useTranslations("admin");
  const t = useTranslations("admin.telegramWorkspaces");
  const [config, setConfig] = useState(initialConfig);
  const [savedConfig, setSavedConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  useEffect(() => {
    setConfig(initialConfig);
    setSavedConfig(initialConfig);
  }, [initialConfig]);

  /** Persist automation settings. */
  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/telegram-workspaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : t("saveError"));
      setSaving(false);
      return;
    }
    setConfig(data.config);
    setSavedConfig(data.config);
    setMessage(t("saveSuccess"));
    setSaving(false);
  }

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile} className="items-center p-6">
      <div className="glass-panel flex w-full flex-col rounded-[var(--radius-lg)] p-6 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border-default)] pb-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-user)_14%,transparent)] text-[var(--color-accent-user)]">
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {tAdmin("hub.telegram-workspaces.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
                {tAdmin("hub.telegram-workspaces.description")}{" "}
                {t.rich("sessionHint", {
                  envVar: () => <code className="text-xs">TELEGRAM_OPERATOR_SESSION</code>,
                })}
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
          >
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
            {tAdmin("backToHub")}
          </Link>
        </header>

        <div className="flex flex-col gap-6 py-8">
          <FormAlert variant="info" title={t("operatorSessionTitle")}>
            {config.workerEnvReady
              ? t("workerEnvReady")
              : config.operatorSessionConfigured
                ? t("workerEnvIncomplete")
                : t("noOperatorSession")}
          </FormAlert>

          <TaskFormCheckbox
            label={t("enableWorkspaces")}
            description={t("enableWorkspacesDesc")}
            checked={config.enabled}
            onChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={t("defaultStrategy")}>
              <Select
                value={config.defaultStrategy}
                onValueChange={(value) =>
                  setConfig((prev) => ({
                    ...prev,
                    defaultStrategy: value as TelegramAutomationPublicConfig["defaultStrategy"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("strategyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" label={t("strategyAuto")}>
                    {t("strategyAuto")}
                  </SelectItem>
                  <SelectItem value="manual_link" label={t("strategyManual")}>
                    {t("strategyManual")}
                  </SelectItem>
                  <SelectItem value="user_session" label={t("strategySession")}>
                    {t("strategySession")}
                  </SelectItem>
                  <SelectItem value="disabled" label={t("strategyDisabled")}>
                    {t("strategyDisabled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={t("minPerformers")}>
              <Input
                type="number"
                min={0}
                max={500}
                value={config.minPerformersForAutoGroup}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    minPerformersForAutoGroup: Number(e.target.value),
                  }))
                }
              />
            </FormField>
          </div>

          <TaskFormCheckbox
            label={t("autoProvision")}
            description={t("autoProvisionDesc")}
            checked={config.autoProvisionOnActivate}
            onChange={(autoProvisionOnActivate) =>
              setConfig((prev) => ({ ...prev, autoProvisionOnActivate }))
            }
          />

          <TaskFormCheckbox
            label={t("dismantleOnComplete")}
            checked={config.dismantleOnComplete}
            onChange={(dismantleOnComplete) =>
              setConfig((prev) => ({ ...prev, dismantleOnComplete }))
            }
          />

          <TaskFormCheckbox
            label={t("forumTopicPerTask")}
            description={t("forumTopicPerTaskDesc")}
            checked={config.createForumTopicPerTask}
            onChange={(createForumTopicPerTask) =>
              setConfig((prev) => ({ ...prev, createForumTopicPerTask }))
            }
          />

          <FormField label={t("forumWelcome")} hint={t("forumWelcomeHint")}>
            <textarea
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.taskForumTopicWelcomeTemplate}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  taskForumTopicWelcomeTemplate: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label={t("onCompleteAction")}>
            <Select
              value={config.dismantleAction}
              onValueChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  dismantleAction: value as (typeof TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS)[number],
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("actionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="archive_notice" label={t("actionArchive")}>
                  {t("actionArchive")}
                </SelectItem>
                <SelectItem value="leave" label={t("actionLeave")}>
                  {t("actionLeave")}
                </SelectItem>
                <SelectItem value="none" label={t("actionNone")}>
                  {t("actionNone")}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label={t("groupTitleTemplate")}
            hint={`Placeholders: ${TELEGRAM_WORKSPACE_TEMPLATE_PLACEHOLDERS.join(", ")}`}
          >
            <Input
              value={config.groupTitleTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, groupTitleTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label={t("welcomeAfterLink")}>
            <textarea
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.groupWelcomeTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, groupWelcomeTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label={t("manualLinkInstructions")}>
            <textarea
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.linkCommandHelpTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, linkCommandHelpTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label={t("completionNotice")}>
            <textarea
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.dismantleNoticeTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, dismantleNoticeTemplate: e.target.value }))
              }
            />
          </FormField>

          <div className="border-t border-[var(--color-border-default)] pt-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t("botCommandsTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {t("botCommandsIntro", {
                placeholders: [
                  ...TELEGRAM_WORKSPACE_TEMPLATE_PLACEHOLDERS,
                  "{{index}}",
                  "{{statusLabel}}",
                  "{{dueAtShort}}",
                  "{{description}}",
                  "{{mediaCount}}",
                ].join(", "),
              })}
            </p>
          </div>

          <TaskFormCheckbox
            label={t("enableCompleted")}
            description={t("enableCompletedDesc")}
            checked={config.botCompletedCommandEnabled}
            onChange={(botCompletedCommandEnabled) =>
              setConfig((prev) => ({ ...prev, botCompletedCommandEnabled }))
            }
          />

          <FormField label={t("reportStepOrder")} hint={t("reportStepOrderHint")}>
            <Input
              value={config.reportFlowSteps.join(", ")}
              onChange={(e) => {
                const steps = e.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter((part) => part === "description" || part === "media");
                setConfig((prev) => ({
                  ...prev,
                  reportFlowSteps: steps.length > 0 ? steps : ["description"],
                }));
              }}
            />
          </FormField>

          <FormField label={t("groupTasksTemplate")}>
            <Input
              value={config.tasksLineTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, tasksLineTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label={t("dmTasksTemplate")}>
            <Input
              value={config.tasksDmLineTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, tasksDmLineTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label={t("unlinkedGroupMessage")}>
            <textarea
              className="min-h-[4rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.tasksUnlinkedGroupTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, tasksUnlinkedGroupTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label={t("reportDescriptionPrompt")}>
            <textarea
              className="min-h-[4rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.taskReportDescriptionPromptTemplate}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  taskReportDescriptionPromptTemplate: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label={t("reportMediaPrompt")}>
            <textarea
              className="min-h-[4rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.taskReportMediaPromptTemplate}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  taskReportMediaPromptTemplate: e.target.value,
                }))
              }
            />
          </FormField>
        </div>

        {error ? (
          <FormAlert variant="error" title={t("saveErrorTitle")} className="mb-4">
            {error}
          </FormAlert>
        ) : null}
        {message ? (
          <FormAlert variant="success" title={t("saveSuccessTitle")} className="mb-4">
            {message}
          </FormAlert>
        ) : null}

        <footer className="flex flex-wrap gap-3 border-t border-[var(--color-border-default)] pt-6">
          <Button type="button" disabled={!isDirty || saving} onClick={() => void handleSave()}>
            {saving ? tAdmin("editorToolbar.saving") : t("saveSettings")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || saving}
            onClick={() => setConfig(savedConfig)}
          >
            {t("reset")}
          </Button>
        </footer>
      </div>
    </StaticPageShell>
  );
}

export default TelegramWorkspaceEditorShell;
