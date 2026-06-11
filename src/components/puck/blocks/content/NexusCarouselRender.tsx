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
} from "react";
import { useGetPuck } from "@measured/puck";
import { usePuckPreviewMode } from "../../lib/useNexusPuck";
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
  editorActiveIndex?: number;
  puck?: { isEditing?: boolean };
}

/** Internal props for the shared carousel body. */
interface NexusCarouselBodyProps extends NexusCarouselRenderProps {
  editLayoutMode: boolean;
  controlsPortalRef: (node: HTMLElement | null) => void;
  syncPuckOverlay: () => void;
}

/** No-op portal ref for published / static render (outside Puck editor). */
function useNoopPortalRef() {
  return useCallback((_node: HTMLElement | null) => undefined, []);
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
 * @param minEmptyHeightPx - Minimum empty drop zone height in pixels (Puck requires a number).
 * @param editLayoutMode - Whether strip-style edit layout is active.
 * @returns Slide content drop zone or empty hint.
 */
function renderSlideContent(
  Content: SlideContentComponent | undefined,
  minEmptyHeightPx: number,
  editLayoutMode: boolean,
) {
  if (typeof Content !== "function") {
    return (
      <p className="nexus-carousel__empty-hint">
        Drag blocks from the sidebar into this slide.
      </p>
    );
  }

  return (
    <Content
      minEmptyHeight={minEmptyHeightPx}
      className="nexus-carousel__dropzone"
      style={
        editLayoutMode
          ? {
              padding: "12px",
              boxSizing: "border-box",
              minHeight: minEmptyHeightPx,
            }
          : undefined
      }
    />
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
              onClick={onPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="nexus-carousel__arrow nexus-carousel__arrow--next"
              aria-label="Next slide"
              onClick={onNext}
            >
              ›
            </button>
          </>
        )
      ) : null}

      {showDots === "yes" && showNavigation ? (
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
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => onGoTo(idx)}
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
  editorActiveIndex,
  editLayoutMode,
  controlsPortalRef,
  syncPuckOverlay,
}: NexusCarouselBodyProps) {
  const count = slides.length;
  const rootRef = useRef<HTMLDivElement>(null);

  const [activeSlideIndex, setActiveSlideIndex] = useStripActiveIndex(
    id,
    0,
    slides.length,
    editorActiveIndex,
  );

  const [api, setApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [scrollSnapCount, setScrollSnapCount] = useState(count);

  const resolvedHeight = resolveCarouselHeight(height, heightCustom);
  const resolvedBorderRadius = resolveCarouselBorderRadius(borderRadius, borderRadiusCustom);
  const hasFixedHeight = Boolean(resolvedHeight);
  const minEmptyHeightPx = hasFixedHeight
    ? resolveCarouselMinEmptyHeightPx(resolvedHeight, 280)
    : CAROUSEL_AUTO_MIN_HEIGHT_PX;

  const slideSpvClass = resolveSlidesPerViewClass(slidesPerView);

  const carouselSizeStyle: CSSProperties = {
    borderRadius: resolvedBorderRadius,
    ...(hasFixedHeight && resolvedHeight
      ? {
          ["--nexus-carousel-height" as string]: resolvedHeight,
          ["--nexus-carousel-min-height" as string]: resolvedHeight,
          minHeight: resolvedHeight,
        }
      : {
          ["--nexus-carousel-auto-min-height" as string]: `${CAROUSEL_AUTO_MIN_HEIGHT_PX}px`,
        }),
  };

  const goToSnap = useCallback(
    (snapIndex: number) => {
      if (!api) return;
      api.scrollTo(snapIndex);
    },
    [api],
  );

  const goToSlide = useCallback(
    (slideIndex: number) => {
      if (count === 0) return;
      setActiveSlideIndex(((slideIndex % count) + count) % count);
    },
    [count, setActiveSlideIndex],
  );

  const goToPrev = useCallback(() => {
    goToSlide(activeSlideIndex - 1);
  }, [activeSlideIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(activeSlideIndex + 1);
  }, [activeSlideIndex, goToSlide]);

  useEffect(() => {
    if (!api) return undefined;

    const onSelect = () => {
      setCarouselIndex(api.selectedScrollSnap());
    };

    const onReInit = () => {
      setScrollSnapCount(api.scrollSnapList().length);
      onSelect();
    };

    onReInit();
    api.on("select", onSelect);
    api.on("reInit", onReInit);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onReInit);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !editLayoutMode || count === 0) return;
    if (api.selectedScrollSnap() === activeSlideIndex) return;
    api.scrollTo(activeSlideIndex);
  }, [activeSlideIndex, api, count, editLayoutMode]);

  useEffect(() => {
    if (!api) return;
    api.reInit();
  }, [api, slidesPerView, count]);

  useEffect(() => {
    if (editLayoutMode || autoplay !== "on" || count <= 1 || !api) return undefined;
    const ms = Math.min(30, Math.max(2, intervalSeconds || 5)) * 1000;
    const timer = window.setInterval(() => api.scrollNext(), ms);
    return () => window.clearInterval(timer);
  }, [autoplay, count, editLayoutMode, intervalSeconds, api]);

  useLayoutEffect(() => {
    syncPuckOverlay();
  }, [activeSlideIndex, editLayoutMode, slidesPerView, syncPuckOverlay]);

  useEffect(() => {
    if (!editLayoutMode || !id || !rootRef.current) return undefined;

    const observer = new ResizeObserver(() => syncPuckOverlay());
    observer.observe(rootRef.current);

    return () => observer.disconnect();
  }, [editLayoutMode, id, syncPuckOverlay]);

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
  const pageCount = editLayoutMode ? count : scrollSnapCount;
  const controlsIndex = editLayoutMode ? activeSlideIndex : carouselIndex;

  return (
    <div
      ref={rootRef}
      className={cn(
        "nexus-carousel",
        slideSpvClass,
        editLayoutMode ? "nexus-carousel--edit" : "nexus-carousel--interactive",
        hasFixedHeight && "nexus-carousel--fixed-height",
      )}
      style={carouselSizeStyle}
      aria-roledescription="carousel"
      aria-label="Content carousel"
    >
      <Carousel
        key={`${slidesPerView}-${count}`}
        setApi={setApi}
        opts={{
          loop: pageCount > 1 && !editLayoutMode,
          align: "start",
          containScroll: "trimSnaps",
          watchDrag: !editLayoutMode,
        }}
        className={cn(
          "nexus-carousel__viewport w-full",
          hasFixedHeight && "nexus-carousel__viewport--fixed",
        )}
        style={hasFixedHeight && resolvedHeight ? { minHeight: resolvedHeight } : undefined}
      >
        <CarouselContent
          className={cn(
            "ml-0",
            hasFixedHeight && "nexus-carousel__track--fixed h-full items-stretch",
          )}
        >
          {slides.map((slide, idx) => {
            const isActiveSlide = !editLayoutMode || idx === activeSlideIndex;

            return (
              <CarouselItem key={idx} className={cn("pl-0", hasFixedHeight && "h-full")}>
                <div
                  className={cn(
                    "nexus-carousel__slide",
                    hasFixedHeight && "nexus-carousel__slide--fixed",
                    editLayoutMode &&
                      !isActiveSlide &&
                      "nexus-carousel__slide--inactive-edit",
                    hasCarouselControls &&
                      editLayoutMode &&
                      isActiveSlide &&
                      "nexus-carousel__slide--with-controls",
                  )}
                  aria-hidden={editLayoutMode ? !isActiveSlide : undefined}
                >
                  {renderSlideContent(slide.content, minEmptyHeightPx, editLayoutMode)}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <CarouselControls
          showArrows={showArrows}
          showDots={showDots}
          showNavigation={showNavigation}
          activeIndex={controlsIndex}
          pageCount={pageCount}
          onPrev={goToPrev}
          onNext={goToNext}
          onGoTo={editLayoutMode ? goToSlide : goToSnap}
          controlsPortalRef={controlsPortalRef}
          useEmblaButtons={!editLayoutMode}
        />
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

  return (
    <NexusCarouselBody
      {...props}
      editLayoutMode={editLayoutMode}
      controlsPortalRef={controlsPortalRef}
      syncPuckOverlay={syncPuckOverlay}
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
