/**
 * @fileoverview Carousel edit-mode swipe helpers — horizontal gesture detection and guards.
 *
 * Embla `watchDrag` handles animated swipe on overflow tracks. Static-fit layouts and
 * horizontal flicks that start on nested Puck blocks (without a canvas drag) use pointer
 * fallback navigation. Nested block surfaces stay with Puck drafting — never `disableDrag`
 * on the carousel viewport.
 *
 * Tests: `tests/puck/lib/carouselEditSwipeLogic.test.ts` — `npm run test:carousel-edit-swipe`
 *
 * @module src/components/puck/lib/carouselEditSwipeLogic
 */

/** Minimum horizontal pointer travel before a gesture counts as a swipe. */
export const CAROUSEL_EDIT_SWIPE_THRESHOLD_PX = 32;

/** Horizontal delta must exceed vertical delta times this ratio. */
export const CAROUSEL_EDIT_SWIPE_LOCK_RATIO = 1.25;

/** Resolved swipe direction after pointer release. */
export type CarouselEditSwipeDirection = "prev" | "next";

/**
 * Whether edit mode should delegate horizontal drag to Embla (animated track scroll).
 *
 * @param editLayoutMode - Puck edit layout (non-interactive preview).
 * @param slideCount - Total slides in the carousel.
 * @param editStaticFit - Every slide fits — track transform is CSS-pinned.
 * @returns True when Embla `watchDrag` may handle swipe in edit mode.
 */
export function resolveCarouselEditEmblaDragEnabled(
  editLayoutMode: boolean,
  slideCount: number,
  editStaticFit: boolean,
): boolean {
  return editLayoutMode && slideCount > 1 && !editStaticFit;
}

/**
 * Whether edit mode needs pointer flick fallback (static-fit or Embla-complement).
 *
 * @param editLayoutMode - Puck edit layout (non-interactive preview).
 * @param slideCount - Total slides in the carousel.
 * @returns True when pointer swipe listeners should be attached.
 */
export function resolveCarouselEditPointerSwipeEnabled(
  editLayoutMode: boolean,
  slideCount: number,
): boolean {
  return editLayoutMode && slideCount > 1;
}

/**
 * Whether the pointer target is a nested Puck block inside the carousel shell.
 *
 * @param target - Event target from pointer handlers.
 * @param carouselRoot - Carousel root element (`.nexus-carousel`).
 * @returns True when the target belongs to a child Puck block inside the carousel.
 */
export function isNestedPuckBlockInCarousel(
  target: EventTarget | null,
  carouselRoot: HTMLElement | null,
): boolean {
  if (
    target === null ||
    carouselRoot === null ||
    typeof Element === "undefined" ||
    !(target instanceof Element)
  ) {
    return false;
  }

  const carouselComponent = carouselRoot.closest("[data-puck-component]");
  const nestedComponent = target.closest("[data-puck-component]");

  return Boolean(
    nestedComponent &&
      carouselComponent &&
      nestedComponent !== carouselComponent,
  );
}

/**
 * Resolve horizontal swipe direction from pointer deltas.
 *
 * @param deltaX - Horizontal travel (negative = toward next slide).
 * @param deltaY - Vertical travel.
 * @param thresholdPx - Minimum horizontal distance.
 * @param lockRatio - Horizontal dominance ratio vs vertical travel.
 * @returns Swipe direction or null when the gesture is not a horizontal swipe.
 */
export function resolveCarouselEditSwipeDirection(
  deltaX: number,
  deltaY: number,
  thresholdPx = CAROUSEL_EDIT_SWIPE_THRESHOLD_PX,
  lockRatio = CAROUSEL_EDIT_SWIPE_LOCK_RATIO,
): CarouselEditSwipeDirection | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < thresholdPx) {
    return null;
  }

  if (absX < absY * lockRatio) {
    return null;
  }

  return deltaX < 0 ? "next" : "prev";
}

/**
 * Whether the event target is an interactive control that must not start a carousel swipe.
 *
 * @param target - Event target from pointer or touch handlers.
 * @returns True when swipe should be ignored for this target.
 */
export function shouldRejectCarouselEditSwipeTarget(target: EventTarget | null): boolean {
  if (target === null || typeof Element === "undefined" || !(target instanceof Element)) {
    return true;
  }

  if (
    target.closest(
      "input, textarea, select, button, a, [contenteditable='true'], [contenteditable=''], [role='switch']",
    )
  ) {
    return true;
  }

  if (
    target.closest(
      ".nexus-carousel__arrow, .nexus-carousel__dot, .nexus-carousel__edit-select, .nexus-carousel__autoplay-toggle",
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Whether Embla may capture a horizontal drag in edit mode without blocking Puck drafting.
 *
 * @param target - Event target from Embla `watchDrag`.
 * @param carouselRoot - Carousel root element (`.nexus-carousel`).
 * @param isCanvasDragActive - True while Puck canvas block drag is active.
 * @returns True when Embla should handle the gesture.
 */
export function shouldAllowCarouselEditEmblaDrag(
  target: EventTarget | null,
  carouselRoot: HTMLElement | null,
  isCanvasDragActive: boolean,
): boolean {
  if (isCanvasDragActive) {
    return false;
  }

  if (shouldRejectCarouselEditSwipeTarget(target)) {
    return false;
  }

  if (isNestedPuckBlockInCarousel(target, carouselRoot)) {
    return false;
  }

  return true;
}

/**
 * Whether a pointer flick fallback may navigate (complements Embla on blocked surfaces).
 *
 * @param target - Pointer-down target.
 * @param carouselRoot - Carousel root element.
 * @param isCanvasDragActive - True while Puck canvas block drag is active.
 * @returns True when pointer-up flick navigation is allowed.
 */
export function shouldAllowCarouselEditPointerFlick(
  target: EventTarget | null,
  carouselRoot: HTMLElement | null,
  isCanvasDragActive: boolean,
): boolean {
  if (isCanvasDragActive) {
    return false;
  }

  if (shouldRejectCarouselEditSwipeTarget(target)) {
    return false;
  }

  if (!carouselRoot || !(target instanceof Element)) {
    return false;
  }

  if (!carouselRoot.contains(target)) {
    return false;
  }

  return true;
}
