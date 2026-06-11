"use client";

/**
 * @fileoverview Vertical margin presets for NexusList block positioning.
 *
 * Values merge into block shell spacing at render time via config wrapper.
 *
 * @module src/components/puck/fields/ListPositionField
 */

import { FieldLabel } from "@measured/puck";
import type { SpacingToken } from "../lib/spacingFields";
import { PuckSelectField } from "./PuckSelectField";

/** Vertical margin presets for list block positioning. */
export interface ListPositionValue {
  marginTop: SpacingToken;
  marginBottom: SpacingToken;
}

/** Margin preset options for list vertical positioning. */
const MARGIN_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Small (8px)", value: "sm" },
  { label: "Medium (16px)", value: "md" },
  { label: "Large (24px)", value: "lg" },
];

/** Props passed by Puck to the list position field renderer. */
interface ListPositionFieldProps {
  field: { label?: string };
  value: ListPositionValue;
  onChange: (value: ListPositionValue) => void;
}

/**
 * Quick margin top/bottom controls for moving a list block on the canvas.
 *
 * @param props - Puck custom field props.
 * @returns Position preset UI.
 */
export function ListPositionField({ field, value, onChange }: ListPositionFieldProps) {
  const position = value ?? { marginTop: "none", marginBottom: "none" };

  return (
    <FieldLabel label={field.label || "Vertical Position"}>
      <div className="nexus-field-grid" style={{ marginTop: 4 }}>
        <div className="nexus-field-grid__cell">
          <span className="nexus-field-grid__label">Margin Top</span>
          <PuckSelectField
            value={position.marginTop ?? "none"}
            onChange={(next) =>
              onChange({ ...position, marginTop: next as SpacingToken })
            }
            options={MARGIN_OPTIONS}
          />
        </div>
        <div className="nexus-field-grid__cell">
          <span className="nexus-field-grid__label">Margin Bottom</span>
          <PuckSelectField
            value={position.marginBottom ?? "none"}
            onChange={(next) =>
              onChange({ ...position, marginBottom: next as SpacingToken })
            }
            options={MARGIN_OPTIONS}
          />
        </div>
      </div>
    </FieldLabel>
  );
}

export default ListPositionField;
