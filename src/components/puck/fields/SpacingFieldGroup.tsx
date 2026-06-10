"use client";

/**
 * @fileoverview Compact categorized spacing editor for Puck blocks.
 *
 * @module src/components/puck/fields/SpacingFieldGroup
 */

import { useCallback, useEffect, useState } from "react";
import type { SpacingProps, SpacingToken } from "../lib/spacingFields";
import {
  formatSpacingCustom,
  getSpacingCustomMax,
  parseSpacingCustom,
  type SpacingCustomUnit,
} from "../lib/spacingCustomValue";
import { FieldChapter, SpacingIcon } from "./FieldChapter";

const SPACING_OPTIONS: Array<{ label: string; value: SpacingToken }> = [
  { label: "None", value: "none" },
  { label: "XS (4px)", value: "xs" },
  { label: "SM (8px)", value: "sm" },
  { label: "MD (16px)", value: "md" },
  { label: "LG (24px)", value: "lg" },
  { label: "XL (32px)", value: "xl" },
  { label: "2XL (48px)", value: "2xl" },
  { label: "Custom", value: "custom" },
];

const SPACING_UNITS: SpacingCustomUnit[] = ["px", "rem", "em", "%"];

const PADDING_SIDES: Array<{
  tokenKey: keyof SpacingProps;
  customKey: keyof SpacingProps;
  label: string;
}> = [
  { tokenKey: "paddingTop", customKey: "paddingTopCustom", label: "Top" },
  { tokenKey: "paddingRight", customKey: "paddingRightCustom", label: "Right" },
  { tokenKey: "paddingBottom", customKey: "paddingBottomCustom", label: "Bottom" },
  { tokenKey: "paddingLeft", customKey: "paddingLeftCustom", label: "Left" },
];

const MARGIN_SIDES: Array<{
  tokenKey: keyof SpacingProps;
  customKey: keyof SpacingProps;
  label: string;
}> = [
  { tokenKey: "marginTop", customKey: "marginTopCustom", label: "Top" },
  { tokenKey: "marginRight", customKey: "marginRightCustom", label: "Right" },
  { tokenKey: "marginBottom", customKey: "marginBottomCustom", label: "Bottom" },
  { tokenKey: "marginLeft", customKey: "marginLeftCustom", label: "Left" },
];

/** Puck custom field props for spacing. */
interface SpacingFieldGroupProps {
  value: SpacingProps;
  onChange: (value: SpacingProps) => void;
}

/**
 * Update one spacing prop immutably.
 *
 * @param current - Current spacing object.
 * @param key - Prop key to set.
 * @param next - New value.
 * @returns Updated spacing object.
 */
function patchSpacing(
  current: SpacingProps,
  key: keyof SpacingProps,
  next: string,
): SpacingProps {
  return { ...current, [key]: next };
}

/**
 * Numeric + unit controls for a custom spacing side.
 *
 * @param props - Stored value and change handler.
 * @returns Custom spacing row.
 */
function CustomSpacingInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: string) => void;
}) {
  const parsed = parseSpacingCustom(value);
  const [amount, setAmount] = useState(String(parsed.amount));
  const [unit, setUnit] = useState<SpacingCustomUnit>(parsed.unit);

  useEffect(() => {
    const next = parseSpacingCustom(value);
    setAmount(String(next.amount));
    setUnit(next.unit);
  }, [value]);

  const commit = useCallback(
    (nextAmount: string, nextUnit: SpacingCustomUnit) => {
      const numeric = parseFloat(nextAmount);
      const formatted = formatSpacingCustom(numeric, nextUnit);
      onChange(formatted);
    },
    [onChange],
  );

  const handleAmountChange = (raw: string) => {
    setAmount(raw);
    if (raw === "" || raw === "-") return;
    commit(raw, unit);
  };

  const handleAmountBlur = () => {
    const numeric = parseFloat(amount);
    const safe = Number.isNaN(numeric) ? 0 : numeric;
    const formatted = formatSpacingCustom(safe, unit);
    setAmount(String(parseSpacingCustom(formatted).amount));
    onChange(formatted);
  };

  const handleUnitChange = (nextUnit: SpacingCustomUnit) => {
    setUnit(nextUnit);
    commit(amount, nextUnit);
  };

  const max = getSpacingCustomMax(unit);

  return (
    <div className="nexus-field-grid__custom-row">
      <input
        type="number"
        className="nexus-field-grid__custom nexus-field-grid__custom--number"
        min={0}
        max={max}
        step={unit === "px" ? 1 : 0.1}
        value={amount}
        onChange={(e) => handleAmountChange(e.target.value)}
        onBlur={handleAmountBlur}
        aria-label="Custom spacing value"
      />
      <select
        className="nexus-puck-select nexus-field-grid__custom-unit"
        value={unit}
        onChange={(e) => handleUnitChange(e.target.value as SpacingCustomUnit)}
        aria-label="Custom spacing unit"
      >
        {SPACING_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Render a 2×2 grid for padding or margin sides.
 *
 * @param sides - Side definitions.
 * @param value - Current spacing values.
 * @param onSideChange - Patch handler.
 * @returns Grid JSX.
 */
function SideGrid({
  sides,
  value,
  onSideChange,
}: {
  sides: typeof PADDING_SIDES;
  value: SpacingProps;
  onSideChange: (key: keyof SpacingProps, next: string) => void;
}) {
  return (
    <div className="nexus-field-grid">
      {sides.map(({ tokenKey, customKey, label }) => {
        const token = (value[tokenKey] as SpacingToken | undefined) ?? "none";
        return (
          <div key={tokenKey} className="nexus-field-grid__cell">
            <span className="nexus-field-grid__label">{label}</span>
            <select
              className="nexus-puck-select"
              value={token}
              onChange={(e) => onSideChange(tokenKey, e.target.value)}
            >
              {SPACING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {token === "custom" ? (
              <CustomSpacingInput
                value={value[customKey] as string | undefined}
                onChange={(next) => onSideChange(customKey, next)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Categorized padding + margin controls inside one collapsible chapter.
 *
 * @param props - Puck custom field props.
 * @returns Spacing field group UI.
 */
export function SpacingFieldGroup({ value, onChange }: SpacingFieldGroupProps) {
  const spacing = value ?? {};

  const handleChange = (key: keyof SpacingProps, next: string) => {
    onChange(patchSpacing(spacing, key, next));
  };

  return (
    <FieldChapter title="Spacing" icon={<SpacingIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Padding</span>
        <SideGrid sides={PADDING_SIDES} value={spacing} onSideChange={handleChange} />
      </div>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Margin</span>
        <SideGrid sides={MARGIN_SIDES} value={spacing} onSideChange={handleChange} />
      </div>
    </FieldChapter>
  );
}

export default SpacingFieldGroup;
