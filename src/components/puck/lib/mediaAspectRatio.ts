/**
 * @fileoverview Universal media aspect-ratio presets for video, image, and carousel fill.
 *
 * @module src/components/puck/lib/mediaAspectRatio
 */

import type { PresetDimensionValue } from "./resolvePresetDimension";

/** Numeric width÷height for each preset token (`16-9` → 16/9). */
export const MEDIA_ASPECT_RATIO_TOKEN_MAP: Record<string, number> = {
  "16-9": 16 / 9,
  "4-3": 4 / 3,
  "1-1": 1,
  "21-9": 21 / 9,
  "9-16": 9 / 16,
  "3-2": 3 / 2,
  "2-3": 2 / 3,
  "5-4": 5 / 4,
  "4-5": 4 / 5,
};

/** Sidebar select options — preset ratios plus custom entry. */
export const MEDIA_ASPECT_RATIO_OPTIONS = [
  { label: "16:9 (Widescreen)", value: "16-9" },
  { label: "4:3 (Standard)", value: "4-3" },
  { label: "1:1 (Square)", value: "1-1" },
  { label: "21:9 (Ultrawide)", value: "21-9" },
  { label: "9:16 (Vertical)", value: "9-16" },
  { label: "3:2 (Photo)", value: "3-2" },
  { label: "2:3 (Portrait photo)", value: "2-3" },
  { label: "5:4", value: "5-4" },
  { label: "4:5 (Portrait)", value: "4-5" },
  { label: "Custom", value: "custom" },
] as const;

/** Default stored value for new blocks. */
export const MEDIA_ASPECT_RATIO_DEFAULTS: PresetDimensionValue = {
  preset: "16-9",
  custom: "16/9",
};

/** Fallback numeric ratio when parsing fails. */
export const MEDIA_ASPECT_RATIO_FALLBACK = MEDIA_ASPECT_RATIO_TOKEN_MAP["16-9"];

/**
 * Parse free-form aspect input (`16/9`, `16:9`, `1.77`, or token `16-9`).
 *
 * @param input - Raw custom value from sidebar.
 * @returns Width÷height or null when invalid.
 */
export function parseCustomMediaAspectRatioInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fraction = trimmed.match(/^(\d+(?:\.\d+)?)\s*[/:x×]\s*(\d+(?:\.\d+)?)$/i);
  if (fraction) {
    const width = Number(fraction[1]);
    const height = Number(fraction[2]);
    if (width > 0 && height > 0) return width / height;
  }

  if (trimmed in MEDIA_ASPECT_RATIO_TOKEN_MAP) {
    return MEDIA_ASPECT_RATIO_TOKEN_MAP[trimmed];
  }

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric > 0) return numeric;

  return null;
}

/**
 * Resolve numeric aspect ratio from preset + custom pair.
 *
 * @param preset - Stored preset token or `custom`.
 * @param custom - Custom ratio string when preset is `custom`.
 * @returns Width divided by height.
 */
export function resolveMediaAspectRatioNumeric(
  preset: string | undefined,
  custom?: string,
): number {
  if (!preset || preset === "custom") {
    const parsed = parseCustomMediaAspectRatioInput(custom ?? "");
    return parsed ?? MEDIA_ASPECT_RATIO_FALLBACK;
  }

  if (preset in MEDIA_ASPECT_RATIO_TOKEN_MAP) {
    return MEDIA_ASPECT_RATIO_TOKEN_MAP[preset];
  }

  const parsedPreset = parseCustomMediaAspectRatioInput(preset);
  return parsedPreset ?? MEDIA_ASPECT_RATIO_FALLBACK;
}

/**
 * Resolve numeric ratio from a normalized {@link PresetDimensionValue}.
 *
 * @param value - Preset + custom pair from sidebar normalization.
 * @returns Width divided by height.
 */
export function resolveMediaAspectRatioFromValue(value: PresetDimensionValue): number {
  return resolveMediaAspectRatioNumeric(value.preset, value.custom);
}

/**
 * Parse a `"W/H"` DOM attribute into a numeric ratio.
 *
 * @param value - Attribute value such as `"16/9"`.
 * @param fallback - Ratio when parsing fails.
 * @returns Width divided by height.
 */
export function parseMediaAspectRatioAttr(
  value: string | null | undefined,
  fallback = MEDIA_ASPECT_RATIO_FALLBACK,
): number {
  if (!value) return fallback;

  const slashParsed = parseCustomMediaAspectRatioInput(value.replace("/", "/"));
  if (slashParsed !== null) return slashParsed;

  const [widthPart, heightPart] = value.split("/").map(Number);
  if (widthPart > 0 && heightPart > 0) {
    return widthPart / heightPart;
  }

  return fallback;
}

/**
 * Encode a numeric ratio as `"W/H"` for {@link NEXUS_MEDIA_ASPECT_ATTR}.
 *
 * @param ratio - Width divided by height.
 * @returns Attribute-safe fraction string.
 */
export function ratioToMediaAspectAttr(ratio: number): string {
  for (const [token, tokenRatio] of Object.entries(MEDIA_ASPECT_RATIO_TOKEN_MAP)) {
    if (Math.abs(tokenRatio - ratio) < 0.0005) {
      const [width, height] = token.split("-");
      return `${width}/${height}`;
    }
  }

  const heightUnit = 10000;
  const widthUnit = Math.round(ratio * heightUnit);
  return `${widthUnit}/${heightUnit}`;
}
