"use client";

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
  return (
    <div className="nexus-segmented" role="toolbar" aria-label={ariaLabel}>
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
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
