"use client";

/**
 * @fileoverview Puck block for Video players.
 *
 * Supports YouTube, Vimeo, and direct video file URLs with
 * aspect ratio, size, alignment, controls, and autoplay settings.
 *
 * @module src/components/puck/blocks/content/NexusVideo
 */

import { createPresetAspectRatioPuckField } from "../../lib/createPresetAspectRatioPuckField";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { VIDEO_MAX_WIDTH_OPTIONS, VIDEO_WIDTH_OPTIONS } from "../../lib/fieldOptionLabels";
import {
  MEDIA_ASPECT_RATIO_DEFAULTS,
  MEDIA_ASPECT_RATIO_OPTIONS,
} from "../../lib/mediaAspectRatio";
import { NexusVideoRender } from "./NexusVideoRender";
import {
  normalizePresetDimensionValue,
  presetValuesFromOptions,
} from "../../lib/resolvePresetDimension";

const MAX_WIDTH_PRESET_VALUES = presetValuesFromOptions([...VIDEO_MAX_WIDTH_OPTIONS]);
const ASPECT_RATIO_PRESET_VALUES = presetValuesFromOptions([...MEDIA_ASPECT_RATIO_OPTIONS]);

export const NexusVideo = {
  label: "Video Player",
  fields: {
    url: {
      type: "text" as const,
      label: "Video URL (YouTube, Vimeo, or direct MP4 link)",
    },
    aspectRatio: createPresetAspectRatioPuckField("Aspect Ratio"),
    width: createPresetDimensionPuckField({
      label: "Width",
      options: [...VIDEO_WIDTH_OPTIONS],
      defaultPreset: "100%",
      defaultCustom: "100%",
      legacyMap: { contained: "lg", narrow: "sm" },
      units: ["px", "rem", "em", "%"],
    }),
    maxWidth: createPresetDimensionPuckField({
      label: "Max Width",
      options: [...VIDEO_MAX_WIDTH_OPTIONS],
      defaultPreset: "none",
      defaultCustom: "1200px",
      legacyMap: { contained: "lg", narrow: "sm" },
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
    autoplay: {
      type: "radio" as const,
      label: "Autoplay",
      options: [
        { label: "No", value: "no" },
        { label: "Yes (Muted)", value: "yes" },
      ],
    },
    controls: {
      type: "radio" as const,
      label: "Show Controls",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
  },
  defaultProps: {
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    aspectRatio: MEDIA_ASPECT_RATIO_DEFAULTS,
    width: { preset: "100%", custom: "100%" },
    maxWidth: { preset: "none", custom: "1200px" },
    align: "center" as const,
    autoplay: "no" as const,
    controls: "yes" as const,
  },
  render: (props: Record<string, unknown>) => {
    const widthNorm = normalizePresetDimensionValue(
      props.width,
      undefined,
      presetValuesFromOptions([...VIDEO_WIDTH_OPTIONS]),
      { preset: "100%", custom: "100%" },
      { contained: "lg", narrow: "sm" },
    );
    const maxWidthNorm = normalizePresetDimensionValue(
      props.maxWidth,
      undefined,
      MAX_WIDTH_PRESET_VALUES,
      { preset: "none", custom: "1200px" },
      { contained: "lg", narrow: "sm" },
    );

    const aspectNorm = normalizePresetDimensionValue(
      props.aspectRatio,
      undefined,
      ASPECT_RATIO_PRESET_VALUES,
      MEDIA_ASPECT_RATIO_DEFAULTS,
    );

    return (
      <NexusVideoRender
        id={props.id as string | undefined}
        url={props.url as string}
        aspectRatioPreset={aspectNorm.preset}
        aspectRatioCustom={aspectNorm.custom}
        width={widthNorm.preset}
        customWidth={widthNorm.custom}
        maxWidth={
          maxWidthNorm.preset === "none"
            ? "none"
            : maxWidthNorm.preset === "custom"
              ? "custom"
              : (maxWidthNorm.preset as never)
        }
        maxWidthCustom={maxWidthNorm.custom}
        align={props.align as "left" | "center" | "right"}
        autoplay={props.autoplay as "no" | "yes"}
        controls={props.controls as "yes" | "no"}
        carouselFill="auto"
        mediaFit="cover"
        puck={props.puck as { isEditing?: boolean } | undefined}
      />
    );
  },
};

export default NexusVideo;
