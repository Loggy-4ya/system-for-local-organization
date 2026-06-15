"use client";

/**
 * @fileoverview Reusable preset + custom CSS dimension control for Puck sidebars.
 *
 * @module src/components/puck/fields/PresetDimensionField
 */

import { formatSpacingResolvedHint } from "../lib/spacingDisplay";
import type { SpacingToken } from "../lib/spacingFields";
import type { PresetDimensionValue } from "../lib/resolvePresetDimension";
import type { SpacingCustomBounds, SpacingCustomUnit } from "../lib/spacingCustomValue";
import { CustomDimensionInput } from "./CustomDimensionInput";
import { PuckSelectField } from "./PuckSelectField";

/** One preset option in a dimension select. */
export interface PresetDimensionOption {
  label: string;
  value: string;
}

/** Props for {@link PresetDimensionField}. */
export interface PresetDimensionFieldProps {
  /** Sub-field label above the control. */
  label: string;
  /** Current preset + custom values. */
  value: PresetDimensionValue;
  /** Called when preset or custom changes. */
  onChange: (value: PresetDimensionValue) => void;
  /** Preset options (must include `{ value: "custom" }` when custom is supported). */
  options: PresetDimensionOption[];
  /** Allowed CSS units for the custom row. */
  units?: SpacingCustomUnit[];
  /** When true, show resolved spacing hint under the select. */
  showSpacingHint?: boolean;
  /** Accessible label for the custom numeric input. */
  customAriaLabel?: string;
  /** Custom value editor — numeric dimension row or free-form text. */
  customMode?: "dimension" | "text";
  /** Placeholder for text custom input. */
  customPlaceholder?: string;
  /** Optional per-unit maximum overrides for the custom dimension row. */
  customMaxByUnit?: SpacingCustomBounds;
  /** Optional per-unit minimum overrides for the custom dimension row. */
  customMinByUnit?: SpacingCustomBounds;
}

/**
 * Labeled preset select with optional custom dimension row.
 *
 * @param props - See {@link PresetDimensionFieldProps}.
 * @returns Dimension field UI.
 */
export function PresetDimensionField({
  label,
  value,
  onChange,
  options,
  units,
  showSpacingHint = false,
  customAriaLabel,
  customMode = "dimension",
  customPlaceholder,
  customMaxByUnit,
  customMinByUnit,
}: PresetDimensionFieldProps) {
  const hasCustom = options.some((opt) => opt.value === "custom");
  const storedPreset = value.preset;
  const selectValue = options.some((opt) => opt.value === storedPreset)
    ? storedPreset
    : hasCustom
      ? "custom"
      : (options[0]?.value ?? storedPreset);

  const hint =
    showSpacingHint && selectValue !== "custom"
      ? formatSpacingResolvedHint(selectValue as SpacingToken, value.custom)
      : showSpacingHint && selectValue === "custom"
        ? formatSpacingResolvedHint("custom", value.custom)
        : "";

  const patch = (partial: Partial<PresetDimensionValue>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="nexus-field-grid__cell">
      <span className="nexus-field-grid__label">{label}</span>
      <PuckSelectField
        value={selectValue}
        onChange={(next) => patch({ preset: next })}
        options={options.map((opt) => ({ label: opt.label, value: opt.value }))}
      />
      {hasCustom ? (
        customMode === "text" ? (
          <input
            type="text"
            className="nexus-field-grid__custom"
            value={value.custom}
            hidden={selectValue !== "custom"}
            aria-hidden={selectValue !== "custom"}
            tabIndex={selectValue !== "custom" ? -1 : 0}
            placeholder={customPlaceholder}
            aria-label={customAriaLabel ?? `Custom ${label.toLowerCase()}`}
            onChange={(event) => patch({ custom: event.target.value })}
          />
        ) : (
          <CustomDimensionInput
            value={value.custom}
            onChange={(next) => patch({ custom: next })}
            hidden={selectValue !== "custom"}
            ariaLabel={customAriaLabel ?? `Custom ${label.toLowerCase()}`}
            units={units}
            maxByUnit={customMaxByUnit}
            minByUnit={customMinByUnit}
          />
        )
      ) : null}
      {hint ? <span className="nexus-field-grid__resolved">{hint}</span> : null}
    </div>
  );
}

export default PresetDimensionField;
