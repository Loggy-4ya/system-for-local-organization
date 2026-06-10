"use client";

/**
 * @fileoverview Design-system color preset picker for Puck sidebars.
 *
 * @module src/components/puck/fields/NexusColorPresetField
 */

import { FieldLabel } from "@measured/puck";
import {
  getColorOptionsForGroup,
  normalizeColorToken,
  resolveNexusColor,
  type ColorPresetGroup,
} from "../lib/nexusColorTokens";

/** Props passed by Puck to the preset field renderer. */
interface NexusColorPresetFieldProps {
  field: {
    label?: string;
    /** Token group: text, island-fill, or island-border. */
    presetGroup?: ColorPresetGroup;
  };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Grouped color preset select bound to Nexus CSS tokens.
 *
 * @param props - Puck custom field props.
 * @returns Preset select with live swatch preview.
 */
export function NexusColorPresetField({ field, value, onChange }: NexusColorPresetFieldProps) {
  const group = field.presetGroup ?? "text";
  const options = getColorOptionsForGroup(group);
  const stored = normalizeColorToken(value) ?? options[0]?.value ?? "text-primary";
  const resolved = resolveNexusColor(stored, options[0]?.value ?? "text-primary");

  return (
    <FieldLabel label={field.label || "Color"}>
      <div className="nexus-puck-field" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            aria-hidden
            style={{
              width: 42,
              height: 42,
              borderRadius: 4,
              border: "1px solid var(--puck-color-grey-09)",
              background: resolved,
              flexShrink: 0,
            }}
          />
          <select
            className="nexus-puck-select"
            value={stored}
            onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1 }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FieldLabel>
  );
}

export default NexusColorPresetField;
