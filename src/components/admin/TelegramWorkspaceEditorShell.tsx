"use client";

/**
 * @fileoverview Admin editor for Telegram project workspace automation policy.
 *
 * @module src/components/admin/TelegramWorkspaceEditorShell
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
      setError(typeof data.error === "string" ? data.error : "Save failed.");
      setSaving(false);
      return;
    }
    setConfig(data.config);
    setSavedConfig(data.config);
    setMessage("Settings saved.");
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
                Telegram project workspaces
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
                Control how multi-part projects bind to Telegram groups. Changes apply immediately
                — no redeploy. Auto-create requires an operator MTProto session in{" "}
                <code className="text-xs">TELEGRAM_OPERATOR_SESSION</code>.
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
          >
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
            Admin hub
          </Link>
        </header>

        <div className="flex flex-col gap-6 py-8">
          <FormAlert variant="info" title="Operator session">
            {config.workerEnvReady
              ? "telegram-worker env is complete — auto-create runs when the worker container is up."
              : config.operatorSessionConfigured
                ? "Session string present but worker env incomplete — set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_BOT_TOKEN on the worker host."
                : "No operator session configured. Projects use manual /link until TELEGRAM_OPERATOR_SESSION is set."}
          </FormAlert>

          <TaskFormCheckbox
            label="Enable Telegram workspaces"
            description="When off, no provisioning or dismantle jobs run."
            checked={config.enabled}
            onChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Default strategy">
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
                  <SelectValue placeholder="Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" label="Automatic">
                    Automatic (session or manual fallback)
                  </SelectItem>
                  <SelectItem value="manual_link" label="Manual link">
                    Manual link only
                  </SelectItem>
                  <SelectItem value="user_session" label="Operator session">
                    Operator session only
                  </SelectItem>
                  <SelectItem value="disabled" label="Disabled">
                    Disabled
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Minimum performers for auto group">
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
            label="Auto-provision when project activates"
            description="Queue workspace setup when a project becomes active."
            checked={config.autoProvisionOnActivate}
            onChange={(autoProvisionOnActivate) =>
              setConfig((prev) => ({ ...prev, autoProvisionOnActivate }))
            }
          />

          <TaskFormCheckbox
            label="Dismantle workspace when project completes"
            checked={config.dismantleOnComplete}
            onChange={(dismantleOnComplete) =>
              setConfig((prev) => ({ ...prev, dismantleOnComplete }))
            }
          />

          <TaskFormCheckbox
            label="Create Telegram forum topic per task part"
            description="When the linked group has Topics enabled, Nexus opens a branch for each dispatched child task."
            checked={config.createForumTopicPerTask}
            onChange={(createForumTopicPerTask) =>
              setConfig((prev) => ({ ...prev, createForumTopicPerTask }))
            }
          />

          <FormField
            label="Task forum topic welcome message"
            hint="Placeholders: {{taskTitle}}, {{taskUrl}}, {{title}}, {{projectUrl}}"
          >
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

          <FormField label="On complete action">
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
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="archive_notice" label="Post notice">
                  Post completion notice in group
                </SelectItem>
                <SelectItem value="leave" label="Bot leaves">
                  Bot leaves the group
                </SelectItem>
                <SelectItem value="none" label="None">
                  No action
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Group title template"
            hint={`Placeholders: ${TELEGRAM_WORKSPACE_TEMPLATE_PLACEHOLDERS.join(", ")}`}
          >
            <Input
              value={config.groupTitleTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, groupTitleTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Welcome message (after /link)">
            <textarea
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.groupWelcomeTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, groupWelcomeTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Manual link instructions (DM to author)">
            <textarea
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.linkCommandHelpTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, linkCommandHelpTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Completion notice">
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
              Bot task commands
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              `/tasks`, `/task_report`, `/see_report`, and optional `/completed` in DM and linked
              project groups. Placeholders:{" "}
              {TELEGRAM_WORKSPACE_TEMPLATE_PLACEHOLDERS.join(", ")}, {"{{index}}"}, {"{{statusLabel}}"}
              , {"{{dueAtShort}}"}, {"{{description}}"}, {"{{mediaCount}}"}.
            </p>
          </div>

          <TaskFormCheckbox
            label="Enable /completed for dispatch admins"
            description="When off, the bot rejects /completed even for institution admins."
            checked={config.botCompletedCommandEnabled}
            onChange={(botCompletedCommandEnabled) =>
              setConfig((prev) => ({ ...prev, botCompletedCommandEnabled }))
            }
          />

          <FormField
            label="Report wizard step order"
            hint="Comma-separated: description, media — media is skipped when a task disallows proof attachments."
          >
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

          <FormField label="Group /tasks line template">
            <Input
              value={config.tasksLineTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, tasksLineTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label="DM /tasks line template">
            <Input
              value={config.tasksDmLineTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, tasksDmLineTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Unlinked group message">
            <textarea
              className="min-h-[4rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={config.tasksUnlinkedGroupTemplate}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, tasksUnlinkedGroupTemplate: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Report description prompt">
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

          <FormField label="Report media prompt">
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
          <FormAlert variant="error" title="Could not save" className="mb-4">
            {error}
          </FormAlert>
        ) : null}
        {message ? (
          <FormAlert variant="success" title="Saved" className="mb-4">
            {message}
          </FormAlert>
        ) : null}

        <footer className="flex flex-wrap gap-3 border-t border-[var(--color-border-default)] pt-6">
          <Button type="button" disabled={!isDirty || saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || saving}
            onClick={() => setConfig(savedConfig)}
          >
            Reset
          </Button>
        </footer>
      </div>
    </StaticPageShell>
  );
}

export default TelegramWorkspaceEditorShell;
