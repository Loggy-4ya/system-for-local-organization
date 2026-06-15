"use client";

/**
 * @fileoverview Clickable Shadcn badge toggle for short editor flags (Admin Only, Pill Button, etc.).
 *
 * @module src/components/global-layout/EditorFlagBadge
 */

import React from "react";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Props for {@link EditorFlagBadge}. */
export interface EditorFlagBadgeProps {
  /** Short label for accessibility when no icon is set. */
  label: string;
  /** Optional icon-only display (label still used for aria). */
  icon?: React.ReactNode;
  /** Whether the flag is enabled. */
  active: boolean;
  /** Called when the user toggles the flag. */
  onToggle: () => void;
  /** Badge color when active. */
  activeVariant?: BadgeVariant;
  /** Accessible name override (defaults to label). */
  ariaLabel?: string;
  /** Hover tooltip (defaults to label plus enabled state). */
  tooltip?: string;
}

/**
 * Compact colored tag that toggles a boolean editor flag on click.
 *
 * @param props - See {@link EditorFlagBadgeProps}.
 * @returns Toggle badge button JSX.
 */
export function EditorFlagBadge({
  label,
  icon,
  active,
  onToggle,
  activeVariant = "default",
  ariaLabel,
  tooltip,
}: EditorFlagBadgeProps) {
  const tooltipText = tooltip ?? `${label}${active ? " (on)" : " (off)"}`;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel ?? `${label}${active ? " enabled" : " disabled"}`}
      data-tooltip={tooltipText}
      onClick={onToggle}
      className={cn(
        badgeVariants({ variant: active ? activeVariant : "outline" }),
        icon ? "global-layout-editor__flag-icon-btn" : undefined,
        "cursor-pointer select-none transition-colors hover:opacity-90"
      )}
    >
      {icon ?? label}
    </button>
  );
}

export default EditorFlagBadge;
