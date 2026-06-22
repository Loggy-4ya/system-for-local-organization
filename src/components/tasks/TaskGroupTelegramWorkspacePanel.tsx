"use client";

/**
 * @fileoverview Telegram workspace status and controls on project detail.
 *
 * @module src/components/tasks/TaskGroupTelegramWorkspacePanel
 */

import React, { useState } from "react";
import type { TaskGroupTelegramWorkspaceDto } from "@shared/domains/TelegramWorkspaceDomain";
import {
  TELEGRAM_WORKSPACE_STATE_LABELS,
  TELEGRAM_WORKSPACE_STRATEGY_LABELS,
  TELEGRAM_WORKSPACE_PROJECT_STRATEGIES,
  TELEGRAM_OPERATOR_PENDING_ACTION_LABELS,
  type TelegramWorkspaceStrategy,
} from "@shared/constants/telegramWorkspace";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Props for {@link TaskGroupTelegramWorkspacePanel}. */
export interface TaskGroupTelegramWorkspacePanelProps {
  /** Project id. */
  groupId: string;
  /** Current workspace DTO from detail API. */
  workspace: TaskGroupTelegramWorkspaceDto;
  /** Whether viewer may edit project settings. */
  canEdit: boolean;
  /** Called after a successful patch to refresh detail. */
  onUpdated?: () => void;
}

/**
 * Project Telegram workspace panel — strategy, link token, re-queue.
 *
 * @param props - Workspace state and edit capability.
 * @returns Panel JSX.
 */
export function TaskGroupTelegramWorkspacePanel({
  groupId,
  workspace,
  canEdit,
  onUpdated,
}: TaskGroupTelegramWorkspacePanelProps) {
  const [strategy, setStrategy] = useState<TelegramWorkspaceStrategy>(workspace.strategy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** PATCH workspace strategy and optionally re-queue provisioning. */
  async function save(requeue: boolean) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/task-groups/${groupId}/telegram-workspace`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy, requeue }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Update failed.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onUpdated?.();
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
      <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Telegram workspace</h2>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
        Status: {TELEGRAM_WORKSPACE_STATE_LABELS[workspace.state]} · Resolved:{" "}
        {workspace.resolvedStrategy.replace("_", " ")}
        {workspace.forumEnabled ? " · Forum topics on" : " · Forum topics off"}
      </p>

      {workspace.operatorPendingAction ? (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Operator job queued:{" "}
          {TELEGRAM_OPERATOR_PENDING_ACTION_LABELS[workspace.operatorPendingAction]}
        </p>
      ) : null}

      {workspace.chatTitle ? (
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Linked group: <strong>{workspace.chatTitle}</strong>
          {workspace.inviteLink ? (
            <>
              {" "}
              ·{" "}
              <a
                href={workspace.inviteLink}
                className="text-[var(--color-accent-user)] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Invite link
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {workspace.linkToken && workspace.state !== "active" ? (
        <FormAlert variant="info" title="Manual link (fallback)" className="mt-3">
          <p className="text-sm">
            When the operator worker is running, Nexus auto-creates the project group. If you must
            link an existing chat, add the bot and run:
            <code className="mx-1 rounded bg-[var(--color-bg-surface)] px-1.5 py-0.5 text-xs">
              /link {workspace.linkToken}
            </code>
          </p>
          {workspace.linkInstructions ? (
            <p className="mt-2 whitespace-pre-wrap text-xs">{workspace.linkInstructions}</p>
          ) : null}
        </FormAlert>
      ) : null}

      {workspace.lastError ? (
        <FormAlert variant="error" title="Last error" className="mt-3">
          {workspace.lastError}
        </FormAlert>
      ) : null}

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-4">
          <FormField label="Project strategy override">
            <Select
              value={strategy}
              onValueChange={(value) => setStrategy(value as TelegramWorkspaceStrategy)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                {TELEGRAM_WORKSPACE_PROJECT_STRATEGIES.map((entry) => (
                  <SelectItem key={entry} value={entry} label={TELEGRAM_WORKSPACE_STRATEGY_LABELS[entry]}>
                    {TELEGRAM_WORKSPACE_STRATEGY_LABELS[entry]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void save(false)}>
              Save strategy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void save(true)}
            >
              Save &amp; re-queue setup
            </Button>
          </div>

          {error ? (
            <FormAlert variant="error" title="Update failed">
              {error}
            </FormAlert>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default TaskGroupTelegramWorkspacePanel;
