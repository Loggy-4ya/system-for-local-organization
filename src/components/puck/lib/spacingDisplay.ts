/**
 * @fileoverview Human-readable spacing token labels and resolved pixel hints.
 *
 * @module src/components/puck/lib/spacingDisplay
 */

import type { SpacingToken } from "./spacingFields";
import { parseSpacingCustom } from "./spacingCustomValue";

/** Pixel values aligned with globals.css --spacing-* tokens. */
export const SPACING_PX_MAP: Record<Exclude<SpacingToken, "custom">, number> = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
};

/** Select labels with pixel values for island padding etc. */
export const SPACING_TOKEN_LABELS: Array<{ label: string; value: SpacingToken }> = [
  { label: "None", value: "none" },
  { label: "XS (4px)", value: "xs" },
  { label: "SM (8px)", value: "sm" },
  { label: "MD (16px)", value: "md" },
  { label: "LG (24px)", value: "lg" },
  { label: "XL (32px)", value: "xl" },
  { label: "2XL (48px)", value: "2xl" },
  { label: "Custom", value: "custom" },
];

/**
 * Format a resolved spacing hint for display under a select control.
 *
 * @param token - Spacing preset token.
 * @param custom - Custom CSS value when token is `custom`.
 * @returns Hint string (e.g. `MD · 16px`) or empty when none.
 */
export function formatSpacingResolvedHint(
  token: SpacingToken | string | undefined,
  custom?: string,
): string {
  if (!token || token === "none") return "";
  if (token === "custom") {
    const parsed = parseSpacingCustom(custom);
    return `Custom · ${parsed.amount}${parsed.unit}`;
  }
  const px = SPACING_PX_MAP[token as Exclude<SpacingToken, "custom">];
  if (px === undefined) return "";
  const upper = token.toUpperCase();
  return px === 0 ? "None · 0px" : `${upper} · ${px}px`;
}
