/**
 * @fileoverview Pure carousel navigation controller — page plan state machine.
 *
 * Library-agnostic pagination targets; the render hook binds these to Embla.
 *
 * Tests: `tests/puck/lib/carouselNavController.test.ts` — `npm run test:carousel-nav`
 *
 * @module src/components/puck/lib/carouselNavController
 */

import type { CarouselScrollStep, CarouselSlidesPerView } from "../blocks/content/NexusCarouselRender";
import {
  getPagesForCycle,
  resolveNavPositionFromSnap,
  resolveNextPageFromPlan,
  resolvePrevPageFromPlan,
  resolveScrollDirectionForNavAction,
  resolveUsesNativeEmblaNav,
  type CarouselNavScrollAction,
  type CarouselPageCycle,
  type CarouselPagePlan,
} from "./carouselPagination";

/** How interactive arrows/autoplay advance the carousel. */
export type CarouselNavMode = "nativeStep1" | "pagePlan";

/** Active pagination position within a cycle. */
export interface CarouselNavPosition {
  pageIndex: number;
  pageCycle: CarouselPageCycle;
}

/** Programmatic scroll target for page-plan navigation. */
export interface CarouselProgrammaticNavTarget extends CarouselNavPosition {
  leadingSnap: number;
  action: CarouselNavScrollAction;
}

/**
 * Resolve navigation mode from sidebar presets.
 *
 * @param canPaginate - Whether the carousel has more than one page.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param viewportWidth - Measured carousel width in pixels.
 * @returns Native one-slide scroll or page-plan programmatic nav.
 */
export function resolveCarouselNavMode(
  canPaginate: boolean,
  scrollStep: CarouselScrollStep,
  slidesPerView: CarouselSlidesPerView,
  viewportWidth: number,
): CarouselNavMode {
  if (
    canPaginate &&
    resolveUsesNativeEmblaNav(scrollStep, slidesPerView, viewportWidth)
  ) {
    return "nativeStep1";
  }

  return "pagePlan";
}

/**
 * Resolve pagination position for a snap, falling back to stored state.
 *
 * @param snap - Embla selected snap, or null to use stored position.
 * @param stored - Last known pagination position.
 * @param pagePlan - Precomputed page table.
 * @returns Page index and cycle for the snap.
 */
export function resolveCurrentNavPosition(
  snap: number | null,
  stored: CarouselNavPosition,
  pagePlan: CarouselPagePlan,
): CarouselNavPosition {
  if (snap === null) {
    return stored;
  }

  const position = resolveNavPositionFromSnap(snap, pagePlan, stored.pageCycle);
  return { pageIndex: position.pageIndex, pageCycle: position.cycle };
}

/**
 * Compute the next navigation target for page-plan mode.
 *
 * @param position - Current pagination position.
 * @param pagePlan - Precomputed page table.
 * @returns Programmatic scroll target.
 */
export function computeNextNavTarget(
  position: CarouselNavPosition,
  pagePlan: CarouselPagePlan,
): CarouselProgrammaticNavTarget {
  const next = resolveNextPageFromPlan(
    position.pageIndex,
    pagePlan,
    position.pageCycle,
  );

  return {
    pageIndex: next.pageIndex,
    pageCycle: next.cycle,
    leadingSnap: next.leadingSnap,
    action: "next",
  };
}

/**
 * Compute the previous navigation target for page-plan mode.
 *
 * @param position - Current pagination position.
 * @param pagePlan - Precomputed page table.
 * @returns Programmatic scroll target.
 */
export function computePrevNavTarget(
  position: CarouselNavPosition,
  pagePlan: CarouselPagePlan,
): CarouselProgrammaticNavTarget {
  const prev = resolvePrevPageFromPlan(
    position.pageIndex,
    pagePlan,
    position.pageCycle,
  );

  return {
    pageIndex: prev.pageIndex,
    pageCycle: prev.cycle,
    leadingSnap: prev.leadingSnap,
    action: "prev",
  };
}

/**
 * Compute a dot-click navigation target within the active cycle.
 *
 * @param dotIndex - Zero-based dot index in the active cycle.
 * @param pageCycle - Active pagination cycle.
 * @param pagePlan - Precomputed page table.
 * @returns Programmatic scroll target.
 */
export function computeDotNavTarget(
  dotIndex: number,
  pageCycle: CarouselPageCycle,
  pagePlan: CarouselPagePlan,
): CarouselProgrammaticNavTarget {
  const pages = getPagesForCycle(pagePlan, pageCycle);
  const maxPage = Math.max(0, pages.length - 1);
  const clampedPage = Math.min(Math.max(0, dotIndex), maxPage);

  return {
    pageIndex: clampedPage,
    pageCycle,
    leadingSnap: pages[clampedPage]?.leadingSnap ?? 0,
    action: "dot",
  };
}

/**
 * Resolve Embla loop scroll direction for a programmatic nav target.
 *
 * @param currentSnap - Active engine snap index.
 * @param target - Programmatic navigation target.
 * @param slideCount - Total slides in the carousel.
 * @param loop - Whether loop mode is enabled.
 * @returns Embla scroll direction.
 */
export function resolveDirectionForNavTarget(
  currentSnap: number,
  target: CarouselProgrammaticNavTarget,
  slideCount: number,
  loop: boolean,
): -1 | 0 | 1 {
  return resolveScrollDirectionForNavAction(
    currentSnap,
    target.leadingSnap,
    slideCount,
    loop,
    target.action,
  );
}

/**
 * Map an engine snap to pagination state after drag or settle.
 *
 * @param snap - Embla selected snap index.
 * @param pagePlan - Precomputed page table.
 * @param preferCycle - Active cycle used to disambiguate overlapping windows.
 * @returns Updated pagination position.
 */
export function syncNavPositionFromSnap(
  snap: number,
  pagePlan: CarouselPagePlan,
  preferCycle: CarouselPageCycle,
): CarouselNavPosition {
  const position = resolveNavPositionFromSnap(snap, pagePlan, preferCycle);
  return { pageIndex: position.pageIndex, pageCycle: position.cycle };
}
