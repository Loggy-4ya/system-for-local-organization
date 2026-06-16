"use client";

import type { CSSProperties } from "react";

/**
 * @fileoverview Full-width segmented button group for Puck sidebar fields.
 *
 * All options must span 100% of the sidebar field width (see puck_editor_enhancements.md).
 *
 * @module src/components/puck/fields/SegmentedControl
 */

/** Single option in a segmented control. */
export interface SegmentedOption<T extends string = string> {
  label: string;
  value: T;
  /** Optional longer tooltip (defaults to `label`). */
  title?: string;
}

/** Props for {@link SegmentedControl}. */
export interface SegmentedControlProps<T extends string = string> {
  /** Available options. */
  options: SegmentedOption<T>[];
  /** Currently selected value. */
  value: T;
  /** Called when the user selects an option. */
  onChange: (value: T) => void;
  /** Optional aria-label for the toolbar. */
  ariaLabel?: string;
}

/**
 * Full-width binary or small-option toggle matching Puck native radio fields.
 *
 * @param props - See {@link SegmentedControlProps}.
 * @returns Segmented button group.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  /** Four options use a 2×2 grid so cells stay equal width/height in narrow sidebars. */
  const gridCols = options.length >= 4 ? 2 : Math.max(options.length, 1);

  return (
    <div
      className="nexus-segmented nexus-plugin-segmented"
      role="toolbar"
      aria-label={ariaLabel}
      style={{ "--nexus-segmented-cols": gridCols } as CSSProperties}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={
            value === opt.value
              ? "nexus-segmented__btn nexus-segmented__btn--active"
              : "nexus-segmented__btn"
          }
          aria-pressed={value === opt.value}
          title={opt.title ?? opt.label}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
