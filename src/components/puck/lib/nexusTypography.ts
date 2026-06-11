/**
 * @fileoverview Typography tokens and helpers for Puck text blocks.
 *
 * Role-based defaults with per-block family + weight overrides.
 *
 * @module src/components/puck/lib/nexusTypography
 */

/** Font family preset keys. */
export type FontFamilyToken = "sans" | "serif" | "mono" | "inherit";

/** Font weight values (100–900). */
export type FontWeightToken =
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

/** Block types with typography defaults. */
export type TypographyBlockType = "NexusHeading" | "NexusText" | "NexusQuote";

/** Resolved typography for render. */
export interface ResolvedTypography {
  fontFamily: string;
  fontWeight: number;
  fontStyle?: "normal" | "italic";
}

/** Sidebar options for font family picker. */
export const FONT_FAMILY_OPTIONS: Array<{ label: string; value: FontFamilyToken }> = [
  { label: "Sans (Inter)", value: "sans" },
  { label: "Serif (Source Serif)", value: "serif" },
  { label: "Mono (JetBrains Mono)", value: "mono" },
  { label: "Inherit (parent)", value: "inherit" },
];

/** Full weight scale for sidebar picker. */
export const FONT_WEIGHT_OPTIONS: Array<{ label: string; value: FontWeightToken }> = [
  { label: "Thin (100)", value: "100" },
  { label: "Extra Light (200)", value: "200" },
  { label: "Light (300)", value: "300" },
  { label: "Regular (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "Semibold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
  { label: "Extra Bold (800)", value: "800" },
  { label: "Black (900)", value: "900" },
];

const FONT_FAMILY_CSS: Record<Exclude<FontFamilyToken, "inherit">, string> = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
};

/** Role defaults when block omits explicit typography props. */
const ROLE_DEFAULTS: Record<
  TypographyBlockType,
  { fontFamily: FontFamilyToken; fontWeight: FontWeightToken; fontStyle?: "italic" }
> = {
  NexusHeading: { fontFamily: "sans", fontWeight: "700" },
  NexusText: { fontFamily: "sans", fontWeight: "400" },
  NexusQuote: { fontFamily: "serif", fontWeight: "400", fontStyle: "italic" },
};

/**
 * Default typography for a block type.
 *
 * @param blockType - Puck component type name.
 * @returns Default family and weight.
 */
export function getDefaultTypography(blockType: TypographyBlockType): ResolvedTypography {
  const role = ROLE_DEFAULTS[blockType];
  return resolveTypography(role.fontFamily, role.fontWeight, role.fontStyle);
}

/**
 * Resolve font family token to CSS value.
 *
 * @param token - Stored family token.
 * @returns CSS font-family string.
 */
export function resolveFontFamily(token: FontFamilyToken | undefined): string {
  if (!token || token === "inherit") return "inherit";
  return FONT_FAMILY_CSS[token];
}

/**
 * Resolve family + weight into inline style values.
 *
 * @param fontFamily - Optional override token.
 * @param fontWeight - Optional override weight string.
 * @param fontStyle - Optional style override.
 * @param blockType - Block type for role defaults.
 * @returns Resolved typography for render.
 */
export function resolveBlockTypography(
  blockType: TypographyBlockType,
  fontFamily?: FontFamilyToken | string,
  fontWeight?: FontWeightToken | string,
  fontStyle?: "normal" | "italic",
): ResolvedTypography {
  const defaults = ROLE_DEFAULTS[blockType];
  const familyToken =
    fontFamily === "inherit" || !fontFamily
      ? defaults.fontFamily
      : (fontFamily as FontFamilyToken);
  const weightToken = (fontWeight as FontWeightToken) || defaults.fontWeight;
  const style =
    fontStyle ??
    (familyToken === defaults.fontFamily ? defaults.fontStyle : undefined) ??
    "normal";
  return resolveTypography(familyToken, weightToken, style);
}

/**
 * Build resolved typography from tokens.
 *
 * @param fontFamily - Family token.
 * @param fontWeight - Weight token.
 * @param fontStyle - Optional italic.
 * @returns CSS-ready typography.
 */
export function resolveTypography(
  fontFamily: FontFamilyToken,
  fontWeight: FontWeightToken | string,
  fontStyle?: "normal" | "italic",
): ResolvedTypography {
  return {
    fontFamily: resolveFontFamily(fontFamily),
    fontWeight: parseInt(fontWeight, 10) || 400,
    fontStyle: fontStyle ?? "normal",
  };
}
