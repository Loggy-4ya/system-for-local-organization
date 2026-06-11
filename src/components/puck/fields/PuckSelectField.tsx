"use client";

/**
 * @fileoverview Shadcn Select wrapper for Puck sidebar fields.
 *
 * @module src/components/puck/fields/PuckSelectField
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Single option for {@link PuckSelectField}. */
export interface PuckSelectOption {
  label: string;
  value: string;
}

/** Props for {@link PuckSelectField}. */
export interface PuckSelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: PuckSelectOption[];
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

/**
 * Puck-styled select built on Shadcn Select (Base UI).
 *
 * @param props - Value, change handler, and option list.
 * @returns Select control.
 */
export function PuckSelectField({
  value,
  onChange,
  options,
  className,
  triggerClassName,
  placeholder,
}: PuckSelectFieldProps) {
  const storedValue = String(value ?? "");
  const selectedLabel =
    options.find((opt) => opt.value === storedValue)?.label ?? storedValue;

  return (
    <Select value={storedValue} onValueChange={(next) => onChange(next ?? "")}>
      <SelectTrigger className={cn("nexus-puck-select-trigger w-full", triggerClassName)} size="sm">
        <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className={className}>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default PuckSelectField;
