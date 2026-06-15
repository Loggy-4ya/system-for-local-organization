/**
 * @fileoverview React hook — single carousel navigation controller for interactive mode.
 *
 * @module src/components/puck/lib/useCarouselNavController
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

import type { CarouselScrollStep, CarouselSlidesPerView } from "../blocks/content/NexusCarouselRender";
import { scrollEngineToSnap, type CarouselEngineApi } from "./carouselEngine";
import {
  computeDotNavTarget,
  computeNextNavTarget,
  computePrevNavTarget,
  resolveCarouselNavMode,
  resolveCurrentNavPosition,
  resolveDirectionForNavTarget,
  syncNavPositionFromSnap,
  type CarouselNavMode,
  type CarouselNavPosition,
} from "./carouselNavController";
import {
  getPageCountForCycle,
  type CarouselPageCycle,
  type CarouselPagePlan,
} from "./carouselPagination";

/** Options for {@link useCarouselNavController}. */
export interface UseCarouselNavControllerOptions {
  /** Carousel engine API (Embla). */
  engine: CarouselEngineApi | undefined;
  /** Precomputed pagination table. */
  pagePlan: CarouselPagePlan;
  /** Total slides in the carousel. */
  slideCount: number;
  /** Whether Embla loop is enabled. */
  loop: boolean;
  /** Whether pagination controls are active. */
  canPaginate: boolean;
  /** Effective scroll step for the current layout mode. */
  navScrollStep: CarouselScrollStep;
  /** Sidebar visible slides preset. */
  slidesPerView: CarouselSlidesPerView;
  /** Measured carousel width in pixels. */
  viewportWidth: number;
  /** When false, controller state is inert (Puck edit layout). */
  interactive: boolean;
}

/** Return value of {@link useCarouselNavController}. */
export interface CarouselNavController {
  pageIndex: number;
  pageCycle: CarouselPageCycle;
  pageCount: number;
  navMode: CarouselNavMode;
  pagePlanRef: MutableRefObject<CarouselPagePlan>;
  pageCycleRef: MutableRefObject<CarouselPageCycle>;
  programmaticScrollRef: MutableRefObject<boolean>;
  goNext: () => void;
  goPrev: () => void;
  goToDot: (dotIndex: number) => void;
  syncFromSnap: (snap: number) => void;
  onSettle: () => void;
  shouldSkipSnapSync: () => boolean;
  reset: () => void;
}

/**
 * Owns interactive carousel pagination state and navigation actions.
 *
 * @param options - Engine, page plan, and layout context.
 * @returns Unified nav API for arrows, dots, autoplay, and drag sync.
 */
export function useCarouselNavController(
  options: UseCarouselNavControllerOptions,
): CarouselNavController {
  const {
    engine,
    pagePlan,
    slideCount,
    loop,
    canPaginate,
    navScrollStep,
    slidesPerView,
    viewportWidth,
    interactive,
  } = options;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCycle, setPageCycle] = useState<CarouselPageCycle>("standard");
  const programmaticScrollRef = useRef(false);
  const pagePlanRef = useRef(pagePlan);
  const pageCycleRef = useRef<CarouselPageCycle>("standard");

  pagePlanRef.current = pagePlan;
  pageCycleRef.current = pageCycle;

  const navMode = resolveCarouselNavMode(
    canPaginate,
    navScrollStep,
    slidesPerView,
    viewportWidth,
  );

  const pageCount = getPageCountForCycle(pagePlan, pageCycle);

  const reset = useCallback(() => {
    setPageIndex(0);
    setPageCycle("standard");
    pageCycleRef.current = "standard";
    programmaticScrollRef.current = false;
  }, []);

  const applyPosition = useCallback((position: CarouselNavPosition) => {
    setPageIndex(position.pageIndex);
    setPageCycle(position.pageCycle);
    pageCycleRef.current = position.pageCycle;
  }, []);

  const executeProgrammaticNav = useCallback(
    (target: ReturnType<typeof computeNextNavTarget>) => {
      if (!engine) return;

      programmaticScrollRef.current = true;
      applyPosition(target);

      const currentSnap = engine.selectedScrollSnap();
      const direction = resolveDirectionForNavTarget(
        currentSnap,
        target,
        slideCount,
        loop,
      );
      scrollEngineToSnap(engine, target.leadingSnap, { direction });
    },
    [applyPosition, engine, loop, slideCount],
  );

  const syncFromSnap = useCallback(
    (snap: number) => {
      if (!interactive || !canPaginate) return;

      const position = syncNavPositionFromSnap(
        snap,
        pagePlanRef.current,
        pageCycleRef.current,
      );
      applyPosition(position);
    },
    [applyPosition, canPaginate, interactive],
  );

  const goNext = useCallback(() => {
    if (!interactive || !canPaginate || !engine) return;

    if (navMode === "nativeStep1") {
      engine.scrollNext();
      return;
    }

    const position = resolveCurrentNavPosition(
      engine.selectedScrollSnap(),
      { pageIndex, pageCycle },
      pagePlanRef.current,
    );
    executeProgrammaticNav(computeNextNavTarget(position, pagePlanRef.current));
  }, [
    canPaginate,
    engine,
    executeProgrammaticNav,
    interactive,
    navMode,
    pageCycle,
    pageIndex,
  ]);

  const goPrev = useCallback(() => {
    if (!interactive || !canPaginate || !engine) return;

    if (navMode === "nativeStep1") {
      engine.scrollPrev();
      return;
    }

    const position = resolveCurrentNavPosition(
      engine.selectedScrollSnap(),
      { pageIndex, pageCycle },
      pagePlanRef.current,
    );
    executeProgrammaticNav(computePrevNavTarget(position, pagePlanRef.current));
  }, [
    canPaginate,
    engine,
    executeProgrammaticNav,
    interactive,
    navMode,
    pageCycle,
    pageIndex,
  ]);

  const goToDot = useCallback(
    (dotIndex: number) => {
      if (!interactive || !canPaginate || !engine) return;

      executeProgrammaticNav(
        computeDotNavTarget(dotIndex, pageCycle, pagePlanRef.current),
      );
    },
    [canPaginate, engine, executeProgrammaticNav, interactive, pageCycle],
  );

  const onSettle = useCallback(() => {
    programmaticScrollRef.current = false;
  }, []);

  const shouldSkipSnapSync = useCallback(() => {
    return programmaticScrollRef.current;
  }, []);

  useEffect(() => {
    reset();
  }, [slideCount, navScrollStep, slidesPerView, reset]);

  return {
    pageIndex,
    pageCycle,
    pageCount,
    navMode,
    pagePlanRef,
    pageCycleRef,
    programmaticScrollRef,
    goNext,
    goPrev,
    goToDot,
    syncFromSnap,
    onSettle,
    shouldSkipSnapSync,
    reset,
  };
}
