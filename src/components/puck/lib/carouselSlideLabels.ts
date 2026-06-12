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

/**
 * Format the default sidebar/canvas label for a slide at the given index.
 *
 * @param index - Zero-based slide index.
 * @returns Human-readable label such as "Slide 1".
 */
export function formatCarouselSlideLabel(index: number): string {
  return `Slide ${index + 1}`;
}

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
