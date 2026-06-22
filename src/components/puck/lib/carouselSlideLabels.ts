/**
 * @fileoverview Automatic carousel slide labels derived from array index.
 *
 * @module src/components/puck/lib/carouselSlideLabels
 */

/** Minimal slide shape stored on NexusCarousel props. */
export interface CarouselSlideRecord {
  label?: string;
  content?: unknown[];
  [key: string]: unknown;
}

import { formatCarouselSlideLabel } from "./arrayItemLabels";

export { formatCarouselSlideLabel } from "./arrayItemLabels";

/**
 * Assign `Slide N` only when a slide has no label yet (preserves user renames).
 *
 * @param slides - Raw slide array from Puck props.
 * @returns Slides with fallback labels where missing.
 */
export function ensureCarouselSlideLabels<T extends CarouselSlideRecord>(
  slides: T[] | undefined,
): T[] {
  if (!Array.isArray(slides)) return [];

  return slides.map((slide, index) => {
    const trimmed = typeof slide.label === "string" ? slide.label.trim() : "";
    return {
      ...slide,
      label: trimmed || formatCarouselSlideLabel(index),
    };
  });
}
