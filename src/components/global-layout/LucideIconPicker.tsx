"use client";

/**
 * @fileoverview Curated Lucide icon picker for site layout editing (icon-only UI).
 *
 * @module src/components/global-layout/LucideIconPicker
 */

import React from "react";
import { Ban } from "lucide-react";
import { ALLOWED_LUCIDE_ICONS, type AllowedLucideIcon } from "@shared/constants/globalLayout";
import { resolveLucideIcon, siteChromeLucideProps } from "./resolveLucideIcon";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Props for {@link LucideIconPicker}. */
interface LucideIconPickerProps {
  /** Current icon name, or empty for none. */
  value?: string;
  /** Called when the user picks an icon. */
  onChange: (value: AllowedLucideIcon | "") => void;
  /** Optional id for the trigger. */
  id?: string;
  /** Hover tooltip subject (e.g. "Category icon"). */
  tooltip?: string;
}

/**
 * Formats a Lucide icon id for tooltip copy.
 *
 * @param icon - Stored icon name.
 * @returns Human-readable label.
 */
function formatLucideIconTooltipLabel(icon: string): string {
  return icon
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Builds the hover tooltip for the icon picker trigger.
 *
 * @param tooltipSubject - Tooltip subject from props.
 * @param value - Current icon value.
 * @returns Tooltip string.
 */
function lucideIconPickerTooltip(tooltipSubject: string, value?: string): string {
  if (!value) {
    return `${tooltipSubject}: none`;
  }

  return `${tooltipSubject}: ${formatLucideIconTooltipLabel(value)}`;
}

/**
 * Compact icon-only picker — trigger and menu items render Lucide glyphs, not text labels.
 *
 * @param props - See {@link LucideIconPickerProps}.
 * @returns Icon picker JSX.
 */
export function LucideIconPicker({ value, onChange, id, tooltip = "Icon" }: LucideIconPickerProps) {
  const storedValue = value || "";
  const tooltipText = lucideIconPickerTooltip(tooltip, storedValue);

  return (
    <Select
      value={storedValue}
      onValueChange={(next) => onChange((next ?? "") as AllowedLucideIcon | "")}
    >
      <SelectTrigger
        id={id}
        size="sm"
        className="global-layout-editor__icon-picker-trigger nexus-puck-select-trigger"
        aria-label={storedValue ? `Icon: ${storedValue}` : "No icon selected"}
        data-tooltip={tooltipText}
      >
        <SelectValue placeholder="No icon">
          {storedValue ? (
            resolveLucideIcon(storedValue, siteChromeLucideProps())
          ) : (
            <Ban
              {...siteChromeLucideProps({ className: "opacity-40" })}
              aria-hidden
            />
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        align="start"
        sideOffset={8}
        className="global-layout-editor__icon-picker-menu"
      >
        <SelectGroup className="global-layout-editor__icon-picker-grid">
          <SelectItem value="" label="No icon" className="global-layout-editor__icon-picker-item">
            <Ban {...siteChromeLucideProps({ className: "opacity-40" })} aria-hidden />
          </SelectItem>
          {ALLOWED_LUCIDE_ICONS.map((icon) => (
            <SelectItem
              key={icon}
              value={icon}
              label={icon}
              className="global-layout-editor__icon-picker-item"
            >
              {resolveLucideIcon(icon, siteChromeLucideProps())}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default LucideIconPicker;
