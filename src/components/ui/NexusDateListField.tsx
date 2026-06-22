"use client";

/**
 * @fileoverview Multi-date picker for explicit reminder schedules.
 *
 * Uses Shadcn {@link Calendar} + time input; stores ISO strings ascending.
 *
 * @module src/components/ui/NexusDateListField
 */

import { useMemo, useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import {
  combineDateAndTime,
  formatTimeHHmm,
  normalizePublishAt,
} from "@shared/lib/pagePublicationLogic";
import { MAX_TASK_REMINDER_SCHEDULED_DATES } from "@shared/constants/taskSettings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Props for {@link NexusDateListField}. */
export interface NexusDateListFieldProps {
  /** ISO date strings. */
  value: string[];
  /** Called when the date list changes. */
  onChange: (next: string[]) => void;
  /** Disable interaction. */
  disabled?: boolean;
  /** Optional class on the root. */
  className?: string;
  /** Optional class on the add trigger. */
  triggerClassName?: string;
}

/**
 * Add, list, and remove explicit reminder instants.
 *
 * @param props - Controlled ISO date array.
 * @returns Date list field JSX.
 */
export function NexusDateListField({
  value,
  onChange,
  disabled = false,
  className,
  triggerClassName,
}: NexusDateListFieldProps) {
  const [timeDraft, setTimeDraft] = useState("09:00");
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...value]
        .map((iso) => ({ iso, date: new Date(iso) }))
        .filter((row) => !Number.isNaN(row.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [value],
  );

  /** Append a calendar date at the chosen clock time. */
  function addDate(date: Date | undefined) {
    if (!date || sorted.length >= MAX_TASK_REMINDER_SCHEDULED_DATES) return;
    const combined = combineDateAndTime(date, timeDraft);
    if (!combined) return;
    const iso = combined.toISOString();
    if (value.includes(iso)) return;
    onChange([...value, iso].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()));
    setOpen(false);
  }

  /** Remove one ISO instant. */
  function removeDate(iso: string) {
    onChange(value.filter((entry) => entry !== iso));
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled || sorted.length >= MAX_TASK_REMINDER_SCHEDULED_DATES}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-[var(--color-border-default)] px-3 py-2 text-sm",
            triggerClassName,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
          <span className="truncate text-[var(--color-text-secondary)]">
            Add reminder date ({sorted.length}/{MAX_TASK_REMINDER_SCHEDULED_DATES})
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" onSelect={(date) => addDate(date)} disabled={disabled} />
          <div className="border-t border-[var(--color-border-default)] px-3 py-2">
            <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">
              Time
            </label>
            <input
              type="time"
              className="nexus-puck-input w-full"
              value={timeDraft}
              disabled={disabled}
              onChange={(e) => setTimeDraft(e.target.value)}
            />
          </div>
        </PopoverContent>
      </Popover>

      {sorted.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {sorted.map((row) => (
            <li
              key={row.iso}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-3 py-2 text-sm"
            >
              <span className="text-[var(--color-text-primary)]">
                {row.date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeDate(row.iso)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label="Remove date"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)]">No dates selected yet.</p>
      )}
    </div>
  );
}

export default NexusDateListField;
