"use client";

/**
 * @fileoverview Carousel render — Embla in view/interactive modes; strip-style single panel in edit mode.
 *
 * @module src/components/puck/blocks/content/NexusCarouselRender
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Settings2 } from "lucide-react";
import { useGetPuck } from "@measured/puck";
import { useNexusPuck, usePuckPreviewMode } from "../../lib/useNexusPuck";
import { selectPuckComponentById } from "../../lib/selectPuckComponentById";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  resolveCarouselBorderRadius,
  resolveCarouselHeight,
  resolveCarouselMinEmptyHeightPx,
  CAROUSEL_AUTO_MIN_HEIGHT_PX,
} from "../../fields/CarouselDimensionFields";
import { cn } from "@/lib/utils";
import { usePuckOverlayPortalRef } from "../../lib/usePuckOverlayPortal";
import { useStripActiveIndex } from "../../lib/useStripActiveIndex";
import { usePuckArrayOpenStripSync } from "../../lib/usePuckArrayOpenStripSync";
import {
  resolveCarouselEmblaScrollOptions,
  resolveCarouselScrollSnapCount,
  resolveEditScrollSnapForSlide,
  resolveFirstSlideIndexForPage,
  resolvePageIndexForSlide,
  resolveVisibleSlideCountAtWidth,
} from "../../lib/carouselEmblaOptions";
import {
  CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  measureFillSlideComponentHeight,
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
  syncPuckOverlay: () => void;
  onSelectCarousel?: () => void;
}

/** No-op portal ref for published / static render (outside Puck editor). */
function useNoopPortalRef() {
  return useCallback((_node: HTMLElement | null) => undefined, []);
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
    const fillRoot = component.querySelector<HTMLElement>(`.${CAROUSEL_SLIDE_MEDIA_FILL_CLASS}`);
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
  useEmblaButtons?: boolean;
  /** Whether dots represent individual slides or scroll snap pages. */
  dotUnit?: "slide" | "page";
  /** When set, renders a gear button under the next arrow (edit mode). */
  onSelectCarousel?: () => void;
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
  useEmblaButtons = false,
  dotUnit = "page",
  onSelectCarousel,
}: CarouselControlsProps) {
  const hasCarouselControls =
    showNavigation && (showArrows === "yes" || showDots === "yes");

  if (!hasCarouselControls) return null;

  return (
    <div ref={controlsPortalRef} className="nexus-carousel__controls">
      {showArrows === "yes" && showNavigation ? (
        useEmblaButtons ? (
          <>
            <CarouselPrevious
              variant="outline"
              size="icon"
              className={cn(
                "nexus-carousel__arrow nexus-carousel__arrow--prev",
                "left-3 top-1/2 -translate-y-1/2 border-border bg-background/70",
              )}
            />
            <CarouselNext
              variant="outline"
              size="icon"
              className={cn(
                "nexus-carousel__arrow nexus-carousel__arrow--next",
                "right-3 top-1/2 -translate-y-1/2 border-border bg-background/70",
              )}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              className="nexus-carousel__arrow nexus-carousel__arrow--prev"
              aria-label="Previous slide"
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
              aria-label="Next slide"
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
        )
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
                dotUnit === "slide" ? `Go to slide ${idx + 1}` : `Go to page ${idx + 1}`
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
  syncPuckOverlay,
  onSelectCarousel,
}: NexusCarouselBodyProps) {
  const count = slides.length;
  const rootRef = useRef<HTMLDivElement>(null);

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

  const [api, setApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  const singleSlideEditView =
    editLayoutMode &&
    (slidesPerView === "1" || (slidesPerView === "auto" && viewportWidth < 768));
  /** Multi-slide edit — WYSIWYG layout with CSS-pinned track when all slides fit. */
  const multiSlideEditWysiwyg = editLayoutMode && !singleSlideEditView;
  const [scrollSnapCount, setScrollSnapCount] = useState(() =>
    resolveCarouselScrollSnapCount(count, slidesPerView ?? "auto", scrollStep ?? "1", viewportWidth),
  );

  const resolvedHeight = resolveCarouselHeight(height, heightCustom);
  const resolvedBorderRadius = resolveCarouselBorderRadius(borderRadius, borderRadiusCustom);
  const hasFixedHeight = Boolean(resolvedHeight);
  const autoMinHeightPx = hasFixedHeight
    ? resolveCarouselMinEmptyHeightPx(resolvedHeight, CAROUSEL_AUTO_MIN_HEIGHT_PX)
    : CAROUSEL_AUTO_MIN_HEIGHT_PX;

  const slideSpvClass = resolveSlidesPerViewClass(slidesPerView);
  const useSingleFrame = slidesPerView === "1";
  const emblaScroll = resolveCarouselEmblaScrollOptions(scrollStep, slidesPerView);

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
  };

  const goToSnap = useCallback(
    (snapIndex: number) => {
      if (!api) return;
      api.scrollTo(snapIndex);
    },
    [api],
  );

  const estimatedSnapCount = resolveCarouselScrollSnapCount(
    count,
    slidesPerView,
    scrollStep,
    viewportWidth,
  );
  const pageCount = editLayoutMode
    ? estimatedSnapCount
    : Math.max(scrollSnapCount, estimatedSnapCount);
  const visibleSlideCount = resolveVisibleSlideCountAtWidth(slidesPerView, viewportWidth);
  const allSlidesFitInView = count <= visibleSlideCount;
  /** All slides visible at once — lock Embla transform so drop zones stay on screen. */
  const editStaticFit = multiSlideEditWysiwyg && allSlidesFitInView;
  const emblaLoop = !editLayoutMode && pageCount > 1;

  const scrollToEditPage = useCallback(
    (pageIndex: number, slideIndex: number) => {
      if (!api || count === 0 || editStaticFit) return;

      const maxPage = Math.max(0, pageCount - 1);
      const clampedPage = Math.min(Math.max(0, pageIndex), maxPage);

      if (singleSlideEditView) {
        return;
      }

      if (
        lastEditScrollRef.current?.slideIndex === slideIndex &&
        lastEditScrollRef.current?.snap === clampedPage &&
        api.selectedScrollSnap() === clampedPage
      ) {
        return;
      }

      api.scrollTo(clampedPage, true);
      lastEditScrollRef.current = { slideIndex, snap: clampedPage };
    },
    [api, count, editStaticFit, pageCount, singleSlideEditView],
  );

  const scrollToEditSlide = useCallback(
    (slideIndex: number) => {
      if (!api || count === 0 || editStaticFit) return;

      const snap = resolveEditScrollSnapForSlide(
        slideIndex,
        count,
        slidesPerView,
        scrollStep,
        viewportWidth,
        singleSlideEditView,
      );
      scrollToEditPage(snap, slideIndex);
    },
    [
      api,
      count,
      editStaticFit,
      scrollStep,
      scrollToEditPage,
      singleSlideEditView,
      slidesPerView,
      viewportWidth,
    ],
  );

  const goToPage = useCallback(
    (pageIndex: number) => {
      const maxPage = Math.max(0, pageCount - 1);
      const clampedPage = Math.min(Math.max(0, pageIndex), maxPage);
      const slideIndex = resolveFirstSlideIndexForPage(
        clampedPage,
        count,
        slidesPerView,
        scrollStep,
        viewportWidth,
      );

      if (editLayoutMode) {
        setActiveSlideIndex(slideIndex);
        if (!editStaticFit && !singleSlideEditView) {
          scrollToEditPage(clampedPage, slideIndex);
        }
        return;
      }

      goToSnap(clampedPage);
    },
    [
      count,
      editLayoutMode,
      editStaticFit,
      goToSnap,
      pageCount,
      scrollStep,
      scrollToEditPage,
      setActiveSlideIndex,
      singleSlideEditView,
      slidesPerView,
      viewportWidth,
    ],
  );

  const goToPrev = useCallback(() => {
    if (editLayoutMode) {
      if (editStaticFit || singleSlideEditView) {
        setActiveSlideIndex(((activeSlideIndex - 1) % count + count) % count);
        return;
      }

      const currentPage =
        api?.selectedScrollSnap() ??
        resolvePageIndexForSlide(
          activeSlideIndex,
          count,
          slidesPerView,
          scrollStep,
          viewportWidth,
        );
      if (currentPage > 0) {
        goToPage(currentPage - 1);
      }
      return;
    }

    if (!api) return;

    api.scrollPrev();
  }, [
    activeSlideIndex,
    api,
    count,
    editLayoutMode,
    editStaticFit,
    goToPage,
    scrollStep,
    setActiveSlideIndex,
    singleSlideEditView,
    slidesPerView,
    viewportWidth,
  ]);

  const goToNext = useCallback(() => {
    if (editLayoutMode) {
      if (editStaticFit || singleSlideEditView) {
        setActiveSlideIndex((activeSlideIndex + 1) % count);
        return;
      }

      const currentPage =
        api?.selectedScrollSnap() ??
        resolvePageIndexForSlide(
          activeSlideIndex,
          count,
          slidesPerView,
          scrollStep,
          viewportWidth,
        );
      const maxPage = Math.max(0, pageCount - 1);
      if (currentPage < maxPage) {
        goToPage(currentPage + 1);
      }
      return;
    }

    if (!api) return;

    api.scrollNext();
  }, [
    activeSlideIndex,
    api,
    count,
    editLayoutMode,
    editStaticFit,
    goToPage,
    pageCount,
    scrollStep,
    setActiveSlideIndex,
    singleSlideEditView,
    slidesPerView,
    viewportWidth,
  ]);

  useEffect(() => {
    if (!api) return undefined;

    const onSelect = () => {
      setCarouselIndex(api.selectedScrollSnap());
    };

    const onReInit = () => {
      setScrollSnapCount(api.scrollSnapList().length);
      setCarouselIndex(api.selectedScrollSnap());

      if (editLayoutMode && editStaticFit) {
        return;
      }

      if (editLayoutMode && multiSlideEditWysiwyg && !singleSlideEditView) {
        lastEditScrollRef.current = null;
        scrollToEditSlide(activeSlideIndexRef.current);
      }
    };

    onReInit();
    api.on("select", onSelect);
    api.on("reInit", onReInit);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onReInit);
    };
  }, [
    api,
    editLayoutMode,
    editStaticFit,
    multiSlideEditWysiwyg,
    scrollToEditSlide,
    singleSlideEditView,
  ]);

  /** Edit mode: sidebar / strip selection scrolls to the page that contains the active slide. */
  useLayoutEffect(() => {
    if (!api || !editLayoutMode || count === 0) return;

    if (singleSlideEditView || editStaticFit) {
      return;
    }

    const expectedPage = resolveEditScrollSnapForSlide(
      activeSlideIndex,
      count,
      slidesPerView,
      scrollStep,
      viewportWidth,
      singleSlideEditView,
    );

    if (api.selectedScrollSnap() === expectedPage) {
      return;
    }

    scrollToEditPage(expectedPage, activeSlideIndex);
  }, [
    activeSlideIndex,
    api,
    count,
    editLayoutMode,
    editStaticFit,
    scrollStep,
    scrollToEditPage,
    singleSlideEditView,
    slidesPerView,
    viewportWidth,
  ]);

  /** Reset scroll dedupe when slide count or layout preset changes. */
  useEffect(() => {
    lastEditScrollRef.current = null;
  }, [count, scrollStep, slidesPerView, viewportWidth]);

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return undefined;

    const syncViewportWidth = () => {
      const width = root.getBoundingClientRect().width;
      if (width > 0) {
        setViewportWidth(width);
      }
    };

    syncViewportWidth();

    const observer = new ResizeObserver(syncViewportWidth);
    observer.observe(root);
    window.addEventListener("resize", syncViewportWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncViewportWidth);
    };
  }, []);

  useEffect(() => {
    if (api) return;
    setScrollSnapCount(
      resolveCarouselScrollSnapCount(count, slidesPerView, scrollStep, viewportWidth),
    );
  }, [api, count, scrollStep, slidesPerView, viewportWidth]);

  useEffect(() => {
    if (!api) return;
    api.reInit({
      loop: emblaLoop,
      slidesToScroll: emblaScroll.slidesToScroll,
      breakpoints: emblaScroll.breakpoints,
    });
    requestAnimationFrame(() => {
      if (editStaticFit) {
        return;
      }
      if (editLayoutMode && multiSlideEditWysiwyg && !singleSlideEditView) {
        lastEditScrollRef.current = null;
        scrollToEditSlide(activeSlideIndexRef.current);
      }
    });
  }, [
    api,
    editLayoutMode,
    editStaticFit,
    emblaLoop,
    emblaScroll,
    multiSlideEditWysiwyg,
    scrollStep,
    scrollToEditSlide,
    singleSlideEditView,
    slidesPerView,
  ]);

  useEffect(() => {
    if (editLayoutMode || autoplay !== "on" || count <= 1 || !api) return undefined;
    const ms = Math.min(30, Math.max(2, intervalSeconds || 5)) * 1000;
    const timer = window.setInterval(() => api.scrollNext(), ms);
    return () => window.clearInterval(timer);
  }, [autoplay, count, editLayoutMode, intervalSeconds, api]);

  useLayoutEffect(() => {
    if (!editLayoutMode) return;
    syncPuckOverlay();
  }, [activeSlideIndex, editLayoutMode, syncPuckOverlay]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    if (!editLayoutMode) {
      root.style.removeProperty("--nexus-carousel-edit-height");
      return undefined;
    }

    let rafId = 0;
    let lastSyncedHeight = -1;

    const syncEditTrackHeight = () => {
      if (!rootRef.current) return;

      const rootWidth = rootRef.current.getBoundingClientRect().width;
      const visibleSlideCount = Math.max(
        1,
        resolveVisibleSlideCountAtWidth(slidesPerView, rootWidth || viewportWidth),
      );
      const fallbackFillWidthPx = singleSlideEditView
        ? rootWidth
        : rootWidth / visibleSlideCount;

      const slideEls = rootRef.current.querySelectorAll<HTMLElement>(".nexus-carousel__slide");
      let maxHeight = autoMinHeightPx;
      slideEls.forEach((slide) => {
        maxHeight = Math.max(
          maxHeight,
          measureSlideNaturalHeight(slide, autoMinHeightPx, fallbackFillWidthPx),
        );
      });

      if (maxHeight === lastSyncedHeight) return;
      lastSyncedHeight = maxHeight;

      rootRef.current.style.setProperty("--nexus-carousel-edit-height", `${maxHeight}px`);
      syncPuckOverlay();
    };

    const scheduleSyncEditTrackHeight = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncEditTrackHeight);
    };

    scheduleSyncEditTrackHeight();

    const observer = new ResizeObserver(scheduleSyncEditTrackHeight);
    observer.observe(root);
    root.querySelectorAll(".nexus-carousel__slide, [data-puck-dropzone]").forEach((node) => {
      observer.observe(node);
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [
    autoMinHeightPx,
    count,
    editLayoutMode,
    singleSlideEditView,
    slidesPerView,
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

      const target = event.target as HTMLElement;
      if (target.closest(".nexus-carousel__arrow, .nexus-carousel__dot, .nexus-carousel__edit-select")) {
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
      if (target.closest(".nexus-carousel__arrow, .nexus-carousel__dot")) return;

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

  const showNavigation = count > 1;
  const hasCarouselControls =
    showNavigation && (showArrows === "yes" || showDots === "yes");
  const controlsIndex = editLayoutMode
    ? editStaticFit || singleSlideEditView || !api
      ? singleSlideEditView
        ? activeSlideIndex
        : resolvePageIndexForSlide(
            activeSlideIndex,
            count,
            slidesPerView,
            scrollStep,
            viewportWidth,
          )
      : carouselIndex
    : carouselIndex;

  return (
    <div
      ref={rootRef}
      className={cn(
        "nexus-carousel",
        slideSpvClass,
        useSingleFrame ? "nexus-carousel--single-frame" : "nexus-carousel--multi-slide",
        editLayoutMode ? "nexus-carousel--edit" : "nexus-carousel--interactive",
        singleSlideEditView && "nexus-carousel--edit-single-slide",
        editStaticFit && "nexus-carousel--edit-static-fit",
        multiSlideEditWysiwyg && "nexus-carousel--edit-wysiwyg",
        editLayoutMode && hasCarouselControls && "nexus-carousel--edit-nav",
        hasFixedHeight && "nexus-carousel--fixed-height",
      )}
      style={carouselSizeStyle}
      aria-roledescription="carousel"
      aria-label="Content carousel"
      onClick={handleCarouselShellClick}
    >
      <Carousel
        key={editLayoutMode ? `${slidesPerView}-${scrollStep}-${count}` : undefined}
        setApi={setApi}
        opts={{
          loop: emblaLoop,
          align: "start",
          containScroll: "trimSnaps",
          watchDrag: !editLayoutMode,
          slidesToScroll: emblaScroll.slidesToScroll,
          breakpoints: emblaScroll.breakpoints,
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
            "ml-0",
            (hasFixedHeight || editLayoutMode) && "items-stretch",
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
                  editLayoutMode && "self-stretch",
                  hasFixedHeight && "h-full self-stretch",
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
                  {renderSlideContent(slide.content, editLayoutMode, autoMinHeightPx)}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {hasCarouselControls ? (
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
            useEmblaButtons={Boolean(api) && !editLayoutMode}
            dotUnit="page"
            onSelectCarousel={editLayoutMode ? onSelectCarousel : undefined}
          />
        ) : null}
      </Carousel>
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

  const syncPuckOverlay = useCallback(() => {
    const componentId = props.id;
    if (!editLayoutMode || !componentId) return;

    requestAnimationFrame(() => {
      const store = getPuck() as {
        nodes?: { nodes: Record<string, { methods?: { sync?: () => void } } | undefined> };
      };
      store.nodes?.nodes[componentId]?.methods?.sync?.();
    });
  }, [editLayoutMode, getPuck, props.id]);

  const selectCarousel = useCallback(() => {
    selectPuckComponentById(getPuck(), props.id);
  }, [getPuck, props.id]);

  usePuckArrayOpenStripSync(props.id, "slides", editLayoutMode);

  return (
    <NexusCarouselBody
      {...props}
      editLayoutMode={editLayoutMode}
      controlsPortalRef={controlsPortalRef}
      syncPuckOverlay={syncPuckOverlay}
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
      syncPuckOverlay={() => undefined}
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
