"use client";

/**
 * @fileoverview Yearly calendar date list for institutional rules (month/day repeats).
 *
 * @module src/components/admin/InstitutionalYearlyAnchorField
 */

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import type { InstitutionalYearlyAnchor } from "@shared/constants/institutionalCalendar";
import { MAX_INSTITUTIONAL_YEARLY_ANCHORS } from "@shared/constants/institutionalCalendar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Props for {@link InstitutionalYearlyAnchorField}. */
export interface InstitutionalYearlyAnchorFieldProps {
  /** Yearly anchor rows. */
  value: InstitutionalYearlyAnchor[];
  /** Called when anchors change. */
  onChange: (next: InstitutionalYearlyAnchor[]) => void;
  /** Disable interaction. */
  disabled?: boolean;
  /** Optional class on root. */
  className?: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Add yearly repeating calendar anchors (month/day + time).
 *
 * @param props - Controlled anchor list.
 * @returns Anchor field JSX.
 */
export function InstitutionalYearlyAnchorField({
  value,
  onChange,
  disabled = false,
  className,
}: InstitutionalYearlyAnchorFieldProps) {
  const [timeDraft, setTimeDraft] = useState("09:00");
  const [open, setOpen] = useState(false);

  /** Append month/day from calendar selection. */
  function addAnchor(date: Date | undefined) {
    if (!date || value.length >= MAX_INSTITUTIONAL_YEARLY_ANCHORS) return;
    const anchor: InstitutionalYearlyAnchor = {
      month: date.getMonth() + 1,
      day: date.getDate(),
      atTime: timeDraft,
    };
    const key = `${anchor.month}-${anchor.day}-${anchor.atTime}`;
    if (value.some((row) => `${row.month}-${row.day}-${row.atTime}` === key)) return;
    onChange(
      [...value, anchor].sort((a, b) =>
        a.month !== b.month ? a.month - b.month : a.day !== b.day ? a.day - b.day : a.atTime.localeCompare(b.atTime),
      ),
    );
    setOpen(false);
  }

  /** Remove one anchor row. */
  function removeAnchor(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled || value.length >= MAX_INSTITUTIONAL_YEARLY_ANCHORS}
          className="nexus-puck-input flex w-full items-center gap-2"
        >
          <CalendarIcon className="size-4 opacity-70" aria-hidden="true" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            Add yearly date ({value.length}/{MAX_INSTITUTIONAL_YEARLY_ANCHORS})
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" onSelect={(date) => addAnchor(date)} disabled={disabled} />
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

      {value.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {value.map((anchor, index) => (
            <li
              key={`${anchor.month}-${anchor.day}-${anchor.atTime}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border-default)] px-3 py-2 text-sm"
            >
              <span>
                Every {anchor.day} {MONTH_NAMES[anchor.month - 1]} at {anchor.atTime}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAnchor(index)}
                aria-label="Remove yearly date"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)]">No yearly dates yet.</p>
      )}
    </div>
  );
}

export default InstitutionalYearlyAnchorField;
