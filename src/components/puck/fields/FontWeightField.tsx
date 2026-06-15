"use client";

/**
 * @fileoverview Font weight picker (100–900) for Puck text blocks.
 *
 * @module src/components/puck/fields/FontWeightField
 */

import { FieldLabel } from "@puckeditor/core";
import { FONT_WEIGHT_OPTIONS, type FontWeightToken } from "../lib/nexusTypography";
import { PuckSelectField } from "./PuckSelectField";

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
      <div style={{ marginTop: 4 }}>
        <PuckSelectField
          value={stored}
          onChange={onChange}
          options={FONT_WEIGHT_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
      </div>
    </FieldLabel>
  );
}

export default FontWeightField;
