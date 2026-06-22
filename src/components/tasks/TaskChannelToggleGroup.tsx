"use client";

/**
 * @fileoverview Pill channel toggles for task reminder delivery settings.
 *
 * @module src/components/tasks/TaskChannelToggleGroup
 */

import React from "react";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";
import { cn } from "@/lib/utils";

/** Props for {@link TaskChannelToggleGroup}. */
export interface TaskChannelToggleGroupProps {
  /** Selected channels — at least one must remain active. */
  value: TaskReminderChannel[];
  /** Called when selection changes. */
  onChange: (next: TaskReminderChannel[]) => void;
  disabled?: boolean;
}

const CHANNEL_LABELS: Record<TaskReminderChannel, string> = {
  web: "Web",
  telegram: "Telegram",
};

/**
 * Multi-select pill group for reminder delivery channels.
 *
 * @param props - Controlled channel list.
 * @returns Channel toggle JSX.
 */
export function TaskChannelToggleGroup({ value, onChange, disabled = false }: TaskChannelToggleGroupProps) {
  /** Toggle one channel while preserving at least one selection. */
  function toggle(channel: TaskReminderChannel) {
    if (disabled) return;
    if (value.includes(channel)) {
      const next = value.filter((entry) => entry !== channel);
      if (next.length > 0) onChange(next);
      return;
    }
    onChange([...value, channel]);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Delivery channels">
      {(["web", "telegram"] as const).map((channel) => {
        const active = value.includes(channel);
        return (
          <button
            key={channel}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => toggle(channel)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-[var(--color-accent-user)] bg-[color-mix(in_srgb,var(--color-accent-user)_18%,transparent)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-user)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {CHANNEL_LABELS[channel]}
          </button>
        );
      })}
    </div>
  );
}

export default TaskChannelToggleGroup;
