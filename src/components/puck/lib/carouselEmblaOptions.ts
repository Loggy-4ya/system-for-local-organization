/**
 * @fileoverview Embla carousel options derived from Nexus carousel sidebar presets.
 *
 * @module src/components/puck/lib/carouselEmblaOptions
 */

import type { CarouselScrollStep, CarouselSlidesPerView } from "../blocks/content/NexusCarouselRender";

/** Embla options fragment for slides-to-scroll and responsive page steps. */
export interface CarouselEmblaScrollOptions {
  slidesToScroll: number | "auto";
  breakpoints?: Record<string, { slidesToScroll?: number | "auto" }>;
}

/**
 * Resolve numeric slides-to-scroll for a fixed visible-count preset.
 *
 * @param slidesPerView - Visible slides preset.
 * @returns Slide count used as one "page" when scroll step is `page`.
 */
export function resolveVisibleSlideCount(slidesPerView: CarouselSlidesPerView): number {
  switch (slidesPerView) {
    case "2":
      return 2;
    case "3":
      return 3;
    case "1":
      return 1;
    case "auto":
    default:
      return 1;
  }
}

/**
 * Build Embla `slidesToScroll` (+ breakpoints for `auto` visible + `page` step).
 *
 * @param scrollStep - Sidebar scroll step preset.
 * @param slidesPerView - Sidebar visible slides preset.
 * @returns Partial Embla options for scroll grouping.
 */
export function resolveCarouselEmblaScrollOptions(
  scrollStep: CarouselScrollStep,
  slidesPerView: CarouselSlidesPerView,
): CarouselEmblaScrollOptions {
  if (scrollStep === "page") {
    if (slidesPerView === "auto") {
      return {
        slidesToScroll: 1,
        breakpoints: {
          "(min-width: 768px)": { slidesToScroll: 2 },
          "(min-width: 1024px)": { slidesToScroll: 3 },
        },
      };
    }

    const pageSize = resolveVisibleSlideCount(slidesPerView);
    return { slidesToScroll: pageSize };
  }

  const numeric = Number.parseInt(scrollStep, 10);
  return { slidesToScroll: Number.isFinite(numeric) && numeric > 0 ? numeric : 1 };
}

/** Breakpoints matching {@link resolveVisibleSlideCountAtWidth} for `auto` slides-per-view. */
const AUTO_SLIDES_PER_VIEW_BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Resolve how many slides are visible at a given viewport width.
 *
 * @param slidesPerView - Sidebar visible slides preset.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Visible slide count for the current breakpoint.
 */
export function resolveVisibleSlideCountAtWidth(
  slidesPerView: CarouselSlidesPerView,
  viewportWidth: number,
): number {
  switch (slidesPerView) {
    case "2":
      return 2;
    case "3":
      return 3;
    case "1":
      return 1;
    case "auto":
    default:
      if (viewportWidth >= AUTO_SLIDES_PER_VIEW_BREAKPOINTS.desktop) return 3;
      if (viewportWidth >= AUTO_SLIDES_PER_VIEW_BREAKPOINTS.tablet) return 2;
      return 1;
  }
}

/**
 * Resolve the effective Embla scroll step at a viewport width.
 *
 * @param scrollStep - Sidebar scroll step preset.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Slides advanced per navigation action.
 */
export function resolveScrollStepAtWidth(
  scrollStep: CarouselScrollStep,
  slidesPerView: CarouselSlidesPerView,
  viewportWidth: number,
): number {
  if (scrollStep === "page") {
    return resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  }

  const numeric = Number.parseInt(scrollStep, 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

/**
 * Estimate Embla scroll snap count before the carousel API is ready.
 *
 * Matches `containScroll: "trimSnaps"` + `align: "start"` grouping used in render.
 *
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Sidebar scroll step preset.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Number of pagination dots / snap positions.
 */
export function resolveCarouselScrollSnapCount(
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number {
  if (slideCount <= 0) return 0;
  if (slideCount === 1) return 1;

  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  const step = resolveScrollStepAtWidth(scrollStep, slidesPerView, viewportWidth);

  if (slideCount <= visibleCount) return 1;

  return Math.floor((slideCount - visibleCount) / step) + 1;
}

/**
 * Resolve the first slide index for a pagination page.
 *
 * @param pageIndex - Zero-based page / snap index.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Sidebar scroll step preset.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Zero-based slide index aligned to the page start.
 */
export function resolveFirstSlideIndexForPage(
  pageIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number {
  if (slideCount <= 0) return 0;

  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  const step = resolveScrollStepAtWidth(scrollStep, slidesPerView, viewportWidth);
  const maxStart = Math.max(0, slideCount - visibleCount);
  const slideIndex = pageIndex * step;

  return Math.min(Math.max(0, slideIndex), maxStart);
}

/**
 * Resolve which pagination page contains a given slide index.
 *
 * @param slideIndex - Zero-based slide index.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Sidebar scroll step preset.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Zero-based page index for dot highlighting.
 */
export function resolvePageIndexForSlide(
  slideIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number {
  if (slideCount <= 0) return 0;

  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  if (slideCount <= visibleCount) return 0;

  const step = resolveScrollStepAtWidth(scrollStep, slidesPerView, viewportWidth);
  const snapCount = Math.floor((slideCount - visibleCount) / step) + 1;
  const clamped = Math.min(Math.max(0, slideIndex), slideCount - 1);

  for (let page = snapCount - 1; page >= 0; page -= 1) {
    const start = resolveFirstSlideIndexForPage(
      page,
      slideCount,
      slidesPerView,
      scrollStep,
      viewportWidth,
    );
    if (clamped >= start && clamped < start + visibleCount) {
      return page;
    }
  }

  return Math.min(Math.floor(clamped / step), snapCount - 1);
}

/**
 * Resolve the Embla snap index that keeps a slide visible in edit mode.
 *
 * Uses page snaps for full-page scroll steps; otherwise aligns the viewport
 * so the requested slide sits at the trailing edge of the visible window.
 *
 * @param slideIndex - Zero-based slide index to focus.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Sidebar scroll step preset.
 * @param viewportWidth - Viewport width in pixels.
 * @param singleSlideEditView - Whether edit mode collapses to one slide at a time.
 * @returns Embla snap index for `api.scrollTo`.
 */
export function resolveEditScrollSnapForSlide(
  slideIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
  singleSlideEditView: boolean,
): number {
  if (slideCount <= 0) return 0;

  const clamped = Math.min(Math.max(0, slideIndex), slideCount - 1);

  if (singleSlideEditView) {
    return clamped;
  }

  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  if (slideCount <= visibleCount) {
    return 0;
  }

  return resolvePageIndexForSlide(
    clamped,
    slideCount,
    slidesPerView,
    scrollStep,
    viewportWidth,
  );
}

/**
 * Resolve Embla scroll index for edit mode so multi-slide layouts stay WYSIWYG.
 *
 * Single-slide edit scrolls directly to the active slide. Multi-slide edit keeps
 * as many slides visible as the preset allows and only scrolls when the active
 * slide would fall outside the viewport window. The active slide is aligned to
 * the trailing edge when possible so the previous slide remains adjacent.
 *
 * @param activeSlideIndex - Zero-based active slide index in the strip editor.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param viewportWidth - Viewport width in pixels.
 * @param singleSlideEditView - Whether edit mode collapses to one slide at a time.
 * @returns Embla scroll snap index to pass to `api.scrollTo`.
 */
export function resolveEditScrollTarget(
  activeSlideIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  viewportWidth: number,
  singleSlideEditView: boolean,
): number {
  if (slideCount <= 0) return 0;

  const clampedActive = Math.min(Math.max(0, activeSlideIndex), slideCount - 1);

  if (singleSlideEditView) {
    return clampedActive;
  }

  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  if (slideCount <= visibleCount) {
    return 0;
  }

  const maxStart = slideCount - visibleCount;
  // Keep the active slide at the trailing edge when possible so the previous slide stays adjacent.
  const trailingStart = clampedActive - visibleCount + 1;
  return Math.min(Math.max(0, trailingStart), maxStart);
}
