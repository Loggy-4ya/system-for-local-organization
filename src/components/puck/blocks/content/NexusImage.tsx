"use client";

/**
 * @fileoverview Puck block for an Image element.
 *
 * Supports URL entry, file upload, alt text, custom dimensions,
 * alignment, border-radius, shadow effects, and carousel slide fill.
 *
 * @module src/components/puck/blocks/content/NexusImage
 */

import { MediaUploadField } from "../../fields/MediaUploadField";
import { createPresetAspectRatioPuckField } from "../../lib/createPresetAspectRatioPuckField";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import {
  CAROUSEL_MEDIA_FILL_OPTIONS,
  IMAGE_HEIGHT_OPTIONS,
  IMAGE_WIDTH_OPTIONS,
  MEDIA_FIT_OPTIONS,
  RADIUS_EXTENDED_SELECT_OPTIONS,
  SHADOW_DEPTH_OPTIONS,
} from "../../lib/fieldOptionLabels";
import {
  MEDIA_ASPECT_RATIO_DEFAULTS,
  MEDIA_ASPECT_RATIO_OPTIONS,
} from "../../lib/mediaAspectRatio";
import {
  normalizePresetDimensionValue,
  presetValuesFromOptions,
  resolvePresetDimension,
} from "../../lib/resolvePresetDimension";
import { NexusImageRender } from "./NexusImageRender";

const WIDTH_PRESET_VALUES = presetValuesFromOptions(IMAGE_WIDTH_OPTIONS);
const HEIGHT_PRESET_VALUES = presetValuesFromOptions(IMAGE_HEIGHT_OPTIONS);
const RADIUS_PRESET_VALUES = presetValuesFromOptions(RADIUS_EXTENDED_SELECT_OPTIONS);
const SHADOW_PRESET_VALUES = presetValuesFromOptions(SHADOW_DEPTH_OPTIONS);
const ASPECT_RATIO_PRESET_VALUES = presetValuesFromOptions([...MEDIA_ASPECT_RATIO_OPTIONS]);

const WIDTH_DEFAULTS = { preset: "100%", custom: "100%" };
const HEIGHT_DEFAULTS = { preset: "auto", custom: "auto" };
const RADIUS_DEFAULTS = { preset: "var(--radius-md)", custom: "var(--radius-md)" };
const SHADOW_DEFAULTS = { preset: "none", custom: "none" };

/**
 * Resolve image dimension props for render.
 *
 * @param raw - Stored preset object or legacy string.
 * @param presetValues - Allowed preset tokens.
 * @param defaults - Fallback preset + custom pair.
 * @param presetMap - Map of preset token to CSS value.
 * @param fallback - CSS fallback for custom/unknown values.
 * @returns Resolved CSS value.
 */
function resolveImageDimension(
  raw: unknown,
  presetValues: Set<string>,
  defaults: { preset: string; custom: string },
  presetMap: Record<string, string>,
  fallback: string,
): string {
  const normalized = normalizePresetDimensionValue(raw, undefined, presetValues, defaults);
  return resolvePresetDimension(normalized.preset, normalized.custom, presetMap, fallback);
}

export const NexusImage = {
  label: "Image",
  fields: {
    image: {
      type: "custom" as const,
      label: "Image Source",
      render: MediaUploadField as never,
    },
    alt: {
      type: "text" as const,
      label: "Alt Text",
    },
    carouselFill: {
      type: "radio" as const,
      label: "In Carousel Slides",
      options: [...CAROUSEL_MEDIA_FILL_OPTIONS],
    },
    mediaFit: {
      type: "radio" as const,
      label: "Media Fit",
      options: [...MEDIA_FIT_OPTIONS],
    },
    aspectRatio: createPresetAspectRatioPuckField("Aspect Ratio"),
    width: createPresetDimensionPuckField({
      label: "Width",
      options: IMAGE_WIDTH_OPTIONS,
      defaultPreset: "100%",
      defaultCustom: "100%",
      units: ["px", "rem", "em", "%"],
    }),
    height: createPresetDimensionPuckField({
      label: "Height",
      options: IMAGE_HEIGHT_OPTIONS,
      defaultPreset: "auto",
      defaultCustom: "auto",
      units: ["px", "rem", "em", "%"],
    }),
    align: {
      type: "radio" as const,
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    borderRadius: createPresetDimensionPuckField({
      label: "Border Radius",
      options: RADIUS_EXTENDED_SELECT_OPTIONS,
      defaultPreset: "var(--radius-md)",
      defaultCustom: "var(--radius-md)",
    }),
    shadowDepth: createPresetDimensionPuckField({
      label: "Shadow Depth",
      options: SHADOW_DEPTH_OPTIONS,
      defaultPreset: "none",
      defaultCustom: "0 4px 12px rgba(0,0,0,0.1)",
      customMode: "text",
      customPlaceholder: "e.g. 0 8px 24px rgba(0,0,0,0.2)",
    }),
  },
  defaultProps: {
    image: "",
    alt: "Nexus Image",
    carouselFill: "auto" as const,
    mediaFit: "cover" as const,
    aspectRatio: MEDIA_ASPECT_RATIO_DEFAULTS,
    width: { preset: "100%", custom: "100%" },
    height: { preset: "auto", custom: "auto" },
    align: "center" as const,
    borderRadius: { preset: "var(--radius-md)", custom: "var(--radius-md)" },
    shadowDepth: { preset: "none", custom: "none" },
  },
  render: (props: {
    id?: string;
    image: string;
    alt: string;
    carouselFill?: "auto" | "fill" | "natural";
    mediaFit?: "cover" | "contain";
    aspectRatio?: unknown;
    width: unknown;
    height: unknown;
    align: "left" | "center" | "right";
    borderRadius: unknown;
    shadowDepth: unknown;
    puck?: { isEditing?: boolean };
  }) => {
    const widthMap = Object.fromEntries(
      IMAGE_WIDTH_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [opt.value, opt.value]),
    );
    const heightMap = Object.fromEntries(
      IMAGE_HEIGHT_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [opt.value, opt.value]),
    );
    const radiusMap = Object.fromEntries(
      RADIUS_EXTENDED_SELECT_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [
        opt.value,
        opt.value,
      ]),
    );
    const shadowMap = Object.fromEntries(
      SHADOW_DEPTH_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [opt.value, opt.value]),
    );
    const aspectNorm = normalizePresetDimensionValue(
      props.aspectRatio,
      undefined,
      ASPECT_RATIO_PRESET_VALUES,
      MEDIA_ASPECT_RATIO_DEFAULTS,
    );

    return (
      <NexusImageRender
        {...props}
        aspectRatioPreset={aspectNorm.preset}
        aspectRatioCustom={aspectNorm.custom}
        width={resolveImageDimension(
          props.width,
          WIDTH_PRESET_VALUES,
          WIDTH_DEFAULTS,
          widthMap,
          "100%",
        )}
        height={resolveImageDimension(
          props.height,
          HEIGHT_PRESET_VALUES,
          HEIGHT_DEFAULTS,
          heightMap,
          "auto",
        )}
        borderRadius={resolveImageDimension(
          props.borderRadius,
          RADIUS_PRESET_VALUES,
          RADIUS_DEFAULTS,
          radiusMap,
          "var(--radius-md)",
        )}
        shadowDepth={resolveImageDimension(
          props.shadowDepth,
          SHADOW_PRESET_VALUES,
          SHADOW_DEFAULTS,
          shadowMap,
          "none",
        )}
      />
    );
  },
};

export default NexusImage;
