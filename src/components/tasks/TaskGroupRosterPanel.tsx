"use client";

/**
 * @fileoverview Editable planned roster panel for task group create/detail surfaces.
 *
 * @module src/components/tasks/TaskGroupRosterPanel
 */

import React, { useState } from "react";
import type { TaskGroupRosterRow } from "@shared/domains/TaskGroupDomain";
import {
  TaskPerformerPicker,
  type TaskPerformerEntry,
} from "@/components/users/UserSearchPicker";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { FormField } from "@/components/ui/form-field";

/** Props for {@link TaskGroupRosterPanel}. */
export interface TaskGroupRosterPanelProps {
  /** Controlled roster rows. */
  value: TaskPerformerEntry[];
  /** Called when roster changes. */
  onChange: (next: TaskPerformerEntry[]) => void;
  /** When set, renders a save button that PATCHes the group roster. */
  groupId?: string | null;
  /** Disables inputs and save. */
  disabled?: boolean;
  /** Read-only display without picker (for performers who can view only). */
  readOnly?: boolean;
}

/**
 * Planned project team editor — search members and optional role labels.
 *
 * @param props - Controlled roster state and optional persist target.
 * @returns Roster panel JSX.
 */
export function TaskGroupRosterPanel({
  value,
  onChange,
  groupId = null,
  disabled = false,
  readOnly = false,
}: TaskGroupRosterPanelProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /** Persist roster to the group API. */
  async function handleSave() {
    if (!groupId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const res = await fetch(`/api/task-groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roster: value.map((row) => ({
          userId: row.userId,
          roleLabel: row.roleLabel.trim() || undefined,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save project team.");
      setSaving(false);
      return;
    }

    setSuccess("Project team saved.");
    setSaving(false);
  }

  if (readOnly) {
    if (value.length === 0) {
      return (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No project team members planned yet.
        </p>
      );
    }

    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {value.map((row) => (
          <li
            key={row.userId}
            className="text-sm text-[var(--color-text-primary)]"
          >
            {row.displayName}
            {row.roleLabel ? (
              <span className="text-[var(--color-text-secondary)]"> · {row.roleLabel}</span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField
        label="Project team"
        hint="Plan performers before creating task parts. They can be assigned to parts with one click later."
      >
        <TaskPerformerPicker value={value} onChange={onChange} disabled={disabled || saving} />
      </FormField>

      {groupId ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving team…" : "Save project team"}
          </Button>
          {success ? <span className="text-xs text-[var(--color-text-secondary)]">{success}</span> : null}
        </div>
      ) : null}

      {error ? (
        <FormAlert variant="error" title="Could not save team">
          {error}
        </FormAlert>
      ) : null}
    </div>
  );
}

/** Map API roster rows to performer picker entries. */
export function rosterRowsToPerformerEntries(rows: TaskGroupRosterRow[]): TaskPerformerEntry[] {
  return rows.map((row) => ({
    userId: row.userId,
    displayName: row.displayName,
    avatar: row.avatar,
    roleLabel: row.roleLabel ?? "",
  }));
}

export default TaskGroupRosterPanel;
