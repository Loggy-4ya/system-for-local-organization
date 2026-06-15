/**
 * @fileoverview Thin Embla engine adapter for carousel programmatic scroll.
 *
 * @module src/components/puck/lib/carouselEngine
 */

/** Minimal carousel engine API surface used by the nav controller. */
export interface CarouselEngineApi {
  scrollTo: (index: number, jump?: boolean, direction?: -1 | 0 | 1) => void;
  scrollNext: () => void;
  scrollPrev: () => void;
  selectedScrollSnap: () => number;
}

/** Embla options fragment for slides-to-scroll and responsive page steps. */
export interface CarouselEmblaScrollOptions {
  slidesToScroll: number | "auto";
  breakpoints?: Record<string, { slidesToScroll?: number | "auto" }>;
}

/**
 * Embla programmatic scroll duration for interactive / published carousels.
 *
 * Not milliseconds — Embla uses attraction physics (recommended range 20–60).
 */
export const CAROUSEL_INTERACTIVE_SCROLL_DURATION = 32;

/** Disable scroll animation when the user prefers reduced motion. */
export const CAROUSEL_REDUCED_MOTION_BREAKPOINT = {
  "(prefers-reduced-motion: reduce)": { duration: 0 },
} as const;

/**
 * Resolve Embla `slidesToScroll` for the carousel engine.
 *
 * Always `1` so each slide is its own snap — scroll distance matches the sidebar
 * step exactly via programmatic `scrollTo` targets.
 *
 * @returns Embla scroll options with per-slide snapping.
 */
export function resolveCarouselEmblaScrollOptions(): CarouselEmblaScrollOptions {
  return { slidesToScroll: 1 };
}

/**
 * Base Embla options for smooth interactive scrolling (arrows, dots, swipe release).
 *
 * @param interactive - Whether the carousel is in interactive / published mode.
 * @returns Partial Embla options to merge into carousel `opts` / `reInit`.
 */
export function resolveCarouselEmblaMotionOptions(interactive: boolean): {
  duration?: number;
  breakpoints?: Record<string, { duration?: number }>;
} {
  if (!interactive) {
    return {};
  }

  return {
    duration: CAROUSEL_INTERACTIVE_SCROLL_DURATION,
    breakpoints: CAROUSEL_REDUCED_MOTION_BREAKPOINT,
  };
}

/**
 * Scroll the carousel engine to a snap index, preserving loop direction when requested.
 *
 * @param api - Live carousel engine API.
 * @param snapIndex - Target scroll snap index.
 * @param options - Jump instant flag and loop direction.
 */
export function scrollEngineToSnap(
  api: CarouselEngineApi,
  snapIndex: number,
  options?: { jump?: boolean; direction?: -1 | 0 | 1 },
): void {
  const jump = options?.jump ?? false;
  const direction = options?.direction ?? 0;
  api.scrollTo(snapIndex, jump, direction);
}

/**
 * Adapt an Embla carousel API instance to {@link CarouselEngineApi}.
 *
 * @param api - Embla carousel API from `useEmblaCarousel`.
 * @returns Engine adapter or undefined when the API is not ready.
 */
export function createCarouselEngineFromEmbla(
  api: CarouselEngineApi | undefined,
): CarouselEngineApi | undefined {
  return api;
}
