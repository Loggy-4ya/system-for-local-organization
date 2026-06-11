/**
 * @fileoverview Detect Puck radio fields that represent binary on/off toggles.
 *
 * Used by the global radio field override to render Shadcn switches instead of
 * segmented Off/On controls.
 *
 * @module src/components/puck/lib/binaryToggleFields
 */

/** Stored values treated as functional binary toggles. */
const BINARY_TOGGLE_VALUES = new Set(["yes", "no", "on", "off"]);

/** Single radio/select option shape from Puck field definitions. */
export interface FieldOptionLike {
  label: string;
  value: string | number | boolean | null | undefined;
}

/**
 * Whether a radio field's options represent a yes/no or on/off toggle.
 *
 * Excludes two-option pickers that are not toggles (e.g. left/right, sm/md, bullet/number).
 *
 * @param options - Puck radio field options.
 * @returns True when the field should render as a switch.
 */
export function isBinaryToggleField(options: FieldOptionLike[] | undefined): boolean {
  if (!options || options.length !== 2) return false;
  const values = options.map((opt) => String(opt.value ?? "").toLowerCase());
  return values.every((value) => BINARY_TOGGLE_VALUES.has(value));
}

/**
 * Resolve which stored value means "on" for a binary toggle field.
 *
 * Prefers `yes` and `on` as the true value when present.
 *
 * @param options - Puck radio field options (must pass {@link isBinaryToggleField}).
 * @returns String values for checked and unchecked states.
 */
export function resolveToggleValues(options: FieldOptionLike[]): {
  trueValue: string;
  falseValue: string;
} {
  const normalized = options.map((opt) => ({
    label: opt.label,
    value: String(opt.value ?? ""),
  }));

  for (const trueCandidate of ["yes", "on"] as const) {
    const trueOpt = normalized.find((opt) => opt.value.toLowerCase() === trueCandidate);
    if (trueOpt) {
      const falseOpt = normalized.find((opt) => opt.value !== trueOpt.value);
      if (falseOpt) {
        return { trueValue: trueOpt.value, falseValue: falseOpt.value };
      }
    }
  }

  return {
    falseValue: normalized[0].value,
    trueValue: normalized[1].value,
  };
}
