"use client";

/**
 * @fileoverview Assignment notification targets when a task is dispatched.
 *
 * @module src/components/tasks/TaskAssignmentNotifyField
 */

import React from "react";
import type { TaskAssignmentNotifyTarget } from "@shared/constants/taskSettings";
import { TASK_ASSIGNMENT_NOTIFY_TARGETS } from "@shared/constants/taskSettings";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

/** Props for {@link TaskAssignmentNotifyField}. */
export interface TaskAssignmentNotifyFieldProps {
  /** Selected notification targets. */
  value: TaskAssignmentNotifyTarget[];
  /** Called when selection changes. */
  onChange: (next: TaskAssignmentNotifyTarget[]) => void;
  disabled?: boolean;
}

const TARGET_LABELS: Record<TaskAssignmentNotifyTarget, string> = {
  telegram_dm: "Telegram DM",
  telegram_group: "Project group chat",
};

/**
 * Multi-select pills for where performers are notified on dispatch.
 *
 * @param props - Controlled target list.
 * @returns Assignment notify field JSX.
 */
export function TaskAssignmentNotifyField({
  value,
  onChange,
  disabled = false,
}: TaskAssignmentNotifyFieldProps) {
  /** Toggle one target (empty selection allowed — no Telegram ping). */
  function toggle(target: TaskAssignmentNotifyTarget) {
    if (disabled) return;
    if (value.includes(target)) {
      onChange(value.filter((entry) => entry !== target));
      return;
    }
    onChange([...value, target]);
  }

  return (
    <FormField
      label="Notify performers on dispatch"
      hint="Telegram DM reaches each performer privately. Group chat posts to the linked project workspace when the task belongs to a group."
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Assignment notification targets">
        {TASK_ASSIGNMENT_NOTIFY_TARGETS.map((target) => {
          const active = value.includes(target);
          return (
            <button
              key={target}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => toggle(target)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-[var(--color-accent-user)] bg-[color-mix(in_srgb,var(--color-accent-user)_18%,transparent)] text-[var(--color-text-primary)]"
                  : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-user)] hover:text-[var(--color-text-primary)]",
              )}
            >
              {TARGET_LABELS[target]}
            </button>
          );
        })}
      </div>
    </FormField>
  );
}

export default TaskAssignmentNotifyField;
