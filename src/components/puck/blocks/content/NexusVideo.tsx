"use client";

/**
 * @fileoverview Puck block for Video players.
 *
 * Supports YouTube, Vimeo, and direct video file URLs with
 * aspect ratio, size, alignment, controls, and autoplay settings.
 *
 * @module src/components/puck/blocks/content/NexusVideo
 */

import { CONTENT_WIDTH_OPTIONS } from "../../lib/contentWidthTokens";
import { NexusVideoRender } from "./NexusVideoRender";

export const NexusVideo = {
  label: "Video Player",
  fields: {
    url: {
      type: "text" as const,
      label: "Video URL (YouTube, Vimeo, or direct MP4 link)",
    },
    aspectRatio: {
      type: "select" as const,
      label: "Aspect Ratio",
      options: [
        { label: "16:9 (Widescreen)", value: "16-9" },
        { label: "4:3 (Standard)", value: "4-3" },
        { label: "1:1 (Square)", value: "1-1" },
      ],
    },
    width: {
      type: "select" as const,
      label: "Width",
      options: [
        { label: "Full (100%)", value: "100%" },
        ...CONTENT_WIDTH_OPTIONS.map((opt) => ({
          label: opt.label,
          value: opt.value,
        })),
        { label: "Custom (px)", value: "custom" },
      ],
    },
    customWidth: {
      type: "text" as const,
      label: "Custom Width (e.g. 720px)",
    },
    maxWidth: {
      type: "select" as const,
      label: "Max Width",
      options: [
        { label: "None", value: "none" },
        ...CONTENT_WIDTH_OPTIONS.map((opt) => ({
          label: opt.label,
          value: opt.value,
        })),
      ],
    },
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
    aspectRatio: "16-9" as const,
    width: "100%" as const,
    customWidth: "",
    maxWidth: "none" as const,
    align: "center" as const,
    autoplay: "no" as const,
    controls: "yes" as const,
  },
  render: NexusVideoRender,
};

export default NexusVideo;
