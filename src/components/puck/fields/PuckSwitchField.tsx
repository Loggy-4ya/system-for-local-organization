"use client";

/**
 * @fileoverview Shadcn switch row for Puck sidebar binary toggles.
 *
 * @module src/components/puck/fields/PuckSwitchField
 */

import { Switch } from "@/components/ui/switch";

/** Props for {@link PuckSwitchField}. */
export interface PuckSwitchFieldProps {
  /** Field label shown on the left (omit when `showLabel` is false). */
  label: string;
  /** Current stored value. */
  value: string;
  /** Puck field onChange — receives trueValue or falseValue. */
  onChange: (value: string) => void;
  /** Stored value when the switch is on. */
  trueValue: string;
  /** Stored value when the switch is off. */
  falseValue: string;
  /** Optional helper text below the row. */
  description?: string;
  /** When false, render only the switch (Puck FieldLabel supplies the label). */
  showLabel?: boolean;
  /** When true, the switch is non-interactive. */
  disabled?: boolean;
}

/**
 * Settings-style row: label left, Shadcn switch right.
 *
 * @param props - See {@link PuckSwitchFieldProps}.
 * @returns Switch control row.
 */
export function PuckSwitchField({
  label,
  value,
  onChange,
  trueValue,
  falseValue,
  description,
  showLabel = true,
  disabled = false,
}: PuckSwitchFieldProps) {
  const checked = value === trueValue;

  if (!showLabel) {
    return (
      <div className="nexus-switch-field nexus-switch-field--inline">
        <Switch
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => {
            if (disabled) return;
            onChange(next ? trueValue : falseValue);
          }}
        />
      </div>
    );
  }

  const labelId = `nexus-switch-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="nexus-switch-field">
      <div className="nexus-switch-row">
        <span className="nexus-switch-row__label" id={labelId}>
          {label}
        </span>
        <Switch
          aria-labelledby={labelId}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => {
            if (disabled) return;
            onChange(next ? trueValue : falseValue);
          }}
        />
      </div>
      {description ? <p className="nexus-switch-row__hint">{description}</p> : null}
    </div>
  );
}

export default PuckSwitchField;
