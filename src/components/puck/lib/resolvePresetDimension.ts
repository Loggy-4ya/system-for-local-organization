/**
 * @fileoverview Resolve preset + custom CSS dimension values for Puck blocks.
 *
 * @module src/components/puck/lib/resolvePresetDimension
 */

/** Stored preset + optional custom CSS length. */
export interface PresetDimensionValue {
  preset: string;
  custom: string;
}

/**
 * Map a stored string to a select index (defaults to fallback preset).
 *
 * @param stored - Current stored preset token.
 * @param presetValues - Known preset tokens including `custom`.
 * @param fallback - Preset when stored is unknown.
 * @returns Normalized preset token for sidebar selects.
 */
export function normalizePresetValue(
  stored: string | undefined,
  presetValues: Set<string>,
  fallback: string,
): string {
  if (!stored) return fallback;
  if (presetValues.has(stored)) return stored;
  return "custom";
}

/**
 * Normalize legacy flat props or partial objects into {@link PresetDimensionValue}.
 *
 * @param raw - Stored prop (string token, object, or legacy alias).
 * @param customProp - Companion `*Custom` flat prop when `raw` is a string.
 * @param presetValues - Known preset tokens including `custom`.
 * @param legacyMap - Optional legacy token aliases (e.g. `medium` → `md`).
 * @param defaults - Fallback preset and custom values.
 * @returns Complete preset + custom pair for sidebar controls.
 */
export function normalizePresetDimensionValue(
  raw: unknown,
  customProp: string | undefined,
  presetValues: Set<string>,
  defaults: PresetDimensionValue,
  legacyMap?: Record<string, string>,
): PresetDimensionValue {
  if (raw && typeof raw === "object" && "preset" in raw) {
    const obj = raw as Partial<PresetDimensionValue>;
    const preset = String(obj.preset ?? defaults.preset);
    const custom = String(obj.custom ?? defaults.custom);
    if (presetValues.has(preset)) {
      return { preset, custom };
    }
    return { preset: "custom", custom: custom || preset };
  }

  let preset = typeof raw === "string" ? raw : defaults.preset;
  if (legacyMap && preset in legacyMap) {
    preset = legacyMap[preset];
  }

  if (presetValues.has(preset)) {
    return { preset, custom: customProp ?? defaults.custom };
  }

  if (typeof raw === "string" && raw.trim()) {
    return { preset: "custom", custom: raw };
  }

  return {
    preset: presetValues.has(defaults.preset) ? defaults.preset : "custom",
    custom: customProp ?? defaults.custom,
  };
}

/**
 * Resolve a preset token + custom CSS value to a CSS length string.
 *
 * @param preset - Stored preset token.
 * @param custom - Custom CSS when preset is `custom`.
 * @param presetMap - Map of preset tokens to CSS values.
 * @param fallback - CSS fallback when preset is missing.
 * @returns Resolved CSS value.
 */
export function resolvePresetDimension(
  preset: string | undefined,
  custom: string | undefined,
  presetMap: Record<string, string>,
  fallback: string,
): string {
  if (!preset || preset === "none") {
    return presetMap.none ?? "0";
  }
  if (preset === "custom") {
    const trimmed = custom?.trim();
    return trimmed || fallback;
  }
  return presetMap[preset] ?? fallback;
}

/**
 * Build a Set of allowed preset values from select options.
 *
 * @param options - Puck select / dimension options.
 * @returns Set of option values.
 */
export function presetValuesFromOptions(
  options: ReadonlyArray<{ value: string; [key: string]: any }>,
): Set<string> {
  return new Set(options.map((opt) => opt.value));
}
