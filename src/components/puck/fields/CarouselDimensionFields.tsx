"use client";

/**
 * @fileoverview Preset + inline custom dimension fields for NexusCarousel height and corner radius.
 *
 * Uses a single `carouselSize` object field so custom-value edits batch in one Puck `replace`
 * (not `setData`). Custom inputs stay mounted (hidden when inactive) to avoid sidebar remounts.
 *
 * @module src/components/puck/fields/CarouselDimensionFields
 */

import { FieldLabel } from "@measured/puck";
import { CustomDimensionInput } from "./CustomDimensionInput";
import { PuckSelectField } from "./PuckSelectField";

/** Height preset tokens stored on the carousel block. */
export type CarouselHeightPreset = "240px" | "360px" | "480px" | "auto" | "custom";

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
  borderRadius: string;
  borderRadiusCustom: string;
}

const DEFAULT_CAROUSEL_SIZE: CarouselSizeSettings = {
  height: "auto",
  heightCustom: "360px",
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

const BORDER_RADIUS_PRESETS: Array<{ label: string; value: CarouselBorderRadiusPreset }> = [
  { label: "None", value: "0" },
  { label: "Small", value: "var(--radius-sm)" },
  { label: "Medium", value: "var(--radius-md)" },
  { label: "Large", value: "var(--radius-lg)" },
  { label: "Custom", value: "custom" },
];

const HEIGHT_PRESET_VALUES = new Set<string>(HEIGHT_PRESETS.map((opt) => opt.value));
const BORDER_RADIUS_PRESET_VALUES = new Set<string>(BORDER_RADIUS_PRESETS.map((opt) => opt.value));

/** Puck custom field props for the combined carousel size field. */
interface CarouselSizeFieldGroupProps {
  field: { label?: string };
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
export function CarouselSizeFieldGroup({ field, value, onChange }: CarouselSizeFieldGroupProps) {
  const size = normalizeCarouselSizeSettings(value);
  const heightStored = HEIGHT_PRESET_VALUES.has(size.height) ? size.height : "custom";
  const radiusStored = BORDER_RADIUS_PRESET_VALUES.has(size.borderRadius)
    ? size.borderRadius
    : "custom";

  const patch = (partial: Partial<CarouselSizeSettings>) => {
    onChange({ ...size, ...partial });
  };

  const handleHeightPresetChange = (next: string) => {
    patch({ height: next });
  };

  const handleRadiusPresetChange = (next: string) => {
    patch({ borderRadius: next });
  };

  return (
    <FieldLabel label={field.label ?? "Carousel Size"}>
      <div className="nexus-puck-field nexus-carousel-size-fields" style={{ marginTop: 4 }}>
        <span className="nexus-carousel-dimension-custom__label">Min Slide Height</span>
        <PuckSelectField
          value={heightStored}
          onChange={handleHeightPresetChange}
          options={HEIGHT_PRESETS.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
        <CustomDimensionInput
          value={size.heightCustom}
          onChange={(next) => patch({ heightCustom: next })}
          hidden={heightStored !== "custom"}
          ariaLabel="Custom carousel height"
        />

        <span
          className="nexus-carousel-dimension-custom__label"
          style={{ display: "block", marginTop: 12 }}
        >
          Corner Radius
        </span>
        <PuckSelectField
          value={radiusStored}
          onChange={handleRadiusPresetChange}
          options={BORDER_RADIUS_PRESETS.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
        <CustomDimensionInput
          value={size.borderRadiusCustom}
          onChange={(next) => patch({ borderRadiusCustom: next })}
          hidden={radiusStored !== "custom"}
          ariaLabel="Custom carousel corner radius"
        />
      </div>
    </FieldLabel>
  );
}

export default CarouselSizeFieldGroup;
