"use client";

/**
 * @fileoverview Numeric amount + CSS unit row for Puck custom dimension fields.
 *
 * Shared by Spacing and Carousel size controls. Reuses spacing custom-value parsing.
 *
 * @module src/components/puck/fields/CustomDimensionInput
 */

import { useCallback, useEffect, useState } from "react";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import {
  formatSpacingCustom,
  getSpacingCustomMax,
  parseSpacingCustom,
  type SpacingCustomUnit,
} from "../lib/spacingCustomValue";
import { PuckSelectField } from "./PuckSelectField";

/** Units allowed for custom dimensions (no `%` — not used for height/radius). */
const DEFAULT_DIMENSION_UNITS: SpacingCustomUnit[] = ["px", "rem", "em"];

/** Props for {@link CustomDimensionInput}. */
export interface CustomDimensionInputProps {
  /** Stored CSS length (e.g. `360px`, `1.5rem`). */
  value: string | undefined;
  /** Called with a formatted CSS length on commit. */
  onChange: (next: string) => void;
  /** When true, row stays mounted but hidden (avoids Puck field-tree remounts). */
  hidden?: boolean;
  /** Accessible label for the numeric input. */
  ariaLabel?: string;
  /** Allowed CSS units (defaults to px / rem / em). */
  units?: SpacingCustomUnit[];
}

/**
 * Number input + unit select row matching Spacing custom side controls.
 *
 * @param props - See {@link CustomDimensionInputProps}.
 * @returns Custom dimension row.
 */
export function CustomDimensionInput({
  value,
  onChange,
  hidden = false,
  ariaLabel = "Custom dimension value",
  units = DEFAULT_DIMENSION_UNITS,
}: CustomDimensionInputProps) {
  const parsed = parseSpacingCustom(value);
  const [unit, setUnit] = useState<SpacingCustomUnit>(
    units.includes(parsed.unit) ? parsed.unit : units[0],
  );
  const amountValue = String(parsed.amount);

  const { draft: amount, onTextChange, onTextBlur, onTextFocus } = useDeferredFieldCommit({
    value: amountValue,
    onChange: (nextAmount) => {
      const numeric = parseFloat(nextAmount);
      if (Number.isNaN(numeric)) return;
      onChange(formatSpacingCustom(numeric, unit));
    },
    textDebounceMs: 0,
  });

  useEffect(() => {
    const next = parseSpacingCustom(value);
    setUnit(units.includes(next.unit) ? next.unit : units[0]);
  }, [units, value]);

  const handleUnitChange = useCallback(
    (nextUnit: SpacingCustomUnit) => {
      setUnit(nextUnit);
      const numeric = parseFloat(amount);
      const safe = Number.isNaN(numeric) ? 0 : numeric;
      onChange(formatSpacingCustom(safe, nextUnit));
    },
    [amount, onChange],
  );

  const max = getSpacingCustomMax(unit);

  return (
    <div
      className="nexus-field-grid__custom-row"
      hidden={hidden}
      aria-hidden={hidden}
    >
      <input
        type="number"
        className="nexus-field-grid__custom nexus-field-grid__custom--number"
        min={0}
        max={max}
        step={unit === "px" ? 1 : 0.1}
        value={amount}
        tabIndex={hidden ? -1 : 0}
        onChange={(e) => onTextChange(e.target.value)}
        onFocus={onTextFocus}
        onBlur={onTextBlur}
        aria-label={ariaLabel}
      />
      <PuckSelectField
        value={unit}
        onChange={(next) => handleUnitChange(next as SpacingCustomUnit)}
        triggerClassName="nexus-field-grid__custom-unit"
        options={units.map((u) => ({ label: u, value: u }))}
      />
    </div>
  );
}

export default CustomDimensionInput;
