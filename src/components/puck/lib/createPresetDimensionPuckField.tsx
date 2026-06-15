"use client";

/**
 * @fileoverview Factory for Puck custom fields using {@link PresetDimensionField}.
 *
 * @module src/components/puck/lib/createPresetDimensionPuckField
 */

import { PresetDimensionField } from "../fields/PresetDimensionField";
import type { PresetDimensionOption } from "../fields/PresetDimensionField";
import type { SpacingCustomUnit } from "./spacingCustomValue";
import {
  normalizePresetDimensionValue,
  presetValuesFromOptions,
  type PresetDimensionValue,
} from "./resolvePresetDimension";

/** Configuration for a preset + custom Puck field. */
export interface PresetDimensionPuckFieldConfig {
  /** Sidebar field label. */
  label: string;
  /** Preset select options (include `{ value: "custom" }` when supported). */
  options: readonly PresetDimensionOption[];
  /** Default preset token. */
  defaultPreset: string;
  /** Default custom CSS value. */
  defaultCustom?: string;
  /** Legacy token aliases mapped before preset lookup. */
  legacyMap?: Record<string, string>;
  /** Allowed CSS units for custom input. */
  units?: SpacingCustomUnit[];
  /** When true, show resolved spacing hint under the select. */
  showSpacingHint?: boolean;
  /** Custom value editor mode. */
  customMode?: "dimension" | "text";
  /** Placeholder for text custom input. */
  customPlaceholder?: string;
}

/**
 * Create a Puck `custom` field definition with preset + custom dimension UI.
 *
 * @param config - Field configuration.
 * @returns Puck field definition object.
 */
export function createPresetDimensionPuckField(config: PresetDimensionPuckFieldConfig) {
  const presetValues = presetValuesFromOptions(config.options);
  const defaults: PresetDimensionValue = {
    preset: config.defaultPreset,
    custom: config.defaultCustom ?? "",
  };

  return {
    type: "custom" as const,
    label: config.label,
    render: function PresetDimensionPuckField({
      value,
      onChange,
      field,
    }: {
      field: { label?: string };
      value: unknown;
      onChange: (next: PresetDimensionValue) => void;
    }) {
      const normalized = normalizePresetDimensionValue(
        value,
        undefined,
        presetValues,
        defaults,
        config.legacyMap,
      );

      return (
        <PresetDimensionField
          label={field.label ?? config.label}
          value={normalized}
          onChange={onChange}
          options={[...config.options]}
          units={config.units}
          showSpacingHint={config.showSpacingHint}
          customMode={config.customMode}
          customPlaceholder={config.customPlaceholder}
          customAriaLabel={`Custom ${config.label.toLowerCase()}`}
        />
      );
    } as never,
  };
}

export default createPresetDimensionPuckField;
