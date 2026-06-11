"use client";

/**
 * @fileoverview Font family preset picker for Puck text blocks.
 *
 * @module src/components/puck/fields/FontFamilyField
 */

import { FieldLabel } from "@measured/puck";
import { FONT_FAMILY_OPTIONS, type FontFamilyToken } from "../lib/nexusTypography";

/** Props passed by Puck to the font family field renderer. */
interface FontFamilyFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Select control for sans / serif / mono / inherit typography.
 *
 * @param props - Puck custom field props.
 * @returns Font family select.
 */
export function FontFamilyField({ field, value, onChange }: FontFamilyFieldProps) {
  const stored = (value as FontFamilyToken) || "inherit";

  return (
    <FieldLabel label={field.label || "Font Family"}>
      <select
        className="nexus-puck-select"
        value={stored}
        onChange={(e) => onChange(e.target.value)}
        style={{ marginTop: 4 }}
      >
        {FONT_FAMILY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}

export default FontFamilyField;
