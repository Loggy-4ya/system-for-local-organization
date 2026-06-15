/**
 * @fileoverview Maps user accent preferences to CSS custom property values.
 *
 * @module src/lib/accentTokens
 */

import type { AccentFamily, AccentShade } from "@shared/models/User";

/** CSS variable name for the active user accent colour. */
export const ACCENT_CSS_VAR = "--color-accent-user";

/**
 * Resolve the CSS variable reference for a family + shade pair.
 *
 * @param family - Accent colour family.
 * @param shade - Accent shade within the family.
 * @returns CSS var() reference string.
 */
export function accentCssVar(family: AccentFamily, shade: AccentShade): string {
  return `var(--accent-${family}-${shade})`;
}

/**
 * Build inline style object setting the user accent CSS variable.
 *
 * @param family - Accent colour family.
 * @param shade - Accent shade within the family.
 * @returns React CSSProperties with accent override.
 */
export function accentStyle(
  family: AccentFamily,
  shade: AccentShade
): Record<string, string> {
  return { [ACCENT_CSS_VAR]: accentCssVar(family, shade) };
}

/** Human-readable accent label for UI pills. */
const FAMILY_LABELS: Record<AccentFamily, string> = {
  blue: "Blue",
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  purple: "Purple",
};

const SHADE_LABELS: Record<AccentShade, string> = {
  soft: "Soft",
  medium: "Medium",
  strong: "Strong",
};

/**
 * Format accent preference for display (e.g. "Blue · Medium").
 *
 * @param family - Accent family.
 * @param shade - Accent shade.
 * @returns Display label string.
 */
export function formatAccentLabel(family: AccentFamily, shade: AccentShade): string {
  return `${FAMILY_LABELS[family]} · ${SHADE_LABELS[shade]}`;
}
