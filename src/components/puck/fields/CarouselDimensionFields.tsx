"use client";

/**
 * @fileoverview Preset + inline custom dimension fields for NexusCarousel height and corner radius.
 *
 * Uses a single `carouselSize` object field so custom-value edits batch in one Puck `replace`
 * (not `setData`). Custom inputs stay mounted (hidden when inactive) to avoid sidebar remounts.
 *
 * @module src/components/puck/fields/CarouselDimensionFields
 */

import type { SpacingCustomBounds } from "../lib/spacingCustomValue";
import { RADIUS_SELECT_OPTIONS } from "../lib/fieldOptionLabels";
import {
  normalizePresetValue,
  presetValuesFromOptions,
} from "../lib/resolvePresetDimension";
import { PresetDimensionField } from "./PresetDimensionField";

/** Height preset tokens stored on the carousel block. */
export type CarouselHeightPreset = "240px" | "360px" | "480px" | "auto" | "custom";

/** Max height preset tokens stored on the carousel block. */
export type CarouselMaxHeightPreset =
  | "auto"
  | "360px"
  | "480px"
  | "640px"
  | "720px"
  | "custom";

/** Border radius preset tokens stored on the carousel block. */
export type CarouselBorderRadiusPreset =
  | "0"
  | "var(--radius-sm)"
  | "var(--radius-md)"
  | "var(--radius-lg)"
  | "custom";

/** Carousel size settings stored as one Puck object prop. */
export interface CarouselSizeSettings {
  height: string;
  heightCustom: string;
  maxHeight: string;
  maxHeightCustom: string;
  borderRadius: string;
  borderRadiusCustom: string;
}

/** Per-unit clamp overrides for carousel height custom inputs (wider than spacing fields). */
export const CAROUSEL_HEIGHT_CUSTOM_LIMITS: SpacingCustomBounds = {
  px: 2000,
  rem: 125,
  em: 125,
};

const DEFAULT_CAROUSEL_SIZE: CarouselSizeSettings = {
  height: "auto",
  heightCustom: "360px",
  maxHeight: "auto",
  maxHeightCustom: "640px",
  borderRadius: "var(--radius-md)",
  borderRadiusCustom: "var(--radius-md)",
};

/** Minimum empty slide / drop-zone height when height preset is `auto`. */
export const CAROUSEL_AUTO_MIN_HEIGHT_PX = 240;

const HEIGHT_PRESETS: Array<{ label: string; value: CarouselHeightPreset }> = [
  { label: "Small (240px)", value: "240px" },
  { label: "Medium (360px)", value: "360px" },
  { label: "Large (480px)", value: "480px" },
  { label: "Auto", value: "auto" },
  { label: "Custom", value: "custom" },
];

const MAX_HEIGHT_PRESETS: Array<{ label: string; value: CarouselMaxHeightPreset }> = [
  { label: "Auto", value: "auto" },
  { label: "360px", value: "360px" },
  { label: "480px", value: "480px" },
  { label: "640px", value: "640px" },
  { label: "720px", value: "720px" },
  { label: "Custom", value: "custom" },
];

const HEIGHT_PRESET_VALUES = presetValuesFromOptions(HEIGHT_PRESETS);
const MAX_HEIGHT_PRESET_VALUES = presetValuesFromOptions(MAX_HEIGHT_PRESETS);
const BORDER_RADIUS_PRESETS = RADIUS_SELECT_OPTIONS as unknown as Array<{
  label: string;
  value: CarouselBorderRadiusPreset;
}>;
const BORDER_RADIUS_PRESET_VALUES = presetValuesFromOptions(BORDER_RADIUS_PRESETS);

/** Resolved carousel height mode for render. */
export type CarouselEffectiveHeight =
  | { mode: "auto" }
  | { mode: "auto-capped"; maxHeight: string }
  | { mode: "fixed"; height: string; maxHeight?: string };

/** Puck custom field props for the combined carousel size field. */
interface CarouselSizeFieldGroupProps {
  value: CarouselSizeSettings | undefined;
  onChange: (value: CarouselSizeSettings) => void;
}

/**
 * Normalize legacy flat props or partial objects into {@link CarouselSizeSettings}.
 *
 * @param input - Stored carouselSize or legacy flat props.
 * @returns Complete size settings object.
 */
export function normalizeCarouselSizeSettings(
  input: Partial<CarouselSizeSettings> | undefined,
): CarouselSizeSettings {
  return {
    height: input?.height ?? DEFAULT_CAROUSEL_SIZE.height,
    heightCustom: input?.heightCustom ?? DEFAULT_CAROUSEL_SIZE.heightCustom,
    maxHeight: input?.maxHeight ?? DEFAULT_CAROUSEL_SIZE.maxHeight,
    maxHeightCustom: input?.maxHeightCustom ?? DEFAULT_CAROUSEL_SIZE.maxHeightCustom,
    borderRadius: input?.borderRadius ?? DEFAULT_CAROUSEL_SIZE.borderRadius,
    borderRadiusCustom:
      input?.borderRadiusCustom ?? DEFAULT_CAROUSEL_SIZE.borderRadiusCustom,
  };
}

/**
 * Parse a CSS length into pixel count for Puck `minEmptyHeight` (number only).
 *
 * @param value - CSS length such as `360px` or `24rem`.
 * @param fallback - Pixel fallback when parsing fails.
 * @returns Integer pixel height for Puck drop zones.
 */
export function resolveCarouselMinEmptyHeightPx(
  value: string | undefined,
  fallback = 280,
): number {
  if (!value) return fallback;
  const pxMatch = value.trim().match(/^(\d+(?:\.\d+)?)px$/i);
  if (pxMatch) return Math.round(parseFloat(pxMatch[1]));
  const remMatch = value.trim().match(/^(\d+(?:\.\d+)?)rem$/i);
  if (remMatch) return Math.round(parseFloat(remMatch[1]) * 16);
  const emMatch = value.trim().match(/^(\d+(?:\.\d+)?)em$/i);
  if (emMatch) return Math.round(parseFloat(emMatch[1]) * 16);
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
}

/**
 * Resolve carousel min-height for render from preset + optional custom value.
 *
 * @param height - Stored height preset token.
 * @param heightCustom - Custom CSS length when preset is `custom`.
 * @returns CSS min-height or undefined for auto.
 */
export function resolveCarouselHeight(
  height: string | undefined,
  heightCustom?: string,
): string | undefined {
  if (!height || height === "auto") return undefined;
  if (height === "custom") {
    const trimmed = heightCustom?.trim();
    return trimmed || "360px";
  }
  return height;
}

/**
 * Resolve carousel max-height cap from preset + optional custom value.
 *
 * @param maxHeight - Stored max-height preset token.
 * @param maxHeightCustom - Custom CSS length when preset is `custom`.
 * @returns CSS max-height or undefined when uncapped (`auto`).
 */
export function resolveCarouselMaxHeight(
  maxHeight: string | undefined,
  maxHeightCustom?: string,
): string | undefined {
  if (!maxHeight || maxHeight === "auto") return undefined;
  if (maxHeight === "custom") {
    const trimmed = maxHeightCustom?.trim();
    return trimmed || "640px";
  }
  return maxHeight;
}

/**
 * Pick the smaller of two resolved CSS lengths when both parse to pixels.
 *
 * @param a - First CSS length.
 * @param b - Second CSS length.
 * @returns The shorter length in pixels, or the first value when comparison fails.
 */
function minCssLengthPx(a: string, b: string): string {
  const aPx = resolveCarouselMinEmptyHeightPx(a, -1);
  const bPx = resolveCarouselMinEmptyHeightPx(b, -1);
  if (aPx < 0 || bPx < 0) return a;
  return aPx <= bPx ? a : b;
}

/**
 * Resolve effective carousel height for render (min + max cap).
 *
 * Max height always caps rendered height. When min fixed height exceeds max, max wins.
 *
 * @param height - Min slide height preset.
 * @param heightCustom - Custom min height when preset is `custom`.
 * @param maxHeight - Max slide height preset.
 * @param maxHeightCustom - Custom max height when preset is `custom`.
 * @returns Effective height mode for CSS classes and variables.
 */
export function resolveCarouselEffectiveHeight(
  height: string | undefined,
  heightCustom?: string,
  maxHeight?: string,
  maxHeightCustom?: string,
): CarouselEffectiveHeight {
  const resolvedMin = resolveCarouselHeight(height, heightCustom);
  const resolvedMax = resolveCarouselMaxHeight(maxHeight, maxHeightCustom);

  if (!resolvedMin) {
    if (resolvedMax) {
      return { mode: "auto-capped", maxHeight: resolvedMax };
    }
    return { mode: "auto" };
  }

  if (resolvedMax) {
    return {
      mode: "fixed",
      height: minCssLengthPx(resolvedMin, resolvedMax),
      maxHeight: resolvedMax,
    };
  }

  return { mode: "fixed", height: resolvedMin };
}

/**
 * Resolve carousel corner radius for render from preset + optional custom value.
 *
 * @param borderRadius - Stored radius preset token.
 * @param borderRadiusCustom - Custom CSS length when preset is `custom`.
 * @returns CSS border-radius value.
 */
export function resolveCarouselBorderRadius(
  borderRadius: string | undefined,
  borderRadiusCustom?: string,
): string {
  if (!borderRadius || borderRadius === "custom") {
    const trimmed = borderRadiusCustom?.trim();
    return trimmed || "var(--radius-md)";
  }
  return borderRadius;
}

/**
 * Combined height + corner radius field group for the carousel block sidebar.
 *
 * @param props - Puck custom field props.
 * @returns Size and radius controls.
 */
export function CarouselSizeFieldGroup({ value, onChange }: CarouselSizeFieldGroupProps) {
  const size = normalizeCarouselSizeSettings(value);
  const heightStored = normalizePresetValue(size.height, HEIGHT_PRESET_VALUES, "auto");
  const maxHeightStored = normalizePresetValue(size.maxHeight, MAX_HEIGHT_PRESET_VALUES, "auto");
  const radiusStored = normalizePresetValue(
    size.borderRadius,
    BORDER_RADIUS_PRESET_VALUES,
    "var(--radius-md)",
  );

  const patch = (partial: Partial<CarouselSizeSettings>) => {
    onChange({ ...size, ...partial });
  };

  return (
    <div className="nexus-carousel-size-fields">
      <PresetDimensionField
        label="Min Slide Height"
        value={{ preset: heightStored, custom: size.heightCustom }}
        onChange={({ preset, custom }) => {
          patch({ height: preset, heightCustom: custom });
        }}
        options={HEIGHT_PRESETS.map((opt) => ({ label: opt.label, value: opt.value }))}
        customAriaLabel="Custom carousel min height"
        customMaxByUnit={CAROUSEL_HEIGHT_CUSTOM_LIMITS}
      />

      <PresetDimensionField
        label="Max Slide Height"
        value={{ preset: maxHeightStored, custom: size.maxHeightCustom }}
        onChange={({ preset, custom }) => {
          patch({ maxHeight: preset, maxHeightCustom: custom });
        }}
        options={MAX_HEIGHT_PRESETS.map((opt) => ({ label: opt.label, value: opt.value }))}
        customAriaLabel="Custom carousel max height"
        customMaxByUnit={CAROUSEL_HEIGHT_CUSTOM_LIMITS}
      />

      <PresetDimensionField
        label="Corner Radius"
        value={{ preset: radiusStored, custom: size.borderRadiusCustom }}
        onChange={({ preset, custom }) => {
          patch({ borderRadius: preset, borderRadiusCustom: custom });
        }}
        options={BORDER_RADIUS_PRESETS.map((opt) => ({ label: opt.label, value: opt.value }))}
        customAriaLabel="Custom carousel corner radius"
      />
    </div>
  );
}

export default CarouselSizeFieldGroup;
