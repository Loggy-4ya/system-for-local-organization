/**
 * @fileoverview Carousel pagination math — page plans, cycles, and nav targets.
 *
 * Tests: `tests/puck/lib/carouselPagination.test.ts` — `npm run test:carousel-pagination`
 *
 * @module src/components/puck/lib/carouselPagination
 */

import type { CarouselScrollStep, CarouselSlidesPerView } from "../blocks/content/NexusCarouselRender";

/** Scroll step forced in Puck edit layout — sidebar step applies to interactive/published only. */
export const CAROUSEL_EDIT_SCROLL_STEP: CarouselScrollStep = "1";

/** Pagination alignment cycle when step grouping leaves trailing slides uncovered. */
export type CarouselPageCycle = "standard" | "remainder";

/**
 * Resolve the scroll step used for pagination and arrow navigation.
 *
 * @param editLayoutMode - Whether strip-style edit layout is active.
 * @param scrollStep - Sidebar scroll step preset (interactive / published).
 * @returns Effective scroll step for the current layout mode.
 */
export function resolveCarouselNavScrollStep(
  editLayoutMode: boolean,
  scrollStep: CarouselScrollStep,
): CarouselScrollStep {
  return editLayoutMode ? CAROUSEL_EDIT_SCROLL_STEP : scrollStep;
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

/** Breakpoints matching {@link resolveVisibleSlideCountAtWidth} for `auto` slides-per-view. */
export const AUTO_SLIDES_PER_VIEW_BREAKPOINTS = {
  tablet: 640,
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
 * Whether arrow/autoplay navigation should use native Embla `scrollNext`/`scrollPrev`.
 *
 * Step 1 advances one slide snap at a time — the page plan wraps from the last
 * pagination page directly to snap 0 and skips intermediate snaps (e.g. snap 6
 * when spv 2). Native Embla scroll preserves smooth one-slide motion and loop clones.
 *
 * @param scrollStep - Sidebar scroll step preset.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param viewportWidth - Viewport width in pixels.
 * @returns True when programmatic page navigation should not drive arrows/autoplay.
 */
export function resolveUsesNativeEmblaNav(
  scrollStep: CarouselScrollStep,
  slidesPerView: CarouselSlidesPerView,
  viewportWidth: number,
): boolean {
  return resolveScrollStepAtWidth(scrollStep, slidesPerView, viewportWidth) === 1;
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
  return resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth)
    .pageCount;
}

/**
 * Leading slide indices for the standard (0-based grid) pagination cycle.
 *
 * Example: 7 slides, spv 2, step 2 → `[0, 2, 4]` (slides 1–2, 3–4, 5–6).
 *
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Ordered leading slide indices for each page.
 */
export function resolveStandardPageLeadingStarts(
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number[] {
  if (slideCount <= 0) return [0];

  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  const step = resolveScrollStepAtWidth(scrollStep, slidesPerView, viewportWidth);

  if (slideCount <= visibleCount) return [0];

  const maxStart = slideCount - visibleCount;
  const starts: number[] = [];
  for (let start = 0; start <= maxStart; start += step) {
    starts.push(start);
  }
  return starts;
}

/** One pagination page — precomputed visible slide indices and Embla leading snap. */
export interface CarouselPage {
  /** First slide index for programmatic `scrollTo`. */
  leadingSnap: number;
  /** Slide indices visible on this page (length ≤ visibleCount). */
  visibleIndices: number[];
}

/** Precomputed pagination table for arrows, dots, and autoplay. */
export interface CarouselPagePlan {
  /** Total slides used to build the plan. */
  slideCount: number;
  /** Standard grid pages from slide 0 (edit mode uses these). */
  standardPages: CarouselPage[];
  /** Remainder cycle when the standard grid misses the final slide; null otherwise. */
  remainderPages: CarouselPage[] | null;
  /** Whether navigation alternates standard ↔ remainder on wrap. */
  hasDualCycle: boolean;
  /** Alias for {@link CarouselPagePlan.standardPages}. */
  pages: CarouselPage[];
  /** Standard-cycle page count (edit mode dots). */
  pageCount: number;
  visibleCount: number;
  /** Max pages across cycles — keeps loop on when either cycle paginates. */
  interactivePageCount: number;
  /** True when more than one page exists (autoplay and loop apply). */
  canPaginate: boolean;
}

/**
 * Whether the standard step grid needs a remainder cycle after the last standard page.
 *
 * True when either:
 * 1. The last standard window does not include the final slide (e.g. 7 / spv 2 / step 2), or
 * 2. The final slide is visible but not a standard leading snap (e.g. 7 / spv 3 / step 2 —
 *    pages `1–2–3, 3–4–5, 5–6–7` show slide 7 only as trailing, so remainder `7–1–2, …` is needed).
 *
 * @param slideCount - Total slides in the carousel.
 * @param visibleCount - Slides visible at once.
 * @param step - Scroll step width.
 * @returns True when a remainder cycle should alternate with the standard grid.
 */
export function resolveCarouselHasDualCycle(
  slideCount: number,
  visibleCount: number,
  step: number,
): boolean {
  if (slideCount <= visibleCount || step <= 1) return false;

  const maxStart = slideCount - visibleCount;
  const starts: number[] = [];
  for (let start = 0; start <= maxStart; start += step) {
    starts.push(start);
  }

  const lastStart = starts[starts.length - 1] ?? 0;
  const lastWindowEnd = lastStart + visibleCount - 1;
  const lastSlide = slideCount - 1;

  if (lastWindowEnd < lastSlide) {
    return true;
  }

  return !starts.includes(lastSlide);
}

/**
 * Leading slide indices for the standard (0-based grid) pagination cycle.
 *
 * @param slideCount - Total slides in the carousel.
 * @param visibleCount - Slides visible at once.
 * @param step - Scroll step width.
 * @returns Ordered leading slide indices without a tail page.
 */
function resolveStandardGridLeadingStarts(
  slideCount: number,
  visibleCount: number,
  step: number,
): number[] {
  if (slideCount <= 0) return [0];
  if (slideCount <= visibleCount) return [0];

  const maxStart = slideCount - visibleCount;
  const starts: number[] = [];
  for (let start = 0; start <= maxStart; start += step) {
    starts.push(start);
  }

  return starts;
}

/**
 * Leading slide indices for the remainder pagination cycle.
 *
 * First page leads with the last slide; subsequent pages use a grid offset by
 * `maxStart % step` (or `1` when that is zero — e.g. 7 / spv 3 / step 2 → `[6, 1, 3, 5]`).
 *
 * @param slideCount - Total slides in the carousel.
 * @param visibleCount - Slides visible at once.
 * @param step - Scroll step width.
 * @returns Ordered leading slide indices for the remainder cycle.
 */
function resolveRemainderGridLeadingStarts(
  slideCount: number,
  visibleCount: number,
  step: number,
): number[] {
  const maxStart = Math.max(0, slideCount - visibleCount);
  // When maxStart aligns with the step grid (offset 0), shift by 1 so the remainder
  // cycle continues from the loop lead (e.g. 7–1–2) into 2–3–4 — not back to 1–2–3.
  const offset = maxStart % step || 1;
  const starts: number[] = [slideCount - 1];

  for (let start = offset; start <= maxStart; start += step) {
    if (!starts.includes(start)) {
      starts.push(start);
    }
  }

  // Trailing remainder pages can start past maxStart when the window wraps (e.g. 6–7–1).
  const lastStart = starts[starts.length - 1] ?? slideCount - 1;
  const nextStart = lastStart + step;
  if (
    nextStart > maxStart &&
    nextStart < slideCount - 1 &&
    !starts.includes(nextStart)
  ) {
    starts.push(nextStart);
  }

  return starts;
}

/**
 * Resolve pages for a pagination cycle from precomputed leading snaps.
 *
 * @param starts - Leading slide indices per page.
 * @param slideCount - Total slides in the carousel.
 * @param visibleCount - Slides visible at once.
 * @param loopRemainderLead - Wrap the first remainder page across the loop seam.
 * @returns Ordered pages with visible windows and leading snaps.
 */
function buildPagesFromLeadingStarts(
  starts: number[],
  slideCount: number,
  visibleCount: number,
  loopRemainderLead: boolean,
): CarouselPage[] {
  return starts.map((leadingSnap) => ({
    leadingSnap,
    visibleIndices: resolveVisibleWindowSlideIndices(
      leadingSnap,
      slideCount,
      visibleCount,
      loopRemainderLead &&
        (leadingSnap === slideCount - 1 ||
          leadingSnap + visibleCount > slideCount),
    ),
  }));
}

/**
 * Resolve the page table for a specific pagination cycle.
 *
 * @param plan - Precomputed page plan.
 * @param cycle - Standard or remainder alignment cycle.
 * @returns Pages for the requested cycle.
 */
export function getPagesForCycle(
  plan: CarouselPagePlan,
  cycle: CarouselPageCycle,
): CarouselPage[] {
  if (cycle === "remainder" && plan.remainderPages) {
    return plan.remainderPages;
  }

  return plan.standardPages;
}

/**
 * Resolve pagination page count for a specific cycle.
 *
 * @param plan - Precomputed page plan.
 * @param cycle - Standard or remainder alignment cycle.
 * @returns Number of dots / pages in the active cycle.
 */
export function getPageCountForCycle(
  plan: CarouselPagePlan,
  cycle: CarouselPageCycle,
): number {
  return getPagesForCycle(plan, cycle).length;
}

/**
 * Precompute pagination pages — visible slide windows and leading snaps for navigation.
 *
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Page table used by render, dots, arrows, and autoplay.
 */
export function resolveCarouselPagePlan(
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): CarouselPagePlan {
  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  const step = resolveScrollStepAtWidth(scrollStep, slidesPerView, viewportWidth);

  if (slideCount <= 0) {
    const emptyPage = { leadingSnap: 0, visibleIndices: [0] };
    return {
      slideCount: 0,
      standardPages: [emptyPage],
      remainderPages: null,
      hasDualCycle: false,
      pages: [emptyPage],
      pageCount: 1,
      visibleCount,
      interactivePageCount: 1,
      canPaginate: false,
    };
  }

  if (slideCount <= visibleCount) {
    const visibleIndices = Array.from({ length: slideCount }, (_, index) => index);
    const singlePage = { leadingSnap: 0, visibleIndices };
    return {
      slideCount,
      standardPages: [singlePage],
      remainderPages: null,
      hasDualCycle: false,
      pages: [singlePage],
      pageCount: 1,
      visibleCount,
      interactivePageCount: 1,
      canPaginate: false,
    };
  }

  const hasDualCycle = resolveCarouselHasDualCycle(slideCount, visibleCount, step);
  const standardStarts = resolveStandardGridLeadingStarts(slideCount, visibleCount, step);
  const standardPages = buildPagesFromLeadingStarts(
    standardStarts,
    slideCount,
    visibleCount,
    false,
  );

  const remainderPages = hasDualCycle
    ? buildPagesFromLeadingStarts(
        resolveRemainderGridLeadingStarts(slideCount, visibleCount, step),
        slideCount,
        visibleCount,
        true,
      )
    : null;

  const interactivePageCount = Math.max(
    standardPages.length,
    remainderPages?.length ?? 0,
  );
  const canPaginate = hasDualCycle
    ? standardPages.length > 1 || (remainderPages?.length ?? 0) > 1
    : standardPages.length > 1;

  return {
    slideCount,
    standardPages,
    remainderPages,
    hasDualCycle,
    pages: standardPages,
    pageCount: standardPages.length,
    visibleCount,
    interactivePageCount,
    canPaginate,
  };
}

/**
 * Resolve pagination page index and cycle for a snap using a precomputed page plan.
 *
 * Prefers exact leading snaps; otherwise finds the page window containing the snap.
 * When both cycles contain the snap, `preferCycle` breaks ties.
 *
 * @param snapIndex - Embla `selectedScrollSnap()` value.
 * @param plan - Precomputed page table.
 * @param preferCycle - Active cycle used to disambiguate overlapping windows.
 * @returns Zero-based page index and pagination cycle.
 */
export function resolveNavPositionFromSnap(
  snapIndex: number,
  plan: CarouselPagePlan,
  preferCycle: CarouselPageCycle = "standard",
): { pageIndex: number; cycle: CarouselPageCycle } {
  if (!plan.canPaginate) {
    return { pageIndex: 0, cycle: "standard" };
  }

  const maxSlide = Math.max(0, plan.slideCount - 1);
  const clamped = Math.min(Math.max(0, snapIndex), maxSlide);

  const resolveLeadingSnapInCycle = (
    cycle: CarouselPageCycle,
  ): { pageIndex: number; cycle: CarouselPageCycle } | null => {
    const pages = getPagesForCycle(plan, cycle);
    for (let page = 0; page < pages.length; page += 1) {
      if (pages[page]?.leadingSnap === clamped) {
        return { pageIndex: page, cycle };
      }
    }
    return null;
  };

  const resolveContainingPageInCycle = (
    cycle: CarouselPageCycle,
  ): { pageIndex: number; cycle: CarouselPageCycle } | null => {
    const pages = getPagesForCycle(plan, cycle);
    for (let page = pages.length - 1; page >= 0; page -= 1) {
      if (pages[page]?.visibleIndices.includes(clamped)) {
        return { pageIndex: page, cycle };
      }
    }
    return null;
  };

  const alternateCycle: CarouselPageCycle =
    preferCycle === "remainder" ? "standard" : "remainder";

  // Prefer the active cycle — leading snap, then window containment.
  const preferredLeading = resolveLeadingSnapInCycle(preferCycle);
  if (preferredLeading) {
    return preferredLeading;
  }

  const preferredContaining = resolveContainingPageInCycle(preferCycle);
  if (preferredContaining) {
    return preferredContaining;
  }

  if (!plan.hasDualCycle) {
    return { pageIndex: 0, cycle: "standard" };
  }

  // Dual-cycle overlap: only use the alternate cycle after the preferred cycle misses.
  const alternateLeading = resolveLeadingSnapInCycle(alternateCycle);
  if (alternateLeading) {
    return alternateLeading;
  }

  const alternateContaining = resolveContainingPageInCycle(alternateCycle);
  if (alternateContaining) {
    return alternateContaining;
  }

  return { pageIndex: 0, cycle: "standard" };
}

/**
 * Resolve the pagination page index for a snap using a precomputed page plan.
 *
 * @param snapIndex - Embla `selectedScrollSnap()` value.
 * @param plan - Precomputed page table.
 * @param preferCycle - Active cycle used to disambiguate overlapping windows.
 * @returns Zero-based page index.
 */
export function resolvePageIndexFromPlan(
  snapIndex: number,
  plan: CarouselPagePlan,
  preferCycle: CarouselPageCycle = "standard",
): number {
  return resolveNavPositionFromSnap(snapIndex, plan, preferCycle).pageIndex;
}

/**
 * Resolve the next page with wrap-around from a precomputed page plan.
 *
 * When {@link CarouselPagePlan.hasDualCycle} is true, finishing the last page of one
 * cycle switches to page 0 of the other cycle (standard ↔ remainder).
 *
 * @param pageIndex - Current page index within the active cycle.
 * @param plan - Precomputed page table.
 * @param cycle - Active pagination cycle.
 * @returns Next page index, leading snap, and cycle.
 */
export function resolveNextPageFromPlan(
  pageIndex: number,
  plan: CarouselPagePlan,
  cycle: CarouselPageCycle = "standard",
): { pageIndex: number; leadingSnap: number; cycle: CarouselPageCycle } {
  const pages = getPagesForCycle(plan, cycle);
  const nextPage = pageIndex + 1;

  if (nextPage < pages.length) {
    return {
      pageIndex: nextPage,
      leadingSnap: pages[nextPage]?.leadingSnap ?? 0,
      cycle,
    };
  }

  if (plan.hasDualCycle) {
    const nextCycle: CarouselPageCycle = cycle === "standard" ? "remainder" : "standard";
    const nextPages = getPagesForCycle(plan, nextCycle);
    return {
      pageIndex: 0,
      leadingSnap: nextPages[0]?.leadingSnap ?? 0,
      cycle: nextCycle,
    };
  }

  const wrapped = pages.length > 0 ? nextPage % pages.length : 0;
  return {
    pageIndex: wrapped,
    leadingSnap: pages[wrapped]?.leadingSnap ?? 0,
    cycle,
  };
}

/**
 * Resolve the previous page with wrap-around from a precomputed page plan.
 *
 * @param pageIndex - Current page index within the active cycle.
 * @param plan - Precomputed page table.
 * @param cycle - Active pagination cycle.
 * @returns Previous page index, leading snap, and cycle.
 */
export function resolvePrevPageFromPlan(
  pageIndex: number,
  plan: CarouselPagePlan,
  cycle: CarouselPageCycle = "standard",
): { pageIndex: number; leadingSnap: number; cycle: CarouselPageCycle } {
  const pages = getPagesForCycle(plan, cycle);

  if (pageIndex > 0) {
    const prevPage = pageIndex - 1;
    return {
      pageIndex: prevPage,
      leadingSnap: pages[prevPage]?.leadingSnap ?? 0,
      cycle,
    };
  }

  if (plan.hasDualCycle) {
    const prevCycle: CarouselPageCycle = cycle === "standard" ? "remainder" : "standard";
    const prevPages = getPagesForCycle(plan, prevCycle);
    const lastPage = Math.max(0, prevPages.length - 1);
    return {
      pageIndex: lastPage,
      leadingSnap: prevPages[lastPage]?.leadingSnap ?? 0,
      cycle: prevCycle,
    };
  }

  const wrapped = pages.length > 0 ? (pageIndex - 1 + pages.length) % pages.length : 0;
  return {
    pageIndex: wrapped,
    leadingSnap: pages[wrapped]?.leadingSnap ?? 0,
    cycle,
  };
}

/** Pagination metadata for interactive carousel controls and loop. */
export interface CarouselPaginationContext {
  standardStarts: number[];
  pageCount: number;
}

/**
 * Resolve pagination metadata for interactive carousel navigation.
 *
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Standard page leading starts and page count.
 */
export function resolveCarouselPaginationContext(
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): CarouselPaginationContext {
  const plan = resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth);

  return {
    standardStarts: plan.standardPages.map((page) => page.leadingSnap),
    pageCount: plan.pageCount,
  };
}

/**
 * Resolve the active pagination page from any Embla snap index.
 *
 * Leading snaps map directly; dragged snaps resolve to the page window that contains them.
 *
 * @param snapIndex - Embla `selectedScrollSnap()` value.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Zero-based page index for navigation state.
 */
export function resolveNavigationPositionFromSnap(
  snapIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number {
  const plan = resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth);
  return resolvePageIndexFromPlan(snapIndex, plan);
}

/**
 * Resolve the next pagination step with wrap-around inside the standard page grid.
 *
 * @param pageIndex - Current page index.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Next page index and leading slide snap target.
 */
export function resolveNextNavigationStep(
  pageIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): { pageIndex: number; leadingStart: number } {
  const plan = resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth);
  const next = resolveNextPageFromPlan(pageIndex, plan);
  return { pageIndex: next.pageIndex, leadingStart: next.leadingSnap };
}

/**
 * Resolve the previous pagination step with wrap-around inside the standard page grid.
 *
 * @param pageIndex - Current page index.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Previous page index and leading slide snap target.
 */
export function resolvePrevNavigationStep(
  pageIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): { pageIndex: number; leadingStart: number } {
  const plan = resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth);
  const prev = resolvePrevPageFromPlan(pageIndex, plan);
  return { pageIndex: prev.pageIndex, leadingStart: prev.leadingSnap };
}

/**
 * Resolve the Embla snap index for a pagination page click.
 *
 * Embla uses per-slide snaps (`slidesToScroll: 1`); the target is the leading
 * slide index for the requested page.
 *
 * @param pageIndex - Zero-based page / dot index.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Embla `scrollTo` snap index.
 */
export function resolveEmblaSnapForPage(
  pageIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number {
  const plan = resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth);
  const clampedPage = Math.min(Math.max(0, pageIndex), Math.max(0, plan.pageCount - 1));
  return plan.pages[clampedPage]?.leadingSnap ?? 0;
}

/**
 * Resolve the pagination page index for a given Embla snap index.
 *
 * @param snapIndex - Embla `selectedScrollSnap()` value (one snap per slide).
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Zero-based page index for dot highlighting and navigation.
 */
export function resolvePageIndexForSnap(
  snapIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number {
  return resolvePageIndexForSlide(
    snapIndex,
    slideCount,
    slidesPerView,
    scrollStep,
    viewportWidth,
  );
}

/**
 * Resolve the next page index with wrap-around for loop carousels.
 *
 * @param currentPage - Active page index.
 * @param pageCount - Total pagination pages.
 * @returns Wrapped next page index.
 */
export function resolveNextPageIndex(currentPage: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  return (currentPage + 1) % pageCount;
}

/**
 * Resolve the previous page index with wrap-around for loop carousels.
 *
 * @param currentPage - Active page index.
 * @param pageCount - Total pagination pages.
 * @returns Wrapped previous page index.
 */
export function resolvePrevPageIndex(currentPage: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  return (currentPage - 1 + pageCount) % pageCount;
}

/** Programmatic carousel scroll intent for loop direction. */
export type CarouselNavScrollAction = "next" | "prev" | "dot";

/**
 * Resolve scroll direction for loop dot jumps (shortest animated path).
 *
 * Embla uses `-1` for forward and `1` for backward when looping.
 *
 * @param currentPage - Active pagination page.
 * @param targetPage - Requested pagination page.
 * @param pageCount - Total pagination pages.
 * @returns Embla loop direction for `scrollTo.index`.
 */
export function resolveLoopScrollDirection(
  currentPage: number,
  targetPage: number,
  pageCount: number,
): -1 | 1 {
  if (pageCount <= 1 || currentPage === targetPage) return -1;

  const forwardSteps = (targetPage - currentPage + pageCount) % pageCount;
  const backwardSteps = (currentPage - targetPage + pageCount) % pageCount;
  return forwardSteps <= backwardSteps ? -1 : 1;
}

/**
 * Resolve Embla loop scroll direction between two slide snap indices.
 *
 * Page-based direction fails on wrap (e.g. snap 2 → 0 "next" took the long
 * forward path). Compare slide distance forward vs backward in loop space.
 *
 * @param currentSnap - Active Embla snap / slide index.
 * @param targetSnap - Target Embla snap / slide index.
 * @param slideCount - Total slides in the carousel.
 * @returns Embla loop direction (`-1` forward, `1` backward).
 */
export function resolveLoopSnapDirection(
  currentSnap: number,
  targetSnap: number,
  slideCount: number,
): -1 | 1 {
  if (slideCount <= 1 || currentSnap === targetSnap) return -1;

  const forward = (targetSnap - currentSnap + slideCount) % slideCount;
  const backward = (currentSnap - targetSnap + slideCount) % slideCount;
  return forward <= backward ? -1 : 1;
}

/**
 * Resolve Embla loop scroll direction for arrow, dot, or autoplay navigation.
 *
 * Arrows and autoplay use forward (`-1`) / backward (`1`) loop direction like native
 * `scrollNext`/`scrollPrev`. Dot jumps use the shortest animated path.
 *
 * @param currentSnap - Active Embla snap / slide index.
 * @param targetSnap - Target Embla snap / slide index.
 * @param slideCount - Total slides in the carousel.
 * @param loop - Whether Embla loop is enabled.
 * @param action - Navigation intent.
 * @returns Embla loop direction (`-1` forward, `1` backward, `0` linear).
 */
export function resolveScrollDirectionForNavAction(
  currentSnap: number,
  targetSnap: number,
  slideCount: number,
  loop: boolean,
  action: CarouselNavScrollAction,
): -1 | 0 | 1 {
  if (!loop) return 0;
  if (action === "next") return -1;
  if (action === "prev") return 1;
  return resolveLoopSnapDirection(currentSnap, targetSnap, slideCount);
}

/**
 * Resolve the leading Embla snap for a pagination page index.
 *
 * @param pageIndex - Zero-based page index.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Leading slide snap index for programmatic `scrollTo`.
 */
export function resolveLeadingSnapForNavPosition(
  pageIndex: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
): number {
  return resolveEmblaSnapForPage(
    pageIndex,
    slideCount,
    slidesPerView,
    scrollStep,
    viewportWidth,
  );
}

/**
 * Resolve visible slide indices for a page leading snap.
 *
 * @param leadingSnap - Leading slide index for the page.
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param viewportWidth - Viewport width in pixels.
 * @returns Slide indices visible on the page.
 */
export function resolvePageVisibleSlideIndices(
  leadingSnap: number,
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  viewportWidth: number,
  loop = false,
): number[] {
  void loop;
  const visibleCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  return resolveVisibleWindowSlideIndices(leadingSnap, slideCount, visibleCount);
}

/**
 * Resolve visible slide windows for each standard pagination page.
 *
 * @param slideCount - Total slides in the carousel.
 * @param slidesPerView - Sidebar visible slides preset.
 * @param scrollStep - Effective scroll step for the current layout mode.
 * @param viewportWidth - Viewport width in pixels.
 * @param loop - Whether Embla loop is enabled.
 * @returns Ordered visible index arrays per standard page.
 */
export function resolveStandardPageWindows(
  slideCount: number,
  slidesPerView: CarouselSlidesPerView,
  scrollStep: CarouselScrollStep,
  viewportWidth: number,
  loop = false,
): number[][] {
  void loop;
  const plan = resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth);
  return plan.standardPages.map((page) => page.visibleIndices);
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
  return resolveEmblaSnapForPage(
    pageIndex,
    slideCount,
    slidesPerView,
    scrollStep,
    viewportWidth,
  );
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
  const plan = resolveCarouselPagePlan(slideCount, slidesPerView, scrollStep, viewportWidth);
  return resolvePageIndexFromPlan(slideIndex, plan);
}

/**
 * Resolve visible slide indices for a page window (linear, non-loop).
 *
 * @param leadingStart - Leading slide index for the page.
 * @param slideCount - Total slides in the carousel.
 * @param visibleCount - Slides visible at once.
 * @returns Slide indices visible on the page.
 */
function resolveVisibleWindowSlideIndices(
  leadingStart: number,
  slideCount: number,
  visibleCount: number,
  loop = false,
): number[] {
  if (
    loop &&
    visibleCount > 1 &&
    (leadingStart === slideCount - 1 || leadingStart + visibleCount > slideCount)
  ) {
    const indices = [leadingStart];
    for (let offset = 1; offset < visibleCount; offset += 1) {
      indices.push((leadingStart + offset) % slideCount);
    }
    return indices;
  }

  const indices: number[] = [];
  for (let offset = 0; offset < visibleCount; offset += 1) {
    const index = leadingStart + offset;
    if (index >= slideCount) break;
    indices.push(index);
  }
  return indices;
}

/**
 * Resolve pagination dot count for carousel controls.
 *
 * Always uses the trimmed page estimate so dots, arrows, and `scrollTo` targets
 * stay aligned — even in loop mode where Embla reports extra snap points.
 *
 * @param editLayoutMode - Whether strip-style edit layout is active.
 * @param emblaLoop - Whether Embla loop is enabled for the current mode.
 * @param emblaSnapCount - Snap count reported by the Embla API.
 * @param estimatedSnapCount - Pre-init page estimate from sidebar presets.
 * @returns Number of dots to render.
 */
export function resolveCarouselNavDotCount(
  editLayoutMode: boolean,
  emblaLoop: boolean,
  emblaSnapCount: number,
  estimatedSnapCount: number,
): number {
  void emblaLoop;
  void emblaSnapCount;
  return Math.max(1, estimatedSnapCount);
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
