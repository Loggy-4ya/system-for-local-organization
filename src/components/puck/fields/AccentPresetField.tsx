"use client";

/**
 * @fileoverview Accent background preset picker for PageRoot solid backgrounds.
 *
 * Uses the simplified dual-theme hue catalog from {@link PAGE_HUE_OPTIONS}.
 *
 * @module src/components/puck/fields/AccentPresetField
 */

import { FieldLabel } from "@puckeditor/core";
import {
  normalizeColorToken,
  PAGE_HUE_OPTIONS,
  resolveNexusColor,
} from "../lib/nexusColorTokens";
import { PuckSelectField } from "./PuckSelectField";

/** Accent preset token values stored in Puck root props. */
export type AccentPresetValue = string;

/**
 * Resolve a preset token to a CSS color value.
 *
 * @param preset - Stored preset value from Puck props.
 * @returns CSS color value.
 */
export function resolveAccentPreset(preset: AccentPresetValue | undefined): string {
  return resolveNexusColor(preset, "var(--color-bg-panel)");
}

/** Props for the accent preset field renderer. */
interface AccentPresetFieldProps {
  field: { label?: string };
  value: AccentPresetValue | string;
  onChange: (value: string) => void;
}

/**
 * Select field for page solid-background hue presets.
 *
 * @param props - Puck custom field props.
 * @returns Preset Shadcn select control.
 */
export function AccentPresetField({ field, value, onChange }: AccentPresetFieldProps) {
  const normalized = normalizeColorToken(value) ?? "hue-blue";

  return (
    <FieldLabel label={field.label || "Background Hue"}>
      <div className="nexus-puck-field" style={{ marginTop: 4 }}>
        <PuckSelectField
          value={normalized}
          onChange={onChange}
          options={PAGE_HUE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
      </div>
    </FieldLabel>
  );
}

export default AccentPresetField;
