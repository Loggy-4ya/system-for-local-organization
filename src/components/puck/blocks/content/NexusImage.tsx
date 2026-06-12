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
import { CAROUSEL_MEDIA_FILL_OPTIONS, SHADOW_DEPTH_OPTIONS } from "../../lib/fieldOptionLabels";
import { NexusImageRender } from "./NexusImageRender";

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
    width: {
      type: "text" as const,
      label: "Width (e.g. 100%, 400px)",
    },
    height: {
      type: "text" as const,
      label: "Height (e.g. auto, 250px)",
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
    borderRadius: {
      type: "select" as const,
      label: "Border Radius",
      options: [
        { label: "None", value: "0px" },
        { label: "Small (4px)", value: "var(--radius-sm)" },
        { label: "Medium (8px)", value: "var(--radius-md)" },
        { label: "Large (12px)", value: "var(--radius-lg)" },
        { label: "Full (Circle)", value: "50%" },
      ],
    },
    shadowDepth: {
      type: "select" as const,
      label: "Shadow Depth",
      options: [...SHADOW_DEPTH_OPTIONS],
    },
  },
  defaultProps: {
    image: "",
    alt: "Nexus Image",
    carouselFill: "auto" as const,
    width: "100%",
    height: "auto",
    align: "center" as const,
    borderRadius: "var(--radius-md)" as const,
    shadowDepth: "none" as const,
  },
  render: (props: {
    id?: string;
    image: string;
    alt: string;
    carouselFill?: "auto" | "fill" | "natural";
    width: string;
    height: string;
    align: "left" | "center" | "right";
    borderRadius: string;
    shadowDepth: string;
    puck?: { isEditing?: boolean };
  }) => <NexusImageRender {...props} />,
};

export default NexusImage;
