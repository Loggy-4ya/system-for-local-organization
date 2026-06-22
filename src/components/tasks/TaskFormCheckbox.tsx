"use client";

/**
 * @fileoverview Styled checkbox row for task form toggles.
 *
 * @module src/components/tasks/TaskFormCheckbox
 */

import React, { useId } from "react";
import { cn } from "@/lib/utils";

/** Props for {@link TaskFormCheckbox}. */
export interface TaskFormCheckboxProps {
  /** Checkbox label. */
  label: React.ReactNode;
  /** Optional secondary line under the label. */
  description?: string;
  /** Controlled checked state. */
  checked: boolean;
  /** Change handler. */
  onChange: (checked: boolean) => void;
  /** Disable interaction. */
  disabled?: boolean;
  /** Optional id override. */
  id?: string;
  className?: string;
}

/**
 * Accessible checkbox row with Nexus task-form spacing.
 *
 * @param props - Label, state, and optional description.
 * @returns Checkbox row JSX.
 */
export function TaskFormCheckbox({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
  className,
}: TaskFormCheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-transparent px-1 py-0.5 transition-colors",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent-user)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export default TaskFormCheckbox;
