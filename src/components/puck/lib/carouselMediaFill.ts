/**
 * @fileoverview Carousel slide fill behavior for media blocks (image, video).
 *
 * Layout contract (CSS in `globals.css`):
 * - Default: in-flow — React sets inline `aspect-ratio` on the media frame.
 * - Stretch: absolute cover only when `.nexus-carousel--fixed-height` is on the carousel root.
 *
 * @module src/components/puck/lib/carouselMediaFill
 */

import {
  MEDIA_ASPECT_RATIO_FALLBACK,
  parseMediaAspectRatioAttr,
} from "./mediaAspectRatio";

/** How a media block sizes itself inside a carousel slide. */
export type CarouselMediaFillMode = "auto" | "fill" | "natural";

/** CSS marker applied when media fills the entire carousel slide card. */
export const CAROUSEL_SLIDE_MEDIA_FILL_CLASS = "nexus-carousel__slide-media-fill";

/** DOM attribute — carousel fill media (available on first paint via React context). */
export const NEXUS_CAROUSEL_FILL_ATTR = "data-nexus-carousel-fill";

/** DOM attribute storing media width/height ratio as `"16/9"`. */
export const NEXUS_MEDIA_ASPECT_ATTR = "data-nexus-media-aspect";

/** Default aspect ratio when fill-slide media has no explicit ratio. */
export const CAROUSEL_FILL_SLIDE_DEFAULT_ASPECT = MEDIA_ASPECT_RATIO_FALLBACK;

/** Sidebar options for image carousel fill behavior. */
export const CAROUSEL_MEDIA_FILL_OPTIONS = [
  { label: "Auto (fill in carousel)", value: "auto" },
  { label: "Fill slide", value: "fill" },
  { label: "Natural size", value: "natural" },
] as const;

/** Nested layout hosts where `auto` fill must not cover the whole slide. */
export const CAROUSEL_COMPOSITE_LAYOUT_SELECTORS = [
  ".nexus-grid-item",
  ".nexus-grid",
].join(", ");

/**
 * Whether media sits inside a composite carousel slide (grid, multi-block layout).
 *
 * @param root - Media block root element.
 * @returns True when the slide uses structured layout rather than a single fill asset.
 */
export function isCompositeCarouselSlideContent(root: HTMLElement | null | undefined): boolean {
  if (!root) return false;
  return Boolean(root.closest(CAROUSEL_COMPOSITE_LAYOUT_SELECTORS));
}

/**
 * Resolve whether media should fill its carousel slide card.
 *
 * @param mode - Sidebar preset (`auto` fills only inside carousel slides).
 * @param inCarouselSlide - Whether the block is rendered inside `.nexus-carousel__slide`.
 * @param root - Optional media root for composite-layout detection.
 * @returns True when fill-slide layout should apply.
 */
export function resolveCarouselMediaFill(
  mode: CarouselMediaFillMode | undefined,
  inCarouselSlide: boolean,
  root?: HTMLElement | null,
): boolean {
  switch (mode ?? "auto") {
    case "fill":
      return true;
    case "natural":
      return false;
    case "auto":
    default:
      if (!inCarouselSlide) return false;
      if (isCompositeCarouselSlideContent(root)) return false;
      return true;
  }
}

/**
 * Parse a `"W/H"` aspect attribute into a numeric ratio.
 *
 * @param value - Attribute value such as `"16/9"`.
 * @param fallback - Ratio when parsing fails.
 * @returns Width divided by height.
 */
export function parseMediaAspectRatio(
  value: string | null | undefined,
  fallback = CAROUSEL_FILL_SLIDE_DEFAULT_ASPECT,
): number {
  return parseMediaAspectRatioAttr(value, fallback);
}

/**
 * Estimate natural height for a fill-slide media block from its width and aspect ratio.
 *
 * Absolute fill media reports `offsetHeight` as zero — width × ratio avoids the edit-height loop.
 *
 * @param fillRoot - Element marked with {@link CAROUSEL_SLIDE_MEDIA_FILL_CLASS}.
 * @param widthPx - Slide or fallback width used for the ratio calculation.
 * @param floorPx - Minimum height when width is unmeasurable.
 * @returns Pixel height contributed by this fill block.
 */
export function measureFillSlideComponentHeight(
  fillRoot: HTMLElement,
  widthPx: number,
  floorPx: number,
): number {
  if (widthPx <= 0) return floorPx;

  let ratio = parseMediaAspectRatio(
    fillRoot.getAttribute(NEXUS_MEDIA_ASPECT_ATTR) ??
      fillRoot.querySelector<HTMLElement>("[data-nexus-media-aspect]")?.getAttribute("data-nexus-media-aspect"),
  );

  const image = fillRoot.querySelector<HTMLImageElement>(
    "img.nexus-media-cover__media, img.nexus-image__media, img.nexus-video__media",
  );
  if (image?.naturalWidth && image.naturalHeight) {
    ratio = image.naturalWidth / image.naturalHeight;
  }

  return Math.max(floorPx, Math.round(widthPx / ratio));
}

/**
 * Inline style binding carousel fill media aspect ratio to CSS `aspect-ratio`.
 *
 * @param ratio - Width divided by height (e.g. `16 / 9`).
 * @returns React style object with `--nexus-media-aspect-ratio`.
 */
export function carouselFillAspectRatioStyle(ratio: number): { ["--nexus-media-aspect-ratio"]: number } {
  return { "--nexus-media-aspect-ratio": ratio };
}
