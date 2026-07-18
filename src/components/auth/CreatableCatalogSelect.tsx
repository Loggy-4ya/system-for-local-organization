/**
 * @fileoverview Creatable catalog select — pick an approved option or type a new value.
 *
 * New values are stored on the user immediately and queued for administrator review
 * in the academic catalog.
 *
 * @module src/components/auth/CreatableCatalogSelect
 */

"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Sentinel value for the "type custom value" select option. */
export const CREATABLE_CUSTOM_VALUE = "__custom__";

/** Props for {@link CreatableCatalogSelect}. */
export interface CreatableCatalogSelectProps {
  /** Field id prefix for label association. */
  id: string;
  /** Current value — either a catalog label or a custom string. */
  value: string;
  /** Called when the value changes. */
  onChange: (value: string) => void;
  /** Approved catalog labels for the dropdown. */
  options: string[];
  /** Placeholder for custom text input. */
  placeholder?: string;
  /** Whether the control is disabled. */
  disabled?: boolean;
  /** Additional class name for the wrapper. */
  className?: string;
  /** When true, custom entry accepts digits only (used for group number). */
  numericOnly?: boolean;
  /** Fired when the custom text input loses focus (content-policy live validation). */
  onBlur?: () => void;
}

/**
 * Select from approved catalog values or enter a custom specialty/group label.
 *
 * @param props - See {@link CreatableCatalogSelectProps}.
 * @returns Creatable select control.
 */
export function CreatableCatalogSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
  numericOnly = false,
  onBlur,
}: CreatableCatalogSelectProps) {
  const t = useTranslations("auth.catalogSelect");
  const resolvedPlaceholder = placeholder ?? t("placeholder");
  const listId = useId();
  const [customEntryActive, setCustomEntryActive] = useState(false);

  const trimmedValue = value.trim();
  const matchesCatalog = options.some(
    (opt) => opt.trim().toLowerCase() === trimmedValue.toLowerCase(),
  );

  /** Keep custom mode when the user already typed a non-catalog value. */
  useEffect(() => {
    if (trimmedValue !== "" && !matchesCatalog) {
      setCustomEntryActive(true);
    }
  }, [trimmedValue, matchesCatalog]);

  const selectValue = customEntryActive
    ? CREATABLE_CUSTOM_VALUE
    : trimmedValue === ""
      ? ""
      : matchesCatalog
        ? trimmedValue
        : CREATABLE_CUSTOM_VALUE;

  const showCustomInput = customEntryActive || selectValue === CREATABLE_CUSTOM_VALUE;

  /**
   * Normalise user input — strip non-digits when {@link numericOnly} is set.
   *
   * @param raw - Raw input string.
   * @returns Sanitised value passed to {@link onChange}.
   */
  function handleCustomInput(raw: string): void {
    if (numericOnly) {
      onChange(raw.replace(/\D/g, ""));
      return;
    }
    onChange(raw);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (!next) {
            setCustomEntryActive(false);
            onChange("");
            return;
          }

          if (next === CREATABLE_CUSTOM_VALUE) {
            setCustomEntryActive(true);
            if (matchesCatalog) {
              onChange("");
            }
            return;
          }

          setCustomEntryActive(false);
          onChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" size="sm">
          <SelectValue placeholder={t("selectFromList")}>
            {selectValue === CREATABLE_CUSTOM_VALUE ? t("otherTypeBelow") : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
          <SelectItem value={CREATABLE_CUSTOM_VALUE}>{t("otherTypeBelow")}</SelectItem>
        </SelectContent>
      </Select>

      {showCustomInput && (
        <Input
          list={numericOnly ? undefined : listId}
          value={value}
          onChange={(e) => handleCustomInput(e.target.value)}
          onBlur={numericOnly ? undefined : onBlur}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          inputMode={numericOnly ? "numeric" : "text"}
          pattern={numericOnly ? "[0-9]*" : undefined}
          aria-label={`Custom ${id}`}
        />
      )}

      {!numericOnly && (
        <datalist id={listId}>
          {options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export default CreatableCatalogSelect;
