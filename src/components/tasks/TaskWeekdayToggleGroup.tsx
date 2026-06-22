"use client";

/**
 * @fileoverview Square weekday toggles for week-based task reminder schedules.
 *
 * @module src/components/tasks/TaskWeekdayToggleGroup
 */

import React from "react";
import {
  TASK_REMINDER_WEEKDAY_LABELS,
  TASK_REMINDER_WEEKDAY_UI_ORDER,
  type TaskReminderWeekday,
} from "@shared/constants/taskSettings";
import { cn } from "@/lib/utils";

/** Props for {@link TaskWeekdayToggleGroup}. */
export interface TaskWeekdayToggleGroupProps {
  /** Selected weekday indices (`Date#getDay()` 0–6). */
  value: number[];
  /** Called when selection changes. */
  onChange: (next: number[]) => void;
  /** Disable interaction. */
  disabled?: boolean;
}

/**
 * Multi-select square buttons for weekdays (Mon-first layout).
 *
 * @param props - Controlled weekday list.
 * @returns Weekday toggle JSX.
 */
export function TaskWeekdayToggleGroup({
  value,
  onChange,
  disabled = false,
}: TaskWeekdayToggleGroupProps) {
  /** Toggle one weekday while preserving at least one selection. */
  function toggle(day: TaskReminderWeekday) {
    if (disabled) return;
    if (value.includes(day)) {
      const next = value.filter((entry) => entry !== day);
      if (next.length > 0) onChange(next.sort((a, b) => a - b));
      return;
    }
    onChange([...value, day].sort((a, b) => a - b));
  }

  return (
    <div
      className="flex flex-wrap gap-1"
      role="group"
      aria-label="Days of the week"
    >
      {TASK_REMINDER_WEEKDAY_UI_ORDER.map((day) => {
        const active = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            aria-label={TASK_REMINDER_WEEKDAY_LABELS[day]}
            onClick={() => toggle(day)}
            className={cn(
              "flex h-7 min-w-7 items-center justify-center rounded-md border px-1 text-[0.6875rem] font-semibold leading-none transition-colors",
              active
                ? "border-[var(--color-accent-user)] bg-[color-mix(in_srgb,var(--color-accent-user)_18%,transparent)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-user)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {TASK_REMINDER_WEEKDAY_LABELS[day]}
          </button>
        );
      })}
    </div>
  );
}

export default TaskWeekdayToggleGroup;
