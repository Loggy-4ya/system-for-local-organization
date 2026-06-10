/**
 * @fileoverview Nexus design-system color token catalog for Puck fields.
 *
 * Curated dual-theme palette: one balanced shade per hue family on the color
 * wheel, plus semantic text/surface/border tokens from `globals.css`.
 *
 * @module src/components/puck/lib/nexusColorTokens
 */

/** All supported Nexus color token identifiers. */
export type NexusColorToken = string;

/** Select option shape for Puck fields. */
export interface ColorTokenOption {
  label: string;
  value: NexusColorToken;
  /** Optional CSS color for swatch preview in the field UI. */
  swatch?: string;
}

/** Maps legacy multi-shade token ids to the simplified catalog. */
const LEGACY_TOKEN_ALIASES: Record<string, string> = {
  "blue-soft": "hue-blue",
  "blue-medium": "hue-blue",
  "blue-strong": "hue-blue",
  "red-soft": "hue-warm",
  "red-medium": "hue-warm",
  "red-strong": "hue-warm",
  "yellow-soft": "hue-gold",
  "yellow-medium": "hue-gold",
  "yellow-strong": "hue-gold",
  "green-soft": "hue-green",
  "green-medium": "hue-green",
  "green-strong": "hue-green",
  "purple-soft": "hue-purple",
  "purple-medium": "hue-purple",
  "purple-strong": "hue-purple",
  "surface-elevated": "surface-panel",
  "glass-elevated": "glass-panel",
  "accent-tint-soft": "accent-tint",
  "accent-tint-medium": "accent-tint",
  "border-accent-soft": "border-accent",
  "border-accent-medium": "border-accent",
  "border-accent-strong": "border-accent",
};

/** CSS values resolved from token ids. */
const TOKEN_CSS: Record<string, string> = {
  "text-primary": "var(--color-text-primary)",
  "text-secondary": "var(--color-text-secondary)",
  "accent-user": "var(--color-accent-user)",
  "surface-panel": "var(--color-bg-panel)",
  "surface-neutral": "var(--color-bg-panel)",
  "hue-blue": "var(--accent-blue-medium)",
  "hue-green": "var(--accent-green-medium)",
  "hue-purple": "var(--accent-purple-medium)",
  "hue-warm": "var(--accent-red-medium)",
  "hue-gold": "var(--accent-yellow-medium)",
  "glass-panel": "color-mix(in srgb, var(--color-bg-panel) 94%, transparent)",
  "accent-tint": "color-mix(in srgb, var(--color-accent-user) 16%, transparent)",
  "border-default": "var(--color-border-default)",
  "border-accent": "color-mix(in srgb, var(--color-accent-user) 45%, transparent)",
};

/** Text color presets — semantic only. */
export const TEXT_COLOR_OPTIONS: ColorTokenOption[] = [
  { label: "Primary", value: "text-primary" },
  { label: "Secondary", value: "text-secondary" },
  { label: "Accent", value: "accent-user" },
];

/** Island / panel fill presets — glass, surface, or accent wash. */
export const ISLAND_FILL_OPTIONS: ColorTokenOption[] = [
  { label: "Glass", value: "glass-panel" },
  { label: "Surface", value: "surface-panel" },
  { label: "Accent Wash", value: "accent-tint" },
];

/** Island / divider border presets. */
export const ISLAND_BORDER_OPTIONS: ColorTokenOption[] = [
  { label: "Default", value: "border-default" },
  { label: "Accent", value: "border-accent" },
];

/** Page solid-background hues — one balanced shade per color-wheel family. */
export const PAGE_HUE_OPTIONS: ColorTokenOption[] = [
  { label: "Neutral Surface", value: "surface-neutral" },
  { label: "Blue", value: "hue-blue" },
  { label: "Green", value: "hue-green" },
  { label: "Purple", value: "hue-purple" },
  { label: "Warm", value: "hue-warm" },
  { label: "Gold", value: "hue-gold" },
];

/** Preset groups exposed to {@link NexusColorPresetField}. */
export type ColorPresetGroup = "text" | "island-fill" | "island-border";

/**
 * Return select options for a preset group.
 *
 * @param group - Which token family to list.
 * @returns Options for the field UI.
 */
export function getColorOptionsForGroup(group: ColorPresetGroup): ColorTokenOption[] {
  switch (group) {
    case "text":
      return TEXT_COLOR_OPTIONS;
    case "island-fill":
      return ISLAND_FILL_OPTIONS;
    case "island-border":
      return ISLAND_BORDER_OPTIONS;
    default:
      return TEXT_COLOR_OPTIONS;
  }
}

/**
 * Normalize legacy token ids to the simplified catalog.
 *
 * @param token - Raw token id from stored Puck props.
 * @returns Canonical token id.
 */
export function normalizeColorToken(token: NexusColorToken | undefined): NexusColorToken | undefined {
  if (!token) return token;
  return LEGACY_TOKEN_ALIASES[token] ?? token;
}

/**
 * Resolve a stored token id to a CSS color value.
 *
 * @param token - Token id from Puck props.
 * @param fallback - CSS value when token is missing or unknown.
 * @returns Resolved CSS color string.
 */
export function resolveNexusColor(
  token: NexusColorToken | undefined,
  fallback = "var(--color-text-primary)",
): string {
  const normalized = normalizeColorToken(token);
  if (!normalized) return fallback;
  return TOKEN_CSS[normalized] ?? TOKEN_CSS[token ?? ""] ?? fallback;
}

/**
 * Map legacy Heading/Text `colorType` props to token ids.
 *
 * @param colorType - Legacy prop value.
 * @param customColor - Legacy raw color (ignored; presets only).
 * @returns Token id for {@link resolveNexusColor}.
 */
export function legacyColorTypeToToken(
  colorType?: string,
  customColor?: string,
): NexusColorToken {
  if (colorType === "secondary") return "text-secondary";
  if (colorType === "accent") return "accent-user";
  if (colorType === "custom" && customColor) {
    return normalizeColorToken(customColor) ?? "text-primary";
  }
  return "text-primary";
}
