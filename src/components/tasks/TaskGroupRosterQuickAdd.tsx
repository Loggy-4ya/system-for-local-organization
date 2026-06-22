"use client";

/**
 * @fileoverview Quick-add buttons for project roster members on task create.
 *
 * @module src/components/tasks/TaskGroupRosterQuickAdd
 */

import React, { useEffect, useState } from "react";
import type { TaskGroupRosterRow } from "@shared/domains/TaskGroupDomain";
import type { TaskPerformerEntry } from "@/components/users/UserSearchPicker";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { taskFormInsetPanelClass } from "@/components/tasks/taskFormTokens";
import { cn } from "@/lib/utils";

/** Props for {@link TaskGroupRosterQuickAdd}. */
export interface TaskGroupRosterQuickAddProps {
  /** Parent project id when attaching a task part. */
  groupId: string | null;
  /** Current performer selection on the task form. */
  performers: TaskPerformerEntry[];
  /** Called when roster members are added to performers. */
  onAddPerformers: (entries: TaskPerformerEntry[]) => void;
  /** Disables quick-add buttons. */
  disabled?: boolean;
}

/**
 * Offer one-click assignment from the parent project's planned roster.
 *
 * @param props - Group id and performer state.
 * @returns Quick-add panel or null when no roster is available.
 */
export function TaskGroupRosterQuickAdd({
  groupId,
  performers,
  onAddPerformers,
  disabled = false,
}: TaskGroupRosterQuickAddProps) {
  const [roster, setRoster] = useState<TaskGroupRosterRow[]>([]);

  useEffect(() => {
    if (!groupId) {
      setRoster([]);
      return;
    }

    let cancelled = false;

    async function loadRoster() {
      const res = await fetch(`/api/task-groups/${groupId}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { roster?: TaskGroupRosterRow[] };
      setRoster(data.roster ?? []);
    }

    void loadRoster();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const assignedIds = new Set(performers.map((row) => row.userId));
  const available = roster.filter((row) => !assignedIds.has(row.userId));

  if (!groupId || available.length === 0) {
    return null;
  }

  return (
    <div className={cn(taskFormInsetPanelClass, "flex flex-col gap-2 p-3")}>
      <p className="text-xs font-medium text-[var(--color-text-primary)]">Add from project team</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {available.map((row) => (
          <li key={row.userId}>
            <button
              type="button"
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-panel)] disabled:opacity-60"
              onClick={() =>
                onAddPerformers([
                  {
                    userId: row.userId,
                    displayName: row.displayName,
                    avatar: row.avatar,
                    roleLabel: row.roleLabel ?? "",
                  },
                ])
              }
            >
              <UserAvatarImage src={row.avatar} alt={row.displayName} size={20} />
              <span>{row.displayName}</span>
              {row.roleLabel ? (
                <span className="text-[var(--color-text-secondary)]">· {row.roleLabel}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskGroupRosterQuickAdd;
