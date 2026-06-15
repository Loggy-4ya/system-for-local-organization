"use client";

/**
 * @fileoverview Single-select Shadcn badge group for compact editor options (spacing, alignment, etc.).
 *
 * Replaces Puck {@link SegmentedControl} on admin pages where `puck-editor.css` is not loaded.
 *
 * @module src/components/global-layout/EditorOptionBadgeGroup
 */

import React from "react";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** One selectable option in {@link EditorOptionBadgeGroup}. */
export interface EditorOptionBadge<T extends string = string> {
  /** Short label shown on the tag. */
  label: string;
  /** Stored value when selected. */
  value: T;
  /** Badge color when this option is active. */
  activeVariant?: BadgeVariant;
  /** Optional longer tooltip (defaults to label). */
  title?: string;
}

/** Props for {@link EditorOptionBadgeGroup}. */
export interface EditorOptionBadgeGroupProps<T extends string = string> {
  /** Mutually exclusive options. */
  options: EditorOptionBadge<T>[];
  /** Currently selected value. */
  value: T;
  /** Called when the user picks an option. */
  onChange: (value: T) => void;
  /** Accessible name for the option group. */
  ariaLabel?: string;
}

/**
 * Row of clickable badges where exactly one option is active at a time.
 *
 * @param props - See {@link EditorOptionBadgeGroupProps}.
 * @returns Option badge group JSX.
 */
export function EditorOptionBadgeGroup<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
}: EditorOptionBadgeGroupProps<T>) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title ?? opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              badgeVariants({ variant: active ? (opt.activeVariant ?? "default") : "outline" }),
              "global-layout-editor__option-btn cursor-pointer select-none transition-colors hover:opacity-90"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default EditorOptionBadgeGroup;
