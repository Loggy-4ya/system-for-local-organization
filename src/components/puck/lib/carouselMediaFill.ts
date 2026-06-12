/**
 * @fileoverview Carousel slide fill behavior for media blocks (image, video).
 *
 * @module src/components/puck/lib/carouselMediaFill
 */

/** How a media block sizes itself inside a carousel slide. */
export type CarouselMediaFillMode = "auto" | "fill" | "natural";

/** CSS marker applied when media fills the entire carousel slide card. */
export const CAROUSEL_SLIDE_MEDIA_FILL_CLASS = "nexus-carousel__slide-media-fill";

/** DOM attribute storing media width/height ratio as `"16/9"`. */
export const NEXUS_MEDIA_ASPECT_ATTR = "data-nexus-media-aspect";

/** Default aspect ratio when fill-slide media has no explicit ratio. */
export const CAROUSEL_FILL_SLIDE_DEFAULT_ASPECT = 16 / 9;

/** Sidebar options for image carousel fill behavior. */
export const CAROUSEL_MEDIA_FILL_OPTIONS = [
  { label: "Auto (fill in carousel)", value: "auto" },
  { label: "Fill slide", value: "fill" },
  { label: "Natural size", value: "natural" },
] as const;

/**
 * Resolve whether media should fill its carousel slide card.
 *
 * @param mode - Sidebar preset (`auto` fills only inside carousel slides).
 * @param inCarouselSlide - Whether the block is rendered inside `.nexus-carousel__slide`.
 * @returns True when fill-slide layout should apply.
 */
export function resolveCarouselMediaFill(
  mode: CarouselMediaFillMode | undefined,
  inCarouselSlide: boolean,
): boolean {
  switch (mode ?? "auto") {
    case "fill":
      return true;
    case "natural":
      return false;
    case "auto":
    default:
      return inCarouselSlide;
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
  if (!value) return fallback;
  const [widthPart, heightPart] = value.split("/").map(Number);
  if (widthPart > 0 && heightPart > 0) {
    return widthPart / heightPart;
  }
  return fallback;
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

  let ratio = parseMediaAspectRatio(fillRoot.getAttribute(NEXUS_MEDIA_ASPECT_ATTR));

  const image = fillRoot.querySelector<HTMLImageElement>("img.nexus-image__media");
  if (image?.naturalWidth && image.naturalHeight) {
    ratio = image.naturalWidth / image.naturalHeight;
  }

  return Math.max(floorPx, Math.round(widthPx / ratio));
}
