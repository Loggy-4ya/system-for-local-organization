"use client";

/**
 * @fileoverview Font family preset picker for Puck text blocks.
 *
 * @module src/components/puck/fields/FontFamilyField
 */

import { FieldLabel } from "@puckeditor/core";
import { FONT_FAMILY_OPTIONS, type FontFamilyToken } from "../lib/nexusTypography";
import { PuckSelectField } from "./PuckSelectField";

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
      <div style={{ marginTop: 4 }}>
        <PuckSelectField
          value={stored}
          onChange={onChange}
          options={FONT_FAMILY_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
      </div>
    </FieldLabel>
  );
}

export default FontFamilyField;
