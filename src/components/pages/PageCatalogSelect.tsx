"use client";

/**
 * @fileoverview Styled select control for `/pages` catalog editor surfaces.
 *
 * @module src/components/pages/PageCatalogSelect
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** One option for {@link PageCatalogSelect}. */
export interface PageCatalogSelectOption {
  value: string;
  label: string;
}

/** Props for {@link PageCatalogSelect}. */
export interface PageCatalogSelectProps {
  value: string;
  options: readonly PageCatalogSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
}

/**
 * Catalog-styled select — matches `/pages` island controls.
 *
 * @param props - Select configuration.
 * @returns Styled select markup.
 */
export function PageCatalogSelect({
  value,
  options,
  onValueChange,
  placeholder = "Select…",
  disabled = false,
  className,
  triggerClassName,
  "aria-label": ariaLabel,
}: PageCatalogSelectProps) {
  const active = options.find((option) => option.value === value);

  return (
    <div className={cn("page-catalog-select", className)}>
      <Select value={value} onValueChange={(next) => onValueChange(next ?? "")} disabled={disabled}>
        <SelectTrigger
          size="sm"
          aria-label={ariaLabel}
          className={cn("page-catalog-select__trigger", triggerClassName)}
        >
          <SelectValue placeholder={placeholder}>{active?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="page-catalog-select__content">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} label={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default PageCatalogSelect;
