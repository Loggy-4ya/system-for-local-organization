import type { Data } from "@puckeditor/core";
import type {
  OutlineIndexes,
  OutlineNodeIndexEntry,
} from "./outlineTreeModel";
import { findComponentById } from "./puckDataTree";

/**
 * @fileoverview Carousel slide fill behavior for media blocks (image, video).
 *
 * Layout contract (CSS in `globals.css`):
 * - Default: in-flow — React sets inline `aspect-ratio` on the media frame.
 * - Stretch: absolute cover only when `.nexus-carousel--fixed-height` is on the carousel root.
 *
 * Tests: `tests/puck/lib/carouselMediaFill.test.ts` — `npm run test:carousel-media-fill`
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

/**
 * Minimum equal row height for carousel slides in Puck edit mode — matches
 * {@link CAROUSEL_AUTO_MIN_HEIGHT_PX} so empty slides stay droppable without oversized cards.
 */
export const CAROUSEL_EDIT_ROW_MIN_HEIGHT_PX = 240;

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
 * Count Puck blocks placed directly in a carousel slide drop zone (not nested shells).
 *
 * @param slide - Carousel slide root element.
 * @returns Number of top-level `[data-puck-component]` nodes in the slide slot.
 */
export function countCarouselSlideDirectBlocks(slide: ParentNode): number {
  const dropzone = slide.querySelector<HTMLElement>("[data-puck-dropzone]");
  if (!dropzone) return 0;

  return dropzone.querySelectorAll(":scope > [data-puck-component]").length;
}

/**
 * Whether media sits inside a composite carousel slide (grid or multi-block stack).
 *
 * Only counts grid hosts that are **descendants of the same slide**, not grid cells
 * that wrap the carousel block itself (carousel-in-grid-item must still fill-slide).
 * Slides with **two or more** direct blocks (e.g. Input + Video) are composite too —
 * fill-slide media must not expand to the full slide card in that case.
 *
 * @param root - Media block root element.
 * @returns True when the slide uses structured layout rather than a single fill asset.
 */
export function isCompositeCarouselSlideContent(root: HTMLElement | null | undefined): boolean {
  if (!root) return false;

  const slide = root.closest(".nexus-carousel__slide");
  if (!slide) return false;

  if (slide.querySelector(CAROUSEL_COMPOSITE_LAYOUT_SELECTORS)) {
    return true;
  }

  return countCarouselSlideDirectBlocks(slide) > 1;
}

/**
 * Whether a carousel slide slot holds composite content (multi-block or nested grid).
 *
 * @param content - Puck slot `content` array from slide props.
 * @returns True when auto fill-slide must not apply.
 */
export function resolveCompositeSlideFromSlotContent(content: unknown): boolean {
  if (!Array.isArray(content) || content.length === 0) {
    return false;
  }

  if (content.length > 1) {
    return true;
  }

  return content.some(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      "type" in entry &&
      typeof (entry as { type?: unknown }).type === "string" &&
      (entry as { type: string }).type === "NexusGrid",
  );
}

/**
 * Whether a Puck zone index entry hosts composite carousel slide content.
 *
 * @param contentIds - Ordered child ids in the slide slot zone.
 * @param nodes - Puck node index for type lookup.
 * @returns True when auto fill-slide must not apply.
 */
function resolveCompositeSlideFromZoneIndex(
  contentIds: string[] | undefined,
  nodes: Record<string, OutlineNodeIndexEntry> | undefined,
): boolean {
  if (!contentIds || contentIds.length === 0) {
    return false;
  }

  if (contentIds.length > 1) {
    return true;
  }

  const node = nodes?.[contentIds[0] ?? ""];
  return node?.data.type === "NexusGrid";
}

/**
 * Resolve per-slide composite flags from Puck document state (editor-safe).
 *
 * Prefers Puck private zone indexes (`contentIds`) because slot fields in
 * `render()` are React components, not raw content arrays. Falls back to inline
 * `props.slides[i].content` when indexes are unavailable.
 *
 * @param data - Puck document state.
 * @param carouselId - Carousel block id (`props.id`).
 * @param slideCount - Number of slides on the carousel.
 * @param indexes - Optional Puck private indexes from the editor store.
 * @returns Boolean flag per slide index.
 */
export function resolveCarouselSlideCompositeFlags(
  data: Data,
  carouselId: string | undefined,
  slideCount: number,
  indexes?: OutlineIndexes | null,
): boolean[] {
  if (slideCount <= 0) {
    return [];
  }

  const rawSlides = carouselId
    ? (findComponentById(data, carouselId)?.node.props.slides as
        | Array<{ content?: unknown }>
        | undefined)
    : undefined;

  return Array.from({ length: slideCount }, (_, index) => {
    const zoneCompound = carouselId ? `${carouselId}:slides[${index}].content` : "";
    const fromZone = resolveCompositeSlideFromZoneIndex(
      zoneCompound ? indexes?.zones?.[zoneCompound]?.contentIds : undefined,
      indexes?.nodes,
    );
    if (fromZone) {
      return true;
    }

    return resolveCompositeSlideFromSlotContent(rawSlides?.[index]?.content);
  });
}

/**
 * Serialize composite slide flags for stable Puck store selectors (primitives only).
 *
 * @param flags - Per-slide composite layout flags.
 * @returns Comma-separated `"1"` / `"0"` string safe for `useSyncExternalStore` snapshots.
 */
export function serializeCarouselSlideCompositeFlagsKey(flags: boolean[]): string {
  return flags.map((flag) => (flag ? "1" : "0")).join(",");
}

/**
 * Parse {@link serializeCarouselSlideCompositeFlagsKey} back into a boolean array.
 *
 * @param key - Serialized composite flags key.
 * @param slideCount - Expected slide count (pads missing entries with `false`).
 * @returns Per-slide composite layout flags.
 */
export function parseCarouselSlideCompositeFlagsKey(key: string, slideCount: number): boolean[] {
  if (slideCount <= 0) {
    return [];
  }

  if (!key) {
    return Array.from({ length: slideCount }, () => false);
  }

  const parts = key.split(",");
  return Array.from({ length: slideCount }, (_, index) => parts[index] === "1");
}

/**
 * Resolve whether media should fill its carousel slide card.
 *
 * @param mode - Sidebar preset (`auto` fills only inside carousel slides).
 * @param inCarouselSlide - Whether the block is rendered inside `.nexus-carousel__slide`.
 * @param root - Optional media root for composite-layout detection (DOM fallback).
 * @param compositeSlide - When true, slide is composite from Puck props (first-paint safe).
 * @returns True when fill-slide layout should apply.
 */
export function resolveCarouselMediaFill(
  mode: CarouselMediaFillMode | undefined,
  inCarouselSlide: boolean,
  root?: HTMLElement | null,
  compositeSlide = false,
): boolean {
  switch (mode ?? "auto") {
    case "fill":
      return true;
    case "natural":
      return false;
    case "auto":
    default:
      if (!inCarouselSlide) return false;
      if (compositeSlide) return false;
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
 * Minimum slide row height in edit mode — enough for a fill-slide video/image at the slide width.
 *
 * @param slideWidthPx - Rendered slide card width.
 * @param autoMinHeightPx - Carousel auto-height floor from sidebar (`CAROUSEL_AUTO_MIN_HEIGHT_PX`).
 * @returns Pixel floor used when measuring edit row height.
 */
export function resolveCarouselEditSlideFloorPx(
  slideWidthPx: number,
  autoMinHeightPx: number,
): number {
  const fillMediaHeightPx =
    slideWidthPx > 0
      ? Math.round(slideWidthPx / CAROUSEL_FILL_SLIDE_DEFAULT_ASPECT)
      : 0;
  return Math.max(
    autoMinHeightPx,
    CAROUSEL_EDIT_ROW_MIN_HEIGHT_PX,
    fillMediaHeightPx,
  );
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
