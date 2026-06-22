"use client";

/**
 * @fileoverview Combined date and time picker for scheduled page publishing.
 *
 * Uses Shadcn {@link Calendar} + time input; stores ISO strings in UTC-local wall time.
 *
 * @module src/components/ui/NexusDateTimePicker
 */

import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  combineDateAndTime,
  formatTimeHHmm,
  normalizePublishAt,
} from "@shared/lib/pagePublicationLogic";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Props for {@link NexusDateTimePicker}. */
export interface NexusDateTimePickerProps {
  /** ISO string or null when unset (publish immediately). */
  value: string | null;
  /** Called when the combined date/time changes. */
  onChange: (iso: string | null) => void;
  /** Disable interaction. */
  disabled?: boolean;
  /** Optional className on the trigger row. */
  className?: string;
  /** Label when no date is selected. */
  emptyLabel?: string;
  /** Clear button copy in the popover. */
  clearLabel?: string;
  /** Optional class on the trigger button (defaults to puck input styling). */
  triggerClassName?: string;
}

/**
 * Date + time picker row for delayed publishing schedules.
 *
 * @param props - Controlled ISO value and change handler.
 * @returns Popover calendar with HH:mm input.
 */
export function NexusDateTimePicker({
  value,
  onChange,
  disabled = false,
  className,
  emptyLabel = "Publish immediately",
  clearLabel = "Clear schedule",
  triggerClassName,
}: NexusDateTimePickerProps) {
  const parsed = normalizePublishAt(value);
  const [timeDraft, setTimeDraft] = useState(parsed ? formatTimeHHmm(parsed) : "09:00");

  const selectedDate = parsed ?? undefined;

  const label = useMemo(() => {
    if (!parsed) return emptyLabel;
    return parsed.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [emptyLabel, parsed]);

  const applyDate = (date: Date | undefined) => {
    if (!date) {
      onChange(null);
      return;
    }
    const combined = combineDateAndTime(date, timeDraft);
    onChange(combined ? combined.toISOString() : null);
  };

  const applyTime = (nextTime: string) => {
    setTimeDraft(nextTime);
    const base = parsed ?? new Date();
    const combined = combineDateAndTime(base, nextTime);
    onChange(combined ? combined.toISOString() : null);
  };

  return (
    <div className={cn("nexus-datetime-picker", className)}>
      <Popover>
        <PopoverTrigger
          type="button"
          disabled={disabled}
          className={cn(
            "nexus-datetime-picker__trigger flex w-full items-center gap-2",
            triggerClassName ?? "nexus-puck-input",
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => applyDate(date)}
            disabled={disabled}
          />
          <div className="border-t border-(--color-border-default) px-3 py-2">
            <label className="mb-1 block text-[11px] font-medium text-(--color-text-secondary)">
              Time
            </label>
            <input
              type="time"
              className="nexus-puck-input w-full"
              value={timeDraft}
              disabled={disabled}
              onChange={(e) => applyTime(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(null)}
              >
                {clearLabel}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default NexusDateTimePicker;
