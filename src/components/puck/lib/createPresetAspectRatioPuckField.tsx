"use client";

/**
 * @fileoverview Factory for Puck preset + custom aspect-ratio sidebar fields.
 *
 * @module src/components/puck/lib/createPresetAspectRatioPuckField
 */

import { createPresetDimensionPuckField } from "./createPresetDimensionPuckField";
import {
  MEDIA_ASPECT_RATIO_DEFAULTS,
  MEDIA_ASPECT_RATIO_OPTIONS,
} from "./mediaAspectRatio";

/**
 * Create a Puck custom field for universal media aspect-ratio presets.
 *
 * @param label - Sidebar field label.
 * @returns Puck field definition using preset select + custom ratio input.
 */
export function createPresetAspectRatioPuckField(label: string) {
  return createPresetDimensionPuckField({
    label,
    options: [...MEDIA_ASPECT_RATIO_OPTIONS],
    defaultPreset: MEDIA_ASPECT_RATIO_DEFAULTS.preset,
    defaultCustom: MEDIA_ASPECT_RATIO_DEFAULTS.custom,
    customMode: "text",
    customPlaceholder: "16/9",
  });
}

export default createPresetAspectRatioPuckField;
