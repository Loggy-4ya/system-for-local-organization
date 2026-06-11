"use client";

/**
 * @fileoverview Carousel render with editor-safe controls and interactive preview.
 *
 * @module src/components/puck/blocks/content/NexusCarouselRender
 */

import { usePuck } from "@measured/puck";
import { useCallback, useEffect, useState, type ComponentType, type CSSProperties } from "react";

/** Puck slot component for slide content. */
type SlideContentComponent = ComponentType<{
  minEmptyHeight?: number | string;
  className?: string;
  style?: CSSProperties;
}>;

/** Single carousel slide. */
export interface CarouselSlide {
  image: string;
  title: string;
  caption: string;
  linkUrl: string;
  content?: SlideContentComponent;
}

/** Props for {@link NexusCarouselRender}. */
export interface NexusCarouselRenderProps {
  slides: CarouselSlide[];
  height: string;
  borderRadius: string;
  autoplay: "on" | "off";
  intervalSeconds: number;
  showArrows: "yes" | "no";
  showDots: "yes" | "no";
  puck?: { isEditing?: boolean };
}

/**
 * Render slide image, placeholder, and optional caption.
 *
 * @param slide - Slide data.
 * @param idx - Zero-based slide index.
 * @param height - Configured slide height token.
 * @returns Slide inner content.
 */
function renderSlideBody(slide: CarouselSlide, idx: number, height: string) {
  return (
    <>
      {slide.image ? (
        <img
          src={slide.image}
          alt={slide.title || slide.caption || `Slide ${idx + 1}`}
          className="nexus-carousel__image"
          style={{ maxHeight: height === "auto" ? undefined : height }}
        />
      ) : (
        <div className="nexus-carousel__placeholder">
          <span>Slide {idx + 1}</span>
          <span className="nexus-carousel__placeholder-hint">Add an image in the sidebar</span>
        </div>
      )}
      {(slide.title || slide.caption) && (
        <div className="nexus-carousel__caption">
          {slide.title ? <strong>{slide.title}</strong> : null}
          {slide.caption ? <p>{slide.caption}</p> : null}
        </div>
      )}
    </>
  );
}

/**
 * Render a slide content Puck slot when resolved.
 *
 * @param Content - Puck slot component for slide body content.
 * @param editLayoutMode - Whether editor stacked layout is active.
 * @returns Slide content drop zone or null.
 */
function renderSlideContent(Content: SlideContentComponent | undefined, editLayoutMode: boolean) {
  if (typeof Content !== "function") {
    return editLayoutMode ? (
      <p className="nexus-carousel__empty-hint">Drag blocks into this slide content area.</p>
    ) : null;
  }

  return (
    <div className={editLayoutMode ? "nexus-carousel__slide-content--edit" : "nexus-carousel__slide-content"}>
      <Content
        minEmptyHeight={120}
        className="nexus-carousel__dropzone"
        style={editLayoutMode ? { padding: "12px" } : undefined}
      />
    </div>
  );
}

/**
 * Image carousel with prev/next controls. Autoplay runs only outside edit layout mode.
 *
 * @param props - Carousel configuration.
 * @returns Carousel UI.
 */
export function NexusCarouselRender({
  slides,
  height,
  borderRadius,
  autoplay,
  intervalSeconds,
  showArrows,
  showDots,
  puck,
}: NexusCarouselRenderProps) {
  const { appState } = usePuck();
  const isInteractivePreview = appState.ui.previewMode === "interactive";
  const isEditing = puck?.isEditing ?? false;
  const editLayoutMode = isEditing && !isInteractivePreview;

  const [activeIndex, setActiveIndex] = useState(0);
  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (editLayoutMode || autoplay !== "on" || count <= 1) return undefined;
    const ms = Math.min(30, Math.max(2, intervalSeconds || 5)) * 1000;
    const timer = window.setInterval(goNext, ms);
    return () => window.clearInterval(timer);
  }, [autoplay, count, editLayoutMode, goNext, intervalSeconds]);

  if (!count) {
    return (
      <div className="nexus-carousel nexus-carousel--empty">
        <p>Add slides in the sidebar to build your carousel.</p>
      </div>
    );
  }

  const showControls = count > 1 && (isInteractivePreview || !isEditing);

  return (
    <div
      className={
        editLayoutMode
          ? "nexus-carousel nexus-carousel--edit"
          : "nexus-carousel nexus-carousel--interactive"
      }
      style={{ borderRadius }}
      aria-roledescription="carousel"
      aria-label="Image carousel"
    >
      {editLayoutMode ? (
        <div className="nexus-carousel__edit-hint">
          Switch to <strong>Interactive</strong> mode in the header to preview slides.
        </div>
      ) : null}

      {editLayoutMode ? (
        <div className="nexus-carousel__slides--edit">
          {slides.map((slide, idx) => (
            <div key={idx} className="nexus-carousel__slide--edit">
              <div className="nexus-carousel__slide-editor-label">
                Slide {idx + 1}
                {slide.title ? `: ${slide.title}` : ""}
              </div>
              <div
                className="nexus-carousel__viewport"
                style={{ minHeight: height === "auto" ? undefined : height }}
              >
                <div className="nexus-carousel__slide">{renderSlideBody(slide, idx, height)}</div>
              </div>
              {renderSlideContent(slide.content, true)}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div
            className="nexus-carousel__viewport"
            style={{ minHeight: height === "auto" ? undefined : height }}
          >
            {slides.map((slide, idx) => {
              const isActive = idx === activeIndex;
              const slideBody = renderSlideBody(slide, idx, height);
              const slideContent = slide.linkUrl ? (
                <a
                  href={slide.linkUrl}
                  className="nexus-carousel__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {slideBody}
                </a>
              ) : (
                slideBody
              );

              return (
                <div
                  key={idx}
                  className="nexus-carousel__slide"
                  style={{ display: isActive ? "block" : "none" }}
                  aria-hidden={!isActive}
                >
                  {slideContent}
                  {isActive ? renderSlideContent(slide.content, false) : null}
                </div>
              );
            })}
          </div>

          {showArrows === "yes" && showControls ? (
            <>
              <button
                type="button"
                className="nexus-carousel__arrow nexus-carousel__arrow--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Previous slide"
              >
                ‹
              </button>
              <button
                type="button"
                className="nexus-carousel__arrow nexus-carousel__arrow--next"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Next slide"
              >
                ›
              </button>
            </>
          ) : null}

          {showDots === "yes" && showControls ? (
            <div className="nexus-carousel__dots" role="tablist" aria-label="Carousel pagination">
              {slides.map((_, idx) => (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(idx);
                  }}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default NexusCarouselRender;
