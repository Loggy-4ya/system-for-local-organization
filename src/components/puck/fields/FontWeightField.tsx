"use client";

/**
 * @fileoverview Font weight picker (100–900) for Puck text blocks.
 *
 * @module src/components/puck/fields/FontWeightField
 */

import { FieldLabel } from "@measured/puck";
import { FONT_WEIGHT_OPTIONS, type FontWeightToken } from "../lib/nexusTypography";

/** Props passed by Puck to the font weight field renderer. */
interface FontWeightFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Select control for full font weight scale.
 *
 * @param props - Puck custom field props.
 * @returns Font weight select.
 */
export function FontWeightField({ field, value, onChange }: FontWeightFieldProps) {
  const stored = (value as FontWeightToken) || "400";

  return (
    <FieldLabel label={field.label || "Font Weight"}>
      <select
        className="nexus-puck-select"
        value={stored}
        onChange={(e) => onChange(e.target.value)}
        style={{ marginTop: 4 }}
      >
        {FONT_WEIGHT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}

export default FontWeightField;
