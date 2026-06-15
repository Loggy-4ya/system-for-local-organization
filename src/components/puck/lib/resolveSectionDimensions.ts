/**
 * @fileoverview Resolve section padding and max-width dimension props.
 *
 * @module src/components/puck/lib/resolveSectionDimensions
 */

import {
  CONTENT_WIDTH_MAP,
  normalizeContentWidth,
  resolveContentWidth,
  type ContentWidthToken,
} from "./contentWidthTokens";
import {
  LEGACY_SECTION_PADDING_MAP,
  SECTION_PADDING_OPTIONS,
} from "./fieldOptionLabels";
import {
  normalizePresetDimensionValue,
  presetValuesFromOptions,
  resolvePresetDimension,
  type PresetDimensionValue,
} from "./resolvePresetDimension";

const SECTION_PADDING_PRESET_VALUES = presetValuesFromOptions(SECTION_PADDING_OPTIONS);

/** CSS padding per section padding token (vertical + horizontal). */
const SECTION_PADDING_CSS: Record<string, string> = {
  none: "0",
  sm: "var(--spacing-sm) var(--spacing-md)",
  md: "var(--spacing-lg) var(--spacing-md)",
  lg: "var(--spacing-2xl) var(--spacing-md)",
};

const SECTION_PADDING_DEFAULTS: PresetDimensionValue = {
  preset: "md",
  custom: "var(--spacing-lg) var(--spacing-md)",
};

/**
 * Normalize section padding from legacy string or object form.
 *
 * @param raw - Stored padding prop.
 * @returns Normalized preset + custom pair.
 */
export function normalizeSectionPaddingValue(raw: unknown): PresetDimensionValue {
  return normalizePresetDimensionValue(
    raw,
    undefined,
    SECTION_PADDING_PRESET_VALUES,
    SECTION_PADDING_DEFAULTS,
    LEGACY_SECTION_PADDING_MAP,
  );
}

/**
 * Resolve section padding to a CSS padding value.
 *
 * @param raw - Stored padding prop.
 * @returns CSS padding string.
 */
export function resolveSectionPadding(raw: unknown): string {
  const { preset, custom } = normalizeSectionPaddingValue(raw);
  return resolvePresetDimension(
    preset,
    custom,
    SECTION_PADDING_CSS,
    SECTION_PADDING_DEFAULTS.custom,
  );
}

/**
 * Resolve section max-width from content width token or custom CSS.
 *
 * @param raw - Stored max-width prop.
 * @param custom - Custom CSS when preset is `custom`.
 * @returns CSS max-width value.
 */
export function resolveSectionMaxWidth(raw: unknown, custom?: string): string {
  if (raw === "custom" || (typeof raw === "object" && raw !== null && "preset" in raw)) {
    const normalized =
      typeof raw === "object" && raw !== null && "preset" in raw
        ? normalizePresetDimensionValue(
            raw,
            undefined,
            new Set([...Object.keys(CONTENT_WIDTH_MAP), "custom"]),
            { preset: "lg", custom: custom ?? "1200px" },
          )
        : { preset: "custom" as const, custom: custom ?? "1200px" };
    if (normalized.preset === "custom") {
      return normalized.custom.trim() || CONTENT_WIDTH_MAP.lg;
    }
    return resolveContentWidth(normalized.preset);
  }

  if (typeof raw === "string" && raw === "custom") {
    return custom?.trim() || CONTENT_WIDTH_MAP.lg;
  }

  return resolveContentWidth(raw as ContentWidthToken);
}

export default resolveSectionPadding;
