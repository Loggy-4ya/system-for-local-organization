"use client";

/**
 * @fileoverview Carousel render — Embla in view/interactive modes; edit-mode swipe via Embla or pointer gestures.
 *
 * Tests: `tests/puck/lib/carouselEditSwipeLogic.test.ts` — `npm run test:carousel-edit-swipe`
 *
 * @module src/components/puck/blocks/content/NexusCarouselRender
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Pause, Play, Settings2 } from "lucide-react";
import { useGetPuck } from "@puckeditor/core";
import { useNexusPuck, usePuckPreviewMode } from "../../lib/useNexusPuck";
import { selectPuckComponentById } from "../../lib/selectPuckComponentById";
import { syncPuckComponentOverlay, syncPuckOverlaysInRoot } from "../../lib/puckOverlaySync";
import type { PuckOverlaySyncStore } from "../../lib/puckOverlaySync";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  canUseCarouselMatchMedia,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  resolveCarouselBorderRadius,
  resolveCarouselMinEmptyHeightPx,
  resolveCarouselEffectiveHeight,
  CAROUSEL_AUTO_MIN_HEIGHT_PX,
} from "../../fields/CarouselDimensionFields";
import { cn } from "@/lib/utils";
import { CarouselSlideMediaProvider } from "../../CarouselSlideMediaContext";
import { usePuckOverlayPortalRef } from "../../lib/usePuckOverlayPortal";
import { useStripActiveIndex } from "../../lib/useStripActiveIndex";
import { usePuckArrayOpenStripSync } from "../../lib/usePuckArrayOpenStripSync";
import {
  resolveCarouselNavScrollStep,
  resolveCarouselPagePlan,
  resolveEditScrollSnapForSlide,
  resolvePageIndexForSnap,
  resolveLoopSnapDirection,
  resolveVisibleSlideCountAtWidth,
  AUTO_SLIDES_PER_VIEW_BREAKPOINTS,
  type CarouselPagePlan,
} from "../../lib/carouselPagination";
import {
  resolveCarouselEmblaScrollOptions,
  resolveCarouselEmblaMotionOptions,
  scrollEngineToSnap,
} from "../../lib/carouselEngine";
import {
  resolveCarouselEditEmblaDragEnabled,
  resolveCarouselEditPointerSwipeEnabled,
  shouldAllowCarouselEditEmblaDrag,
} from "../../lib/carouselEditSwipeLogic";
import { useCarouselEditSwipe } from "../../lib/useCarouselEditSwipe";
import { useCarouselNavController } from "../../lib/useCarouselNavController";
import {
  CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  NEXUS_CAROUSEL_FILL_ATTR,
  CAROUSEL_EDIT_ROW_MIN_HEIGHT_PX,
  measureFillSlideComponentHeight,
  resolveCarouselEditSlideFloorPx,
} from "../../lib/carouselMediaFill";

/** Puck slot component for slide content. */
type SlideContentComponent = ComponentType<{
  minEmptyHeight?: number | string;
  className?: string;
  style?: CSSProperties;
}>;

/** Single carousel slide. */
export interface CarouselSlide {
  label: string;
  content?: SlideContentComponent;
}

/** Slides-per-view preset for responsive or fixed multi-slide layouts. */
export type CarouselSlidesPerView = "auto" | "1" | "2" | "3";

/** Slides advanced per navigation click / autoplay tick. */
export type CarouselScrollStep = "1" | "2" | "3" | "page";

/** Props for {@link NexusCarouselRender}. */
export interface NexusCarouselRenderProps {
  id?: string;
  slides: CarouselSlide[];
  height: string;
  heightCustom?: string;
  maxHeight?: string;
  maxHeightCustom?: string;
  borderRadius: string;
  borderRadiusCustom?: string;
  autoplay: "on" | "off";
  intervalSeconds: number;
  showArrows: "yes" | "no";
  showDots: "yes" | "no";
  slidesPerView?: CarouselSlidesPerView;
  scrollStep?: CarouselScrollStep;
  editorActiveIndex?: number;
  puck?: { isEditing?: boolean };
}

/** Internal props for the shared carousel body. */
interface NexusCarouselBodyProps extends NexusCarouselRenderProps {
  editLayoutMode: boolean;
  controlsPortalRef: (node: HTMLElement | null) => void;
  /** Puck store accessor for overlay re-sync (editor only). */
  getPuck?: any;
  onSelectCarousel?: () => void;
}

/** No-op portal ref for published / static render (outside Puck editor). */
function useNoopPortalRef() {
  return useCallback((_node: HTMLElement | null) => undefined, []);
}

/**
 * Measure CSS grid content height from intrinsic layout (ignores parent stretch).
 *
 * @param grid - Grid drop-zone root (`.nexus-grid`).
 * @returns Pixel height spanning all grid rows.
 */
function measureGridLayoutHeight(grid: HTMLElement): number {
  const host =
    grid.closest<HTMLElement>(".nexus-grid-host") ??
    (grid.parentElement instanceof HTMLElement ? grid.parentElement : grid);

  const slide = grid.closest<HTMLElement>(".nexus-carousel__slide");
  const dropzoneShell = slide?.querySelector<HTMLElement>(".nexus-carousel__slide-dropzone-shell");

  const touched: Array<{
    el: HTMLElement;
    height: string;
    minHeight: string;
    slideHeightVar?: string;
  }> = [];

  const resetEl = (el: HTMLElement, trackSlideVar = false) => {
    touched.push({
      el,
      height: el.style.height,
      minHeight: el.style.minHeight,
      slideHeightVar: trackSlideVar
        ? el.style.getPropertyValue("--nexus-carousel-slide-height")
        : undefined,
    });
    el.style.setProperty("height", "auto", "important");
    el.style.setProperty("min-height", "0", "important");
    if (trackSlideVar) {
      el.style.removeProperty("--nexus-carousel-slide-height");
    }
  };

  resetEl(grid);
  if (slide) {
    resetEl(slide, true);
  }
  if (dropzoneShell) {
    resetEl(dropzoneShell);
  }
  host.querySelectorAll<HTMLElement>(
    ".nexus-grid-item-shell, .nexus-grid-item__dropzone-shell, .nexus-grid [data-puck-dropzone]",
  ).forEach((el) => resetEl(el));

  void host.offsetHeight;
  const measured = grid.getBoundingClientRect().height;

  touched.forEach(({ el, height, minHeight, slideHeightVar }) => {
    if (height) {
      el.style.height = height;
    } else {
      el.style.removeProperty("height");
    }
    if (minHeight) {
      el.style.minHeight = minHeight;
    } else {
      el.style.removeProperty("min-height");
    }
    if (slideHeightVar !== undefined) {
      if (slideHeightVar) {
        el.style.setProperty("--nexus-carousel-slide-height", slideHeightVar);
      } else {
        el.style.removeProperty("--nexus-carousel-slide-height");
      }
    }
  });

  return measured;
}

/**
 * Measure natural slide content height without the edit-height min-height feedback loop.
 *
 * In-flow blocks stack; fill-slide media (absolute) competes via `max()` with the stack.
 *
 * @param slide - Slide root element.
 * @param floorPx - Minimum height for empty slides.
 * @param fallbackFillWidthPx - Width for fill media when the slide is collapsed (zero layout width).
 * @returns Content-driven pixel height.
 */
function measureSlideNaturalHeight(
  slide: HTMLElement,
  floorPx: number,
  fallbackFillWidthPx: number,
): number {
  const dropzone = slide.querySelector<HTMLElement>("[data-puck-dropzone]");
  if (!dropzone) return floorPx;

  const components = dropzone.querySelectorAll<HTMLElement>("[data-puck-component]");
  if (components.length === 0) {
    return floorPx;
  }

  const slideWidth = slide.getBoundingClientRect().width;
  const fillWidthPx = slideWidth > 0 ? slideWidth : fallbackFillWidthPx;

  let flowHeight = 0;
  let fillHeight = 0;

  components.forEach((component) => {
    const grid = component.querySelector<HTMLElement>(".nexus-grid");
    if (grid) {
      flowHeight = Math.max(flowHeight, measureGridLayoutHeight(grid));
      return;
    }

    const fillRoot = component.querySelector<HTMLElement>(
      `.${CAROUSEL_SLIDE_MEDIA_FILL_CLASS}, [${NEXUS_CAROUSEL_FILL_ATTR}="true"]`,
    );
    if (fillRoot) {
      fillHeight = Math.max(
        fillHeight,
        measureFillSlideComponentHeight(fillRoot, fillWidthPx, floorPx),
      );
      return;
    }

    flowHeight += component.offsetHeight;
  });

  return Math.max(floorPx, flowHeight, fillHeight);
}

/**
 * Measure slide content height with slide stretch styles temporarily cleared.
 *
 * @param slide - Carousel slide root element.
 * @param floorPx - Minimum height for empty slides.
 * @param fallbackFillWidthPx - Width for fill media when the slide is collapsed.
 * @returns Content-driven pixel height without row-height-sync stretch in layout.
 */
function measureSlideNaturalHeightDetached(
  slide: HTMLElement,
  floorPx: number,
  fallbackFillWidthPx: number,
): number {
  const saved = {
    height: slide.style.height,
    minHeight: slide.style.minHeight,
  };
  slide.style.setProperty("height", "auto", "important");
  slide.style.setProperty("min-height", "0", "important");
  void slide.offsetHeight;
  const measured = measureSlideNaturalHeight(slide, floorPx, fallbackFillWidthPx);
  if (saved.height) {
    slide.style.height = saved.height;
  } else {
    slide.style.removeProperty("height");
  }
  if (saved.minHeight) {
    slide.style.minHeight = saved.minHeight;
  } else {
    slide.style.removeProperty("min-height");
  }
  return measured;
}

/**
 * Whether a slide contains only fill-slide media blocks (no grid or in-flow stacks).
 *
 * @param slide - Carousel slide root element.
 * @returns True when every Puck block in the slide is carousel fill media.
 */
function slideContainsOnlyFillMedia(slide: HTMLElement): boolean {
  const dropzone = slide.querySelector<HTMLElement>("[data-puck-dropzone]");
  if (!dropzone) return false;

  const components = dropzone.querySelectorAll<HTMLElement>("[data-puck-component]");
  if (components.length === 0) return false;

  return Array.from(components).every((component) =>
    Boolean(
      component.querySelector(
        `.${CAROUSEL_SLIDE_MEDIA_FILL_CLASS}, [${NEXUS_CAROUSEL_FILL_ATTR}="true"]`,
      ),
    ),
  );
}

/**
 * Resolve root CSS class for slides-per-view preset.
 *
 * @param slidesPerView - Sidebar preset.
 * @returns Class name applied on `.nexus-carousel` root.
 */
export function resolveSlidesPerViewClass(slidesPerView: CarouselSlidesPerView): string {
  switch (slidesPerView) {
    case "2":
      return "nexus-carousel--spv-2";
    case "3":
      return "nexus-carousel--spv-3";
    case "1":
      return "nexus-carousel--spv-1";
    case "auto":
    default:
      return "nexus-carousel--spv-auto";
  }
}

/**
 * Render a slide content Puck slot when resolved, otherwise an empty hint.
 *
 * @param Content - Puck slot component for the slide body.
 * @param editLayoutMode - Whether strip-style edit layout is active.
 * @param minDropZoneHeightPx - Pixel floor for empty Puck drop zones in edit mode.
 * @returns Slide content drop zone or empty hint.
 */
function renderSlideContent(
  Content: SlideContentComponent | undefined,
  editLayoutMode: boolean,
  minDropZoneHeightPx: number,
) {
  if (typeof Content !== "function") {
    return (
      <p className="nexus-carousel__empty-hint">
        Drag blocks from the sidebar into this slide.
      </p>
    );
  }

  if (!editLayoutMode) {
    return (
      <Content
        className="nexus-carousel__dropzone"
        style={{
          boxSizing: "border-box",
          display: "flex",
          flex: "1 1 auto",
          flexDirection: "column",
          height: "100%",
          minHeight: "inherit",
          width: "100%",
        }}
      />
    );
  }

  return (
    <div className="nexus-carousel__slide-dropzone-shell">
      <Content
        minEmptyHeight={minDropZoneHeightPx}
        className="nexus-carousel__dropzone"
        style={{
          boxSizing: "border-box",
          display: "flex",
          flex: "1 1 auto",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        }}
      />
    </div>
  );
}

/** Shared carousel navigation controls (arrows + dots). */
interface CarouselControlsProps {
  showArrows: "yes" | "no";
  showDots: "yes" | "no";
  showNavigation: boolean;
  activeIndex: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  controlsPortalRef: (node: HTMLElement | null) => void;
  /** When set, renders a gear button under the next arrow (edit mode). */
  onSelectCarousel?: () => void;
  /** Whether dots/arrows represent pages (multi-slide) or individual slides. */
  navUnit?: "slide" | "page";
  /** When true, renders a top-right pause/play toggle for autoplay. */
  showAutoplayToggle?: boolean;
  /** Whether autoplay is currently paused by the viewer. */
  isAutoplayPaused?: boolean;
  /** Toggles autoplay pause state. */
  onToggleAutoplayPause?: () => void;
}

/**
 * Render prev/next arrows and pagination dots for carousel navigation.
 *
 * @param props - Control visibility, indices, and handlers.
 * @returns Controls container or null when hidden.
 */
function CarouselControls({
  showArrows,
  showDots,
  showNavigation,
  activeIndex,
  pageCount,
  onPrev,
  onNext,
  onGoTo,
  controlsPortalRef,
  navUnit = "page",
  onSelectCarousel,
  showAutoplayToggle = false,
  isAutoplayPaused = false,
  onToggleAutoplayPause,
}: CarouselControlsProps) {
  const hasCarouselControls =
    showNavigation && (showArrows === "yes" || showDots === "yes");

  if (!hasCarouselControls && !showAutoplayToggle) return null;

  return (
    <div ref={controlsPortalRef} className="nexus-carousel__controls">
      {showAutoplayToggle && onToggleAutoplayPause ? (
        <button
          type="button"
          className="nexus-carousel__autoplay-toggle"
          aria-label={isAutoplayPaused ? "Resume carousel" : "Pause carousel"}
          aria-pressed={isAutoplayPaused}
          title={isAutoplayPaused ? "Resume carousel" : "Pause carousel"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleAutoplayPause();
          }}
        >
          {isAutoplayPaused ? (
            <Play size={16} aria-hidden />
          ) : (
            <Pause size={16} aria-hidden />
          )}
        </button>
      ) : null}

      {showArrows === "yes" && showNavigation ? (
        <>
          <button
            type="button"
            className="nexus-carousel__arrow nexus-carousel__arrow--prev"
            aria-label={navUnit === "slide" ? "Previous slide" : "Previous page"}
            onClick={(event) => {
              event.stopPropagation();
              onPrev();
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="nexus-carousel__arrow nexus-carousel__arrow--next"
            aria-label={navUnit === "slide" ? "Next slide" : "Next page"}
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
          >
            ›
          </button>
          {onSelectCarousel ? (
            <button
              type="button"
              className="nexus-carousel__edit-select"
              aria-label="Carousel settings"
              title="Carousel settings"
              onClick={(event) => {
                event.stopPropagation();
                onSelectCarousel();
              }}
            >
              <Settings2 size={16} aria-hidden />
            </button>
          ) : null}
        </>
      ) : null}

      {showDots === "yes" && showNavigation && pageCount > 1 ? (
        <div className="nexus-carousel__dots" role="tablist" aria-label="Carousel pagination">
          {Array.from({ length: pageCount }, (_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              className={
                idx === activeIndex
                  ? "nexus-carousel__dot nexus-carousel__dot--active"
                  : "nexus-carousel__dot"
              }
              aria-selected={idx === activeIndex}
              aria-label={
                navUnit === "slide" ? `Go to slide ${idx + 1}` : `Go to page ${idx + 1}`
              }
              onClick={(event) => {
                event.stopPropagation();
                onGoTo(idx);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Whether a canvas drag is active on the preview document (read from DOM).
 *
 * @param root - Carousel root element in the preview iframe.
 * @returns True while Puck canvas drag is in flight.
 */
function isPreviewCanvasDragActive(root: HTMLElement | null): boolean {
  return Boolean(root?.ownerDocument?.documentElement.hasAttribute("data-puck-dragging"));
}

/**
 * Shared carousel body — used by both Puck editor and static {@link Render} output.
 *
 * @param props - Carousel configuration and mode flags.
 * @returns Carousel UI.
 */
function NexusCarouselBody({
  id,
  slides,
  height,
  heightCustom,
  maxHeight,
  maxHeightCustom,
  borderRadius,
  borderRadiusCustom,
  autoplay,
  intervalSeconds,
  showArrows,
  showDots,
  slidesPerView = "auto",
  scrollStep = "1",
  editorActiveIndex,
  editLayoutMode,
  controlsPortalRef,
  getPuck,
  onSelectCarousel,
}: NexusCarouselBodyProps) {
  const count = slides.length;
  const rootRef = useRef<HTMLDivElement>(null);

  /** Re-measure nested Puck selection overlays after slide layout changes. */
  const syncPuckOverlay = useCallback(() => {
    if (!editLayoutMode || !getPuck) return;
    const store = getPuck();
    requestAnimationFrame(() => {
      syncPuckOverlaysInRoot(store, rootRef.current);
      syncPuckComponentOverlay(store, id);
    });
  }, [editLayoutMode, getPuck, id]);

  const [activeSlideIndex, setActiveSlideIndex] = useStripActiveIndex(
    id,
    0,
    slides.length,
    editorActiveIndex,
  );

  const previousSlideCountRef = useRef(count);
  const activeSlideIndexRef = useRef(activeSlideIndex);
  activeSlideIndexRef.current = activeSlideIndex;
  /** Dedupes redundant programmatic edit scrolls within the same frame. */
  const lastEditScrollRef = useRef<{ slideIndex: number; snap: number } | null>(null);
  /** Latest page plan for stable Embla handlers (avoids re-subscribing on width changes). */
  const pagePlanRef = useRef<CarouselPagePlan>({
    slideCount: 0,
    standardPages: [{ leadingSnap: 0, visibleIndices: [0] }],
    remainderPages: null,
    hasDualCycle: false,
    pages: [{ leadingSnap: 0, visibleIndices: [0] }],
    pageCount: 1,
    visibleCount: 1,
    interactivePageCount: 1,
    canPaginate: false,
  });
  const editNavContextRef = useRef({
    editLayoutMode: false,
    editStaticFit: false,
    multiSlideEditWysiwyg: false,
    singleSlideEditView: false,
  });

  const [api, setApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselIndexRef = useRef(carouselIndex);
  carouselIndexRef.current = carouselIndex;
  const [viewportWidth, setViewportWidth] = useState(0);
  /** Viewer-only pause for autoplay — not persisted to Puck props. */
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const navScrollStep = resolveCarouselNavScrollStep(editLayoutMode, scrollStep);
  /** Published SSR starts at width 0 — assume desktop so nav matches hydrated layout. */
  const paginationViewportWidth =
    !editLayoutMode && viewportWidth <= 0
      ? AUTO_SLIDES_PER_VIEW_BREAKPOINTS.desktop
      : viewportWidth;
  const pagePlan = useMemo(
    () => resolveCarouselPagePlan(count, slidesPerView, navScrollStep, paginationViewportWidth),
    [count, navScrollStep, slidesPerView, paginationViewportWidth],
  );
  pagePlanRef.current = pagePlan;
  const editPageCount = pagePlan.pageCount;
  const singleSlideEditView =
    editLayoutMode &&
    (slidesPerView === "1" ||
      (slidesPerView === "auto" &&
        viewportWidth > 0 &&
        resolveVisibleSlideCountAtWidth("auto", viewportWidth) === 1));
  /** Multi-slide edit — WYSIWYG layout with CSS-pinned track when all slides fit. */
  const multiSlideEditWysiwyg = editLayoutMode && !singleSlideEditView;
  const effectiveHeight = resolveCarouselEffectiveHeight(
    height,
    heightCustom,
    maxHeight,
    maxHeightCustom,
  );
  const resolvedHeight =
    effectiveHeight.mode === "fixed" ? effectiveHeight.height : undefined;
  const resolvedMaxHeight =
    effectiveHeight.mode === "auto-capped" ? effectiveHeight.maxHeight : undefined;
  const resolvedBorderRadius = resolveCarouselBorderRadius(borderRadius, borderRadiusCustom);
  const hasFixedHeight = effectiveHeight.mode === "fixed";
  const hasMaxHeightCap = effectiveHeight.mode === "auto-capped";
  const maxHeightCapPx = resolvedMaxHeight
    ? resolveCarouselMinEmptyHeightPx(resolvedMaxHeight, Number.MAX_SAFE_INTEGER)
    : undefined;
  const autoMinHeightPx = hasFixedHeight
    ? resolveCarouselMinEmptyHeightPx(resolvedHeight, CAROUSEL_AUTO_MIN_HEIGHT_PX)
    : CAROUSEL_AUTO_MIN_HEIGHT_PX;

  const slideSpvClass = resolveSlidesPerViewClass(slidesPerView);
  const useSingleFrame = slidesPerView === "1";
  const emblaScroll = resolveCarouselEmblaScrollOptions();
  const emblaBreakpointsBase = emblaScroll.breakpoints;

  const visibleSlideCount = resolveVisibleSlideCountAtWidth(
    slidesPerView,
    paginationViewportWidth,
  );
  /** Edit-mode drop-zone / row floor — auto min height + 16:9 fill height at slide width. */
  const editDropZoneMinHeightPx = editLayoutMode
    ? resolveCarouselEditSlideFloorPx(
        viewportWidth > 0 ? viewportWidth / Math.max(1, visibleSlideCount) : 0,
        autoMinHeightPx,
      )
    : autoMinHeightPx;

  const carouselSizeStyle: CSSProperties = {
    ...(useSingleFrame ? { borderRadius: resolvedBorderRadius } : undefined),
    ["--nexus-carousel-slide-radius" as string]: resolvedBorderRadius,
    ...(hasFixedHeight && resolvedHeight
      ? {
          ["--nexus-carousel-height" as string]: resolvedHeight,
          ["--nexus-carousel-min-height" as string]: resolvedHeight,
          minHeight: resolvedHeight,
        }
      : {
          ["--nexus-carousel-auto-min-height" as string]: `${autoMinHeightPx}px`,
        }),
    ...(editLayoutMode && !hasFixedHeight
      ? {
          ["--nexus-carousel-edit-min-height" as string]: `${editDropZoneMinHeightPx}px`,
        }
      : undefined),
    ...(resolvedMaxHeight
      ? {
          ["--nexus-carousel-max-height" as string]: resolvedMaxHeight,
          maxHeight: resolvedMaxHeight,
        }
      : undefined),
  };

  /** One slide visible at the current breakpoint (phone spv-auto, spv-1). */
  const singleVisibleLayout =
    viewportWidth > 0 &&
    resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth) === 1;
  /** Equal-height slide cards — flex stretch when 2+ slides visible (interactive + multi-slide edit). */
  const equalRowLayout =
    viewportWidth > 0 &&
    visibleSlideCount >= 2 &&
    (!editLayoutMode || !singleSlideEditView);
  const allSlidesFitInView = count <= visibleSlideCount;
  /** All slides visible at once — lock Embla transform so drop zones stay on screen. */
  const editStaticFit = multiSlideEditWysiwyg && allSlidesFitInView;
  /** Multi-slide track flush to container when every slide fits (no loop trailing gutter). */
  const staticFit = !useSingleFrame && allSlidesFitInView;
  const canPaginate = pagePlan.canPaginate;
  /** Embla loop only in interactive/published — edit avoids clone nodes that break Puck slots. */
  const emblaLoop = canPaginate && !editLayoutMode;
  const emblaContainScroll = emblaLoop ? false : ("trimSnaps" as const);
  const emblaEditDragEnabled = resolveCarouselEditEmblaDragEnabled(
    editLayoutMode,
    count,
    editStaticFit,
  );
  const emblaMotion = useMemo(
    () => resolveCarouselEmblaMotionOptions(!editLayoutMode || emblaEditDragEnabled),
    [editLayoutMode, emblaEditDragEnabled],
  );
  const carouselEditPointerSwipeEnabled = resolveCarouselEditPointerSwipeEnabled(
    editLayoutMode,
    count,
  );
  const emblaBreakpoints = useMemo(
    () => ({
      ...emblaBreakpointsBase,
      ...emblaMotion.breakpoints,
    }),
    [emblaBreakpointsBase, emblaMotion.breakpoints],
  );

  const nav = useCarouselNavController({
    engine: api,
    pagePlan,
    slideCount: count,
    loop: emblaLoop,
    canPaginate,
    navScrollStep,
    slidesPerView,
    viewportWidth,
    interactive: !editLayoutMode,
  });

  const {
    pageIndex: navPageIndex,
    pageCount: navPageCount,
    goNext: navGoNext,
    goPrev: navGoPrev,
    goToDot: navGoToDot,
    reset: resetNav,
  } = nav;

  /** Stable ref for Embla handlers — avoid re-subscribing when controller object identity changes. */
  const navRef = useRef(nav);
  navRef.current = nav;

  const pageCount = !editLayoutMode && canPaginate ? navPageCount : editPageCount;

  editNavContextRef.current = {
    editLayoutMode,
    editStaticFit,
    multiSlideEditWysiwyg,
    singleSlideEditView,
  };

  const scrollToEditPage = useCallback(
    (pageIndex: number, slideIndex: number, options?: { jump?: boolean }) => {
      if (!api || count === 0 || editStaticFit) return;

      const jump = options?.jump ?? false;
      const maxPage = Math.max(0, editPageCount - 1);
      const clampedPage = Math.min(Math.max(0, pageIndex), maxPage);

      if (singleSlideEditView) {
        const snap = Math.min(Math.max(0, slideIndex), count - 1);
        if (
          lastEditScrollRef.current?.slideIndex === slideIndex &&
          lastEditScrollRef.current?.snap === snap &&
          api.selectedScrollSnap() === snap
        ) {
          return;
        }

        api.scrollTo(snap, jump);
        lastEditScrollRef.current = { slideIndex, snap };
        return;
      }

      const leadingSnap = pagePlan.pages[clampedPage]?.leadingSnap ?? 0;

      if (
        lastEditScrollRef.current?.slideIndex === slideIndex &&
        lastEditScrollRef.current?.snap === leadingSnap &&
        api.selectedScrollSnap() === leadingSnap
      ) {
        return;
      }

      api.scrollTo(leadingSnap, jump);
      lastEditScrollRef.current = { slideIndex, snap: leadingSnap };
    },
    [api, count, editStaticFit, editPageCount, pagePlan.pages, singleSlideEditView],
  );

  const scrollToEditSlide = useCallback(
    (slideIndex: number) => {
      if (!api || count === 0 || editStaticFit) return;

      const snap = resolveEditScrollSnapForSlide(
        slideIndex,
        count,
        slidesPerView,
        navScrollStep,
        viewportWidth,
        singleSlideEditView,
      );
      scrollToEditPage(snap, slideIndex);
    },
    [
      api,
      count,
      editStaticFit,
      navScrollStep,
      scrollToEditPage,
      singleSlideEditView,
      slidesPerView,
      viewportWidth,
    ],
  );

  const goToSnap = useCallback(
    (snapIndex: number, options?: { jump?: boolean; direction?: -1 | 0 | 1 }) => {
      if (!api) return;
      scrollEngineToSnap(api, snapIndex, {
        jump: options?.jump ?? false,
        direction: options?.direction ?? 0,
      });
    },
    [api],
  );

  const goToPage = useCallback(
    (pageIndex: number, loopNavDirection?: -1 | 1) => {
      if (!editLayoutMode && api && canPaginate) {
        navGoToDot(pageIndex);
        return;
      }

      const maxPage = Math.max(0, editPageCount - 1);
      const clampedPage = Math.min(Math.max(0, pageIndex), maxPage);
      const slideIndex = pagePlan.pages[clampedPage]?.leadingSnap ?? 0;

      if (editLayoutMode) {
        setActiveSlideIndex(slideIndex);
        if (!editStaticFit) {
          scrollToEditPage(clampedPage, slideIndex);
        }
        return;
      }

      const targetSnap = pagePlan.pages[clampedPage]?.leadingSnap ?? 0;

      if (emblaLoop && api) {
        const direction =
          loopNavDirection ??
          resolveLoopSnapDirection(api.selectedScrollSnap(), targetSnap, count);
        goToSnap(targetSnap, { direction });
        return;
      }

      goToSnap(targetSnap);
    },
    [
      api,
      canPaginate,
      count,
      editLayoutMode,
      editPageCount,
      editStaticFit,
      emblaLoop,
      goToSnap,
      navGoToDot,
      pagePlan.pages,
      scrollToEditPage,
      setActiveSlideIndex,
      singleSlideEditView,
    ],
  );

  const goToPrev = useCallback(() => {
    if (editLayoutMode && editStaticFit) {
      setActiveSlideIndex(((activeSlideIndex - 1) % count + count) % count);
      return;
    }

    if (editLayoutMode && singleSlideEditView) {
      const nextIndex = ((activeSlideIndex - 1) % count + count) % count;
      setActiveSlideIndex(nextIndex);
      scrollToEditPage(nextIndex, nextIndex);
      return;
    }

    if (!editLayoutMode && api && canPaginate) {
      navGoPrev();
      return;
    }

    if (!api && !editLayoutMode) return;

    const snapIndex =
      editLayoutMode && !api
        ? activeSlideIndex
        : (api?.selectedScrollSnap() ?? carouselIndex);
    const currentPage = resolvePageIndexForSnap(
      snapIndex,
      count,
      slidesPerView,
      navScrollStep,
      viewportWidth,
    );

    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  }, [
    activeSlideIndex,
    api,
    canPaginate,
    carouselIndex,
    count,
    editLayoutMode,
    editStaticFit,
    goToPage,
    navGoPrev,
    setActiveSlideIndex,
    singleSlideEditView,
    scrollToEditPage,
    slidesPerView,
    navScrollStep,
    viewportWidth,
  ]);

  const goToNext = useCallback(() => {
    if (editLayoutMode && editStaticFit) {
      setActiveSlideIndex((activeSlideIndex + 1) % count);
      return;
    }

    if (editLayoutMode && singleSlideEditView) {
      const nextIndex = (activeSlideIndex + 1) % count;
      setActiveSlideIndex(nextIndex);
      scrollToEditPage(nextIndex, nextIndex);
      return;
    }

    if (!editLayoutMode && api && canPaginate) {
      navGoNext();
      return;
    }

    if (!api && !editLayoutMode) return;

    const snapIndex =
      editLayoutMode && !api
        ? activeSlideIndex
        : (api?.selectedScrollSnap() ?? carouselIndex);
    const currentPage = resolvePageIndexForSnap(
      snapIndex,
      count,
      slidesPerView,
      navScrollStep,
      viewportWidth,
    );
    const maxPage = Math.max(0, editPageCount - 1);

    if (currentPage < maxPage) {
      goToPage(currentPage + 1);
    }
  }, [
    activeSlideIndex,
    api,
    canPaginate,
    carouselIndex,
    count,
    editLayoutMode,
    editPageCount,
    editStaticFit,
    goToPage,
    navGoNext,
    setActiveSlideIndex,
    singleSlideEditView,
    scrollToEditPage,
    slidesPerView,
    navScrollStep,
    viewportWidth,
  ]);

  const isCanvasDragActive = useCallback(
    () => isPreviewCanvasDragActive(rootRef.current),
    [],
  );

  useCarouselEditSwipe({
    enabled: carouselEditPointerSwipeEnabled,
    rootRef,
    onSwipePrev: goToPrev,
    onSwipeNext: goToNext,
    isCanvasDragActive,
    getSnapIndex: () => api?.selectedScrollSnap(),
  });

  useEffect(() => {
    if (!api || editLayoutMode || count === 0) return;
    resetNav();
    api.scrollTo(0, true);
  }, [api, count, editLayoutMode, resetNav, navScrollStep, slidesPerView]);

  useEffect(() => {
    if (!api) return undefined;

    const onSelect = () => {
      const snap = api.selectedScrollSnap();
      setCarouselIndex(snap);

      const ctx = editNavContextRef.current;
      if (ctx.editLayoutMode && !ctx.editStaticFit) {
        const slideIndex = Math.min(Math.max(0, snap), count - 1);
        if (slideIndex !== activeSlideIndexRef.current) {
          setActiveSlideIndex(slideIndex);
        }
      }

      if (navRef.current.shouldSkipSnapSync()) return;

      navRef.current.syncFromSnap(snap);
    };

    const onSettle = () => {
      navRef.current.onSettle();
      navRef.current.syncFromSnap(api.selectedScrollSnap());
    };

    const onReInit = () => {
      setCarouselIndex(api.selectedScrollSnap());

      const ctx = editNavContextRef.current;
      if (ctx.editLayoutMode && ctx.editStaticFit) {
        return;
      }

      if (ctx.editLayoutMode) {
        lastEditScrollRef.current = null;
        scrollToEditSlide(activeSlideIndexRef.current);
      }
    };

    onReInit();
    api.on("select", onSelect);
    api.on("settle", onSettle);
    api.on("reInit", onReInit);

    return () => {
      api.off("select", onSelect);
      api.off("settle", onSettle);
      api.off("reInit", onReInit);
    };
  }, [
    api,
    count,
    scrollToEditSlide,
  ]);

  /** Edit mode: sidebar / strip selection scrolls to the active slide with animation. */
  useLayoutEffect(() => {
    if (!api || !editLayoutMode || count === 0) return;

    if (isPreviewCanvasDragActive(rootRef.current)) return;

    if (editStaticFit) {
      return;
    }

    if (singleSlideEditView) {
      const targetSnap = Math.min(Math.max(0, activeSlideIndex), count - 1);
      if (api.selectedScrollSnap() === targetSnap) {
        return;
      }

      scrollToEditPage(targetSnap, activeSlideIndex);
      return;
    }

    const expectedPage = resolveEditScrollSnapForSlide(
      activeSlideIndex,
      count,
      slidesPerView,
      navScrollStep,
      viewportWidth,
      singleSlideEditView,
    );
    const expectedLeadingSnap = pagePlan.pages[expectedPage]?.leadingSnap ?? 0;

    if (api.selectedScrollSnap() === expectedLeadingSnap) {
      return;
    }

    scrollToEditPage(expectedPage, activeSlideIndex);
  }, [
    activeSlideIndex,
    api,
    count,
    editLayoutMode,
    editStaticFit,
    navScrollStep,
    scrollToEditPage,
    singleSlideEditView,
    slidesPerView,
    viewportWidth,
  ]);

  /** Reset scroll dedupe when slide count or layout preset changes. */
  useEffect(() => {
    lastEditScrollRef.current = null;
  }, [count, navScrollStep, slidesPerView, viewportWidth]);

  /** Clamp when slides are removed or settings change. */
  useEffect(() => {
    if (activeSlideIndex <= count - 1) return;
    setActiveSlideIndex(Math.max(0, count - 1));
  }, [activeSlideIndex, count, setActiveSlideIndex]);

  /** Focus the last slide when one is appended from the sidebar. */
  useEffect(() => {
    if (!editLayoutMode || !id) {
      previousSlideCountRef.current = count;
      return;
    }

    if (count > previousSlideCountRef.current) {
      const newIndex = count - 1;
      lastEditScrollRef.current = null;
      setActiveSlideIndex(newIndex);
    }

    previousSlideCountRef.current = count;
  }, [count, editLayoutMode, id, setActiveSlideIndex]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return undefined;

    const syncViewportWidth = () => {
      const width = root.getBoundingClientRect().width;
      if (width > 0) {
        setViewportWidth((prev) => (prev === width ? prev : width));
      }
    };

    syncViewportWidth();

    const observer = new ResizeObserver(syncViewportWidth);
    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, [count, slidesPerView]);

  useEffect(() => {
    if (!api) return;
    const reInitOpts: Parameters<NonNullable<CarouselApi>["reInit"]>[0] = {
      loop: emblaLoop,
      containScroll: emblaContainScroll,
      slidesToScroll: emblaScroll.slidesToScroll,
      duration: emblaMotion.duration,
    };
    if (canUseCarouselMatchMedia(rootRef.current)) {
      reInitOpts.breakpoints = emblaBreakpoints;
    }
    api.reInit(reInitOpts);
    requestAnimationFrame(() => {
      if (editStaticFit) {
        return;
      }
      if (editLayoutMode) {
        lastEditScrollRef.current = null;
        scrollToEditSlide(activeSlideIndexRef.current);
      }
    });
  }, [
    api,
    editLayoutMode,
    editStaticFit,
    emblaContainScroll,
    emblaLoop,
    emblaBreakpoints,
    emblaMotion.duration,
    navScrollStep,
    scrollToEditSlide,
    slidesPerView,
  ]);

  useEffect(() => {
    if (autoplay !== "on") {
      setIsAutoplayPaused(false);
    }
  }, [autoplay]);

  useEffect(() => {
    if (
      editLayoutMode ||
      autoplay !== "on" ||
      isAutoplayPaused ||
      !api ||
      !pagePlan.canPaginate
    ) {
      return undefined;
    }
    const ms = Math.min(30, Math.max(2, intervalSeconds || 5)) * 1000;
    const timer = window.setInterval(() => goToNext(), ms);
    return () => window.clearInterval(timer);
  }, [
    autoplay,
    editLayoutMode,
    goToNext,
    intervalSeconds,
    isAutoplayPaused,
    api,
    pagePlan.canPaginate,
  ]);

  const handleToggleAutoplayPause = useCallback(() => {
    setIsAutoplayPaused((prev) => !prev);
  }, []);

  useLayoutEffect(() => {
    if (!editLayoutMode) return;
    syncPuckOverlay();
  }, [activeSlideIndex, editLayoutMode, syncPuckOverlay]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || hasFixedHeight) return undefined;

    let rafId = 0;
    let lastSyncedHeight = -1;
    let lastPerSlideHeights: number[] = [];
    let lastObservedWidth = -1;
    let lastObservedHeight = -1;

    const clearRowHeightSync = () => {
      if (!rootRef.current) return;
      rootRef.current.classList.remove("nexus-carousel--row-height-sync");
      rootRef.current.style.removeProperty("--nexus-carousel-row-height");
      lastSyncedHeight = -1;
    };

    const clearPerSlideHeightSync = () => {
      if (!rootRef.current) return;
      rootRef.current.classList.remove("nexus-carousel--per-slide-height-sync");
      rootRef.current
        .querySelectorAll<HTMLElement>(".nexus-carousel__slide")
        .forEach((slide) => {
          slide.style.removeProperty("--nexus-carousel-slide-height");
        });
      lastPerSlideHeights = [];
    };

    /** Grid-in-slide carousels skip row sync only (per-slide edit measures grids intrinsically). */
    const shouldSkipRowHeightSync = () => {
      if (!rootRef.current) return false;
      if (editLayoutMode) return false;
      return Boolean(
        rootRef.current.querySelector(".nexus-carousel__slide .nexus-grid"),
      );
    };

    const syncCarouselRowHeight = () => {
      if (!rootRef.current) return;
      if (editLayoutMode && isPreviewCanvasDragActive(rootRef.current)) return;

      const rootEl = rootRef.current;

      const inGridCell = Boolean(rootEl.closest(".nexus-grid-item"));
      rootEl.classList.toggle("nexus-carousel--in-grid-cell", inGridCell);

      const slideEls = rootEl.querySelectorAll<HTMLElement>(".nexus-carousel__slide");
      const hasGridSlide = Array.from(slideEls).some((slide) =>
        Boolean(slide.querySelector(".nexus-grid")),
      );
      rootEl.classList.toggle("nexus-carousel--has-grid-slide", hasGridSlide);

      const allFillOnly =
        slideEls.length > 0 &&
        Array.from(slideEls).every((slide) => slideContainsOnlyFillMedia(slide));
      rootEl.classList.toggle("nexus-carousel--all-fill-only", allFillOnly);

      const measuredRootWidth = rootEl.getBoundingClientRect().width;
      const measuredVisibleCount = Math.max(
        1,
        resolveVisibleSlideCountAtWidth(slidesPerView, measuredRootWidth || viewportWidth),
      );

      /**
       * Multi-slide interactive + multi-slide edit — CSS flex stretch only (adaptive height).
       * Single-visible interactive keeps row sync below (active slide only).
       */
      const useCssEqualRowHeight =
        measuredVisibleCount >= 2 && (!editLayoutMode || !singleSlideEditView);

      if (useCssEqualRowHeight) {
        clearRowHeightSync();
        clearPerSlideHeightSync();
        if (editLayoutMode) {
          requestAnimationFrame(() => syncPuckOverlay());
        }
        return;
      }

      /** Published phone + single-slide edit — viewport follows active slide, not the tallest off-screen sibling. */
      const measureActiveSlideOnly =
        (!editLayoutMode && measuredVisibleCount === 1) ||
        (editLayoutMode && singleSlideEditView);

      /** Single-slide edit — per-slide height on the active card only. */
      if (editLayoutMode && singleSlideEditView) {
        clearRowHeightSync();
        rootEl.classList.add("nexus-carousel--per-slide-height-sync");

        const fallbackFillWidthPx = singleSlideEditView
          ? measuredRootWidth
          : measuredRootWidth / measuredVisibleCount;

        const activeIndex = Math.min(
          Math.max(0, activeSlideIndexRef.current),
          Math.max(0, slideEls.length - 1),
        );

        const slideIndicesToSync = singleSlideEditView
          ? [activeIndex]
          : Array.from({ length: slideEls.length }, (_, index) => index);

        let heightsChanged = false;

        slideEls.forEach((slide, idx) => {
          const grid = slide.querySelector<HTMLElement>(".nexus-grid");

          if (grid) {
            slide.style.removeProperty("--nexus-carousel-slide-height");
            if (lastPerSlideHeights[idx] !== -1) {
              heightsChanged = true;
            }
            lastPerSlideHeights[idx] = -1;
            return;
          }

          if (!slideIndicesToSync.includes(idx)) {
            slide.style.removeProperty("--nexus-carousel-slide-height");
            if (lastPerSlideHeights[idx] !== -1) {
              heightsChanged = true;
            }
            lastPerSlideHeights[idx] = -1;
            return;
          }

          const slideWidthPx = slide.getBoundingClientRect().width;
          const slideFloorPx = resolveCarouselEditSlideFloorPx(slideWidthPx, autoMinHeightPx);
          let slideHeightPx = Math.max(
            slideFloorPx,
            measureSlideNaturalHeightDetached(slide, slideFloorPx, fallbackFillWidthPx),
          );

          if (maxHeightCapPx !== undefined && Number.isFinite(maxHeightCapPx)) {
            slideHeightPx = Math.min(slideHeightPx, maxHeightCapPx);
          }

          slideHeightPx = Math.max(slideHeightPx, CAROUSEL_EDIT_ROW_MIN_HEIGHT_PX);

          if (lastPerSlideHeights[idx] !== slideHeightPx) {
            heightsChanged = true;
          }
          lastPerSlideHeights[idx] = slideHeightPx;
          slide.style.setProperty("--nexus-carousel-slide-height", `${slideHeightPx}px`);
        });

        if (heightsChanged) {
          requestAnimationFrame(() => {
            syncPuckOverlay();
            requestAnimationFrame(() => syncPuckOverlay());
          });
        }
        return;
      }

      clearPerSlideHeightSync();

      if (slideEls.length === 0) {
        clearRowHeightSync();
        return;
      }

      const fallbackFillWidthPx = measureActiveSlideOnly
        ? measuredRootWidth
        : measuredRootWidth / measuredVisibleCount;

      const activeIndex = Math.min(
        Math.max(
          0,
          editLayoutMode ? activeSlideIndexRef.current : carouselIndexRef.current,
        ),
        slideEls.length - 1,
      );

      const slidesToMeasure =
        measureActiveSlideOnly && slideEls.length > 0
          ? [slideEls[activeIndex] as HTMLElement]
          : Array.from(slideEls);

      let rowHeightPx = autoMinHeightPx;
      slidesToMeasure.forEach((slide) => {
        const slideWidthPx = slide.getBoundingClientRect().width;
        const slideFloorPx = editLayoutMode
          ? resolveCarouselEditSlideFloorPx(slideWidthPx, autoMinHeightPx)
          : autoMinHeightPx;
        rowHeightPx = Math.max(
          rowHeightPx,
          measureSlideNaturalHeightDetached(slide, slideFloorPx, fallbackFillWidthPx),
        );
      });

      if (maxHeightCapPx !== undefined && Number.isFinite(maxHeightCapPx)) {
        rowHeightPx = Math.min(rowHeightPx, maxHeightCapPx);
      }

      if (editLayoutMode) {
        rowHeightPx = Math.max(rowHeightPx, CAROUSEL_EDIT_ROW_MIN_HEIGHT_PX);
      }

      if (rowHeightPx === lastSyncedHeight) {
        return;
      }
      lastSyncedHeight = rowHeightPx;

      rootEl.classList.add("nexus-carousel--row-height-sync");
      rootEl.style.setProperty("--nexus-carousel-row-height", `${rowHeightPx}px`);

      if (editLayoutMode) syncPuckOverlay();
    };

    const scheduleRowHeightSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncCarouselRowHeight);
    };

    scheduleRowHeightSync();

    const observer = new ResizeObserver((entries) => {
      if (shouldSkipRowHeightSync()) return;

      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (
        width > 0 &&
        lastObservedWidth > 0 &&
        Math.abs(width - lastObservedWidth) < 1 &&
        height > 0 &&
        lastObservedHeight > 0 &&
        Math.abs(height - lastObservedHeight) < 1 &&
        (rootRef.current?.classList.contains("nexus-carousel--row-height-sync") ||
          rootRef.current?.classList.contains("nexus-carousel--per-slide-height-sync"))
      ) {
        return;
      }
      if (width > 0) {
        lastObservedWidth = width;
      }
      if (height > 0) {
        lastObservedHeight = height;
      }
      scheduleRowHeightSync();
    });
    observer.observe(root);

    const mutationObserver = new MutationObserver(() => {
      if (shouldSkipRowHeightSync()) return;
      scheduleRowHeightSync();
    });
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      mutationObserver.disconnect();
      clearRowHeightSync();
      clearPerSlideHeightSync();
    };
  }, [
    activeSlideIndex,
    autoMinHeightPx,
    carouselIndex,
    count,
    editLayoutMode,
    hasFixedHeight,
    maxHeightCapPx,
    slidesPerView,
    singleSlideEditView,
    syncPuckOverlay,
    viewportWidth,
  ]);

  /**
   * Activate a slide when clicking its card in edit mode.
   *
   * @param slideIndex - Zero-based slide index.
   * @param event - Click on the slide shell.
   */
  const handleSlideActivate = useCallback(
    (slideIndex: number, event: ReactMouseEvent<HTMLDivElement>) => {
      if (!editLayoutMode) return;
      if (isPreviewCanvasDragActive(rootRef.current)) return;

      const target = event.target as HTMLElement;
      if (
        target.closest(
          ".nexus-carousel__arrow, .nexus-carousel__dot, .nexus-carousel__edit-select, .nexus-carousel__autoplay-toggle",
        )
      ) {
        return;
      }

      const nestedComponent = target.closest("[data-puck-component]");
      const carouselComponent = rootRef.current?.closest("[data-puck-component]");
      if (
        nestedComponent &&
        carouselComponent &&
        nestedComponent !== carouselComponent
      ) {
        return;
      }

      event.stopPropagation();

      if (slideIndex === activeSlideIndex) return;

      setActiveSlideIndex(slideIndex);
    },
    [activeSlideIndex, editLayoutMode, setActiveSlideIndex],
  );

  /**
   * Select the carousel block when clicking chrome that is not a nested Puck block.
   *
   * @param event - Click on the carousel root shell.
   */
  const handleCarouselShellClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!editLayoutMode || !onSelectCarousel) return;

      const target = event.target as HTMLElement;
      if (target.closest("[data-puck-overlay-portal]")) return;
      if (target.closest(".nexus-carousel__edit-select")) return;
      if (
        target.closest(
          ".nexus-carousel__arrow, .nexus-carousel__dot, .nexus-carousel__autoplay-toggle",
        )
      ) {
        return;
      }

      const nestedComponent = target.closest("[data-puck-component]");
      const carouselComponent = rootRef.current?.closest("[data-puck-component]");
      if (
        nestedComponent &&
        carouselComponent &&
        nestedComponent !== carouselComponent
      ) {
        return;
      }

      if (target.closest("[data-puck-dropzone]")) {
        return;
      }

      event.stopPropagation();
      onSelectCarousel();
    },
    [editLayoutMode, onSelectCarousel],
  );

  if (!count) {
    return (
      <div className="nexus-carousel nexus-carousel--empty">
        <p>Add slides in the sidebar to build your carousel.</p>
      </div>
    );
  }

  const showNavigation = editLayoutMode ? count > 1 : canPaginate;
  const hasCarouselControls =
    showNavigation && (showArrows === "yes" || showDots === "yes");
  const showAutoplayToggle =
    autoplay === "on" && !editLayoutMode && canPaginate && count > 1;
  const showControlsShell = hasCarouselControls || showAutoplayToggle;
  const leadingSnapIndex =
    editLayoutMode && (singleSlideEditView || editStaticFit || !api)
      ? activeSlideIndex
      : carouselIndex;
  const controlsIndex =
    !editLayoutMode && canPaginate
      ? navPageIndex
      : resolvePageIndexForSnap(
          leadingSnapIndex,
          count,
          slidesPerView,
          navScrollStep,
          paginationViewportWidth,
        );

  return (
    <div
      ref={rootRef}
      className={cn(
        "nexus-carousel",
        slideSpvClass,
        useSingleFrame ? "nexus-carousel--single-frame" : "nexus-carousel--multi-slide",
        editLayoutMode ? "nexus-carousel--edit" : "nexus-carousel--interactive",
        emblaLoop && "nexus-carousel--loop",
        !emblaLoop && "nexus-carousel--no-loop",
        singleSlideEditView && "nexus-carousel--edit-single-slide",
        singleVisibleLayout && "nexus-carousel--single-visible",
        equalRowLayout && "nexus-carousel--equal-row-height",
        editStaticFit && "nexus-carousel--edit-static-fit",
        staticFit && "nexus-carousel--static-fit",
        multiSlideEditWysiwyg && "nexus-carousel--edit-wysiwyg",
        editLayoutMode && hasCarouselControls && "nexus-carousel--edit-nav",
        hasFixedHeight && "nexus-carousel--fixed-height",
        hasMaxHeightCap && "nexus-carousel--max-height",
      )}
      style={carouselSizeStyle}
      aria-roledescription="carousel"
      aria-label="Content carousel"
      onClick={handleCarouselShellClick}
    >
      <div className="nexus-carousel__swipe-host min-w-0 w-full">
      <Carousel
        key={`${editLayoutMode ? "edit" : "iview"}-${slidesPerView}-${navScrollStep}-${count}`}
        setApi={setApi}
        opts={{
          loop: emblaLoop,
          align: "start",
          containScroll: emblaContainScroll,
          watchDrag: editLayoutMode
            ? emblaEditDragEnabled
              ? (_embla, event) =>
                  shouldAllowCarouselEditEmblaDrag(
                    event.target,
                    rootRef.current,
                    isPreviewCanvasDragActive(rootRef.current),
                  )
              : false
            : true,
          slidesToScroll: emblaScroll.slidesToScroll,
          breakpoints: emblaBreakpoints,
          duration: emblaMotion.duration,
        }}
        className={cn(
          "nexus-carousel__viewport w-full",
          hasFixedHeight && "nexus-carousel__viewport--fixed",
        )}
        style={
          hasFixedHeight && resolvedHeight
            ? { minHeight: resolvedHeight }
            : undefined
        }
      >
        <CarouselContent
          className={cn(
            "ml-0 flex flex-nowrap",
            (hasFixedHeight || equalRowLayout) && "items-stretch",
            hasFixedHeight && "nexus-carousel__track--fixed h-full",
            editLayoutMode && "nexus-carousel__track--edit",
          )}
        >
          {slides.map((slide, idx) => {
            return (
              <CarouselItem
                key={idx}
                className={cn(
                  "pl-0",
                  (hasFixedHeight || equalRowLayout) && "h-full self-stretch",
                )}
              >
                <div
                  className={cn(
                    "nexus-carousel__slide",
                    hasFixedHeight && "nexus-carousel__slide--fixed",
                    editLayoutMode &&
                      idx === activeSlideIndex &&
                      "nexus-carousel__slide--active-edit",
                    singleSlideEditView &&
                      idx !== activeSlideIndex &&
                      "nexus-carousel__slide--inactive-edit",
                  )}
                  aria-hidden={singleSlideEditView ? idx !== activeSlideIndex : undefined}
                  onClick={editLayoutMode ? (event) => handleSlideActivate(idx, event) : undefined}
                >
                  <CarouselSlideMediaProvider>
                    {renderSlideContent(
                      slide.content,
                      editLayoutMode,
                      editDropZoneMinHeightPx,
                    )}
                  </CarouselSlideMediaProvider>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      </div>

      {showControlsShell ? (
        <CarouselControls
          showArrows={showArrows}
          showDots={showDots}
          showNavigation={showNavigation}
          activeIndex={controlsIndex}
          pageCount={pageCount}
          onPrev={goToPrev}
          onNext={goToNext}
          onGoTo={goToPage}
          controlsPortalRef={controlsPortalRef}
          navUnit={pageCount === count ? "slide" : "page"}
          onSelectCarousel={editLayoutMode ? onSelectCarousel : undefined}
          showAutoplayToggle={showAutoplayToggle}
          isAutoplayPaused={isAutoplayPaused}
          onToggleAutoplayPause={handleToggleAutoplayPause}
        />
      ) : null}
    </div>
  );
}

/**
 * Puck editor shell — subscribes to Puck store hooks (must render inside `<Puck>`).
 *
 * @param props - Carousel configuration from the block render.
 * @returns Carousel with edit or interactive preview layout.
 */
function NexusCarouselEditorShell(props: NexusCarouselRenderProps) {
  const previewMode = usePuckPreviewMode();
  const editLayoutMode = previewMode !== "interactive";
  const getPuck = useGetPuck();
  const controlsPortalRef = usePuckOverlayPortalRef(
    editLayoutMode && (props.slides?.length ?? 0) > 1,
  );

  const selectCarousel = useCallback(() => {
    selectPuckComponentById(getPuck(), props.id);
  }, [getPuck, props.id]);

  usePuckArrayOpenStripSync(props.id, "slides", editLayoutMode);

  return (
    <NexusCarouselBody
      {...props}
      editLayoutMode={editLayoutMode}
      controlsPortalRef={controlsPortalRef}
      getPuck={getPuck}
      onSelectCarousel={selectCarousel}
    />
  );
}

/**
 * Static / published carousel — no Puck store hooks (safe inside `<Render>`).
 *
 * @param props - Carousel configuration from the block render.
 * @returns Embla carousel for the public site.
 */
function NexusCarouselView(props: NexusCarouselRenderProps) {
  const controlsPortalRef = useNoopPortalRef();

  return (
    <NexusCarouselBody
      {...props}
      editLayoutMode={false}
      controlsPortalRef={controlsPortalRef}
    />
  );
}

/**
 * Content carousel entry — routes to editor or static render based on Puck context.
 *
 * @param props - Carousel configuration.
 * @returns Carousel UI.
 */
export function NexusCarouselRender(props: NexusCarouselRenderProps) {
  if (props.puck?.isEditing) {
    return <NexusCarouselEditorShell {...props} />;
  }

  return <NexusCarouselView {...props} />;
}

export default NexusCarouselRender;
