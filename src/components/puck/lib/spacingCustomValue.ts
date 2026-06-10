/**
 * @fileoverview Parse, validate, and format custom spacing CSS lengths.
 *
 * Restricts admin input to numeric values with allowed CSS units.
 *
 * @module src/components/puck/lib/spacingCustomValue
 */

/** Allowed CSS length units for custom spacing. */
export type SpacingCustomUnit = "px" | "rem" | "em" | "%";

/** Parsed custom spacing value. */
export interface ParsedSpacingCustom {
  amount: number;
  unit: SpacingCustomUnit;
}

const UNIT_PATTERN = /^(px|rem|em|%)$/;

const MAX_BY_UNIT: Record<SpacingCustomUnit, number> = {
  px: 200,
  rem: 12,
  em: 12,
  "%": 100,
};

const MIN_BY_UNIT: Record<SpacingCustomUnit, number> = {
  px: 0,
  rem: 0,
  em: 0,
  "%": 0,
};

/**
 * Clamp a numeric amount to safe bounds for the given unit.
 *
 * @param amount - Raw numeric input.
 * @param unit - CSS unit.
 * @returns Clamped amount.
 */
export function clampSpacingAmount(amount: number, unit: SpacingCustomUnit): number {
  const min = MIN_BY_UNIT[unit];
  const max = MAX_BY_UNIT[unit];
  if (Number.isNaN(amount)) return min;
  return Math.min(max, Math.max(min, amount));
}

/**
 * Parse a stored custom spacing string into amount + unit.
 *
 * @param raw - Value from Puck props (e.g. `24px`, `1.5rem`).
 * @returns Parsed value or defaults.
 */
export function parseSpacingCustom(raw: string | undefined): ParsedSpacingCustom {
  if (!raw || typeof raw !== "string") {
    return { amount: 16, unit: "px" };
  }

  const trimmed = raw.trim();
  const match = /^(-?\d+(?:\.\d+)?)(px|rem|em|%)$/.exec(trimmed);
  if (!match) {
    return { amount: 16, unit: "px" };
  }

  const unit = match[2] as SpacingCustomUnit;
  const amount = clampSpacingAmount(parseFloat(match[1]), unit);
  return { amount, unit };
}

/**
 * Format amount + unit into a CSS length string.
 *
 * @param amount - Numeric value.
 * @param unit - CSS unit.
 * @returns Safe CSS length (e.g. `24px`).
 */
export function formatSpacingCustom(amount: number, unit: SpacingCustomUnit): string {
  const safeUnit = UNIT_PATTERN.test(unit) ? unit : "px";
  const safeAmount = clampSpacingAmount(amount, safeUnit);
  const rounded = safeUnit === "px" ? Math.round(safeAmount) : Math.round(safeAmount * 100) / 100;
  return `${rounded}${safeUnit}`;
}

/**
 * Return the max allowed value for a unit (for UI hints).
 *
 * @param unit - CSS unit.
 * @returns Maximum numeric bound.
 */
export function getSpacingCustomMax(unit: SpacingCustomUnit): number {
  return MAX_BY_UNIT[unit];
}
