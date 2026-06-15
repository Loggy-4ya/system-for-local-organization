/**
 * @fileoverview Resolve spacing-token dimension props stored as objects or legacy strings.
 *
 * @module src/components/puck/lib/resolveSpacingDimension
 */

import { LEGACY_LAYOUT_GAP_MAP } from "./fieldOptionLabels";
import {
  normalizePresetDimensionValue,
  resolvePresetDimension,
  presetValuesFromOptions,
  type PresetDimensionValue,
} from "./resolvePresetDimension";
import { SPACING_TOKEN_LABELS } from "./spacingDisplay";
import { resolveSpacingValue, type SpacingToken } from "./spacingFields";

const SPACING_PRESET_VALUES = presetValuesFromOptions(SPACING_TOKEN_LABELS);

/**
 * Normalize a spacing dimension prop from legacy string or object form.
 *
 * @param raw - Stored prop value.
 * @param defaults - Fallback preset + custom pair.
 * @param legacyMap - Optional legacy aliases (defaults to layout gap map).
 * @returns Normalized preset + custom values.
 */
export function normalizeSpacingDimensionValue(
  raw: unknown,
  defaults: PresetDimensionValue,
  legacyMap: Record<string, string> = LEGACY_LAYOUT_GAP_MAP,
): PresetDimensionValue {
  return normalizePresetDimensionValue(
    raw,
    undefined,
    SPACING_PRESET_VALUES,
    defaults,
    legacyMap,
  );
}

/**
 * Resolve a spacing dimension prop to a CSS length.
 *
 * @param raw - Stored prop (string token or `{ preset, custom }` object).
 * @param defaults - Fallback preset + custom pair.
 * @param legacyMap - Optional legacy aliases.
 * @returns CSS length string.
 */
export function resolveSpacingDimension(
  raw: unknown,
  defaults: PresetDimensionValue,
  legacyMap: Record<string, string> = LEGACY_LAYOUT_GAP_MAP,
): string {
  const { preset, custom } = normalizeSpacingDimensionValue(raw, defaults, legacyMap);
  return resolveSpacingValue(preset as SpacingToken, custom);
}

export default resolveSpacingDimension;
