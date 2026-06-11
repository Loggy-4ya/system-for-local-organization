"use client";

/**
 * @fileoverview Puck block for an image/content carousel with navigation controls.
 *
 * @module src/components/puck/blocks/content/NexusCarousel
 */

import React from "react";
import { MediaUploadField } from "../../fields/MediaUploadField";
import { NexusCarouselRender } from "./NexusCarouselRender";

/** Single carousel slide props. */
interface CarouselSlide {
  image: string;
  title: string;
  caption: string;
  linkUrl: string;
  content?: never[];
}

/** Default empty slide with slot array for Puck inline data model. */
const emptySlide = {
  image: "",
  title: "New Slide",
  caption: "",
  linkUrl: "",
  content: [] as never[],
};

/**
 * Carousel block — cycles through slides with optional autoplay and controls.
 */
export const NexusCarousel = {
  label: "Carousel",
  fields: {
    slides: {
      type: "array" as const,
      label: "Slides",
      getItemSummary: (item: CarouselSlide) => item.title || item.caption || "Slide",
      arrayFields: {
        image: {
          type: "custom" as const,
          label: "Image",
          render: MediaUploadField as never,
        },
        title: { type: "text" as const, label: "Title (optional)" },
        caption: { type: "textarea" as const, label: "Caption (optional)" },
        linkUrl: { type: "text" as const, label: "Link URL (optional)" },
        content: {
          type: "slot" as const,
          label: "Slide Content",
        },
      },
      defaultItemProps: emptySlide,
    },
    height: {
      type: "select" as const,
      label: "Slide Height",
      options: [
        { label: "Small (240px)", value: "240px" },
        { label: "Medium (360px)", value: "360px" },
        { label: "Large (480px)", value: "480px" },
        { label: "Auto", value: "auto" },
      ],
    },
    borderRadius: {
      type: "select" as const,
      label: "Corner Radius",
      options: [
        { label: "None", value: "0" },
        { label: "Small", value: "var(--radius-sm)" },
        { label: "Medium", value: "var(--radius-md)" },
        { label: "Large", value: "var(--radius-lg)" },
      ],
    },
    autoplay: {
      type: "radio" as const,
      label: "Autoplay",
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    },
    intervalSeconds: {
      type: "number" as const,
      label: "Autoplay Interval (seconds)",
      min: 2,
      max: 30,
    },
    showArrows: {
      type: "radio" as const,
      label: "Navigation Arrows",
      options: [
        { label: "Show", value: "yes" },
        { label: "Hide", value: "no" },
      ],
    },
    showDots: {
      type: "radio" as const,
      label: "Pagination Dots",
      options: [
        { label: "Show", value: "yes" },
        { label: "Hide", value: "no" },
      ],
    },
  },
  defaultProps: {
    slides: [
      {
        image: "",
        title: "First slide",
        caption: "Add an image and optional caption for this slide.",
        linkUrl: "",
        content: [],
      },
      {
        image: "",
        title: "Second slide",
        caption: "Carousel supports multiple slides with titles and links.",
        linkUrl: "",
        content: [],
      },
    ],
    height: "360px" as const,
    borderRadius: "var(--radius-md)" as const,
    autoplay: "off" as const,
    intervalSeconds: 5,
    showArrows: "yes" as const,
    showDots: "yes" as const,
  },
  render: NexusCarouselRender,
};

export default NexusCarousel;
