"use client";

/**
 * @fileoverview Accent background preset picker for PageRoot solid backgrounds.
 *
 * Maps to CSS custom properties defined in `globals.css`.
 *
 * @module src/components/puck/fields/AccentPresetField
 */

import { FieldLabel } from "@measured/puck";

/** Accent preset token values stored in Puck root props. */
export type AccentPresetValue =
  | "custom"
  | "red-soft"
  | "red-medium"
  | "red-strong"
  | "yellow-soft"
  | "yellow-medium"
  | "yellow-strong"
  | "green-soft"
  | "green-medium"
  | "green-strong"
  | "blue-soft"
  | "blue-medium"
  | "blue-strong"
  | "purple-soft"
  | "purple-medium"
  | "purple-strong";

/** Preset options grouped by accent family. */
export const ACCENT_PRESET_OPTIONS: Array<{ label: string; value: AccentPresetValue }> = [
  { label: "Custom color", value: "custom" },
  { label: "Red / Orange — Soft", value: "red-soft" },
  { label: "Red / Orange — Medium", value: "red-medium" },
  { label: "Red / Orange — Strong", value: "red-strong" },
  { label: "Yellow — Soft", value: "yellow-soft" },
  { label: "Yellow — Medium", value: "yellow-medium" },
  { label: "Yellow — Strong", value: "yellow-strong" },
  { label: "Green — Soft", value: "green-soft" },
  { label: "Green — Medium", value: "green-medium" },
  { label: "Green — Strong", value: "green-strong" },
  { label: "Blue — Soft", value: "blue-soft" },
  { label: "Blue — Medium", value: "blue-medium" },
  { label: "Blue — Strong", value: "blue-strong" },
  { label: "Purple — Soft", value: "purple-soft" },
  { label: "Purple — Medium", value: "purple-medium" },
  { label: "Purple — Strong", value: "purple-strong" },
];

/**
 * Resolve a preset token to a CSS `var(...)` reference.
 *
 * @param preset - Stored preset value from Puck props.
 * @returns CSS variable reference or empty string for custom.
 */
export function resolveAccentPreset(preset: AccentPresetValue | string | undefined): string {
  if (!preset || preset === "custom") return "";
  const [family, shade] = preset.split("-") as [string, string];
  return `var(--accent-${family}-${shade})`;
}

/** Props for the accent preset field renderer. */
interface AccentPresetFieldProps {
  field: { label?: string };
  value: AccentPresetValue | string;
  onChange: (value: string) => void;
}

/**
 * Select field for architectural accent background presets.
 *
 * @param props - Puck custom field props.
 * @returns Preset `<select>` control.
 */
export function AccentPresetField({ field, value, onChange }: AccentPresetFieldProps) {
  return (
    <FieldLabel label={field.label || "Accent Preset"}>
      <div className="nexus-puck-field" style={{ marginTop: 4 }}>
        <select
          value={value || "blue-medium"}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%" }}
        >
          {ACCENT_PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </FieldLabel>
  );
}

export default AccentPresetField;
