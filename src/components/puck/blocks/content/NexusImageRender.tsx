"use client";

/**
 * @fileoverview Image block render with optional carousel slide fill.
 *
 * @module src/components/puck/blocks/content/NexusImageRender
 */

import { useGetPuck } from "@measured/puck";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import {
  CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  resolveCarouselMediaFill,
  type CarouselMediaFillMode,
} from "../../lib/carouselMediaFill";
import { selectPuckComponentById } from "../../lib/selectPuckComponentById";
import { usePuckPreviewMode } from "../../lib/useNexusPuck";

/** Props for {@link NexusImageRender}. */
export interface NexusImageRenderProps {
  id?: string;
  image: string;
  alt: string;
  width: string;
  height: string;
  align: "left" | "center" | "right";
  borderRadius: string;
  shadowDepth: string;
  carouselFill?: CarouselMediaFillMode;
  puck?: { isEditing?: boolean };
}

const ALIGN_MAP = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

/**
 * Image block — supports natural aspect framing or full slide fill in carousels.
 *
 * @param props - Image configuration and Puck edit context.
 * @returns Image UI.
 */
export function NexusImageRender({
  id,
  image,
  alt,
  width,
  height,
  align,
  borderRadius,
  shadowDepth,
  carouselFill = "auto",
  puck,
}: NexusImageRenderProps) {
  const previewMode = usePuckPreviewMode();
  const isEditing = puck?.isEditing ?? false;
  const editLayoutMode = isEditing && previewMode !== "interactive";
  const getPuck = useGetPuck();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inCarouselSlide, setInCarouselSlide] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    setInCarouselSlide(Boolean(root?.closest(".nexus-carousel__slide")));
  }, [image, height, width, carouselFill]);

  const fillSlide = resolveCarouselMediaFill(carouselFill, inCarouselSlide);
  const useAspectFrame = !fillSlide && (height === "auto" || !height);

  /**
   * Open image settings when clicked inside a carousel slide.
   *
   * @param event - Click on the image root.
   */
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!editLayoutMode || !id || !fillSlide) return;
      event.stopPropagation();
      selectPuckComponentById(getPuck(), id);
    },
    [editLayoutMode, fillSlide, getPuck, id],
  );

  const rootClass = cn(
    "nexus-image",
    fillSlide && "nexus-image--fill-slide",
    fillSlide && CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  );

  const rootStyle: CSSProperties = fillSlide
    ? { width: "100%" }
    : {
        display: "flex",
        justifyContent: ALIGN_MAP[align] ?? "center",
        padding: "var(--spacing-sm) 0",
        width: "100%",
      };

  const frameStyle: CSSProperties = fillSlide
    ? {
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }
    : {
        width: width || "100%",
        maxWidth: "100%",
        borderRadius: borderRadius || "0px",
        boxShadow: shadowDepth || "none",
      };

  const renderEmpty = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <span style={{ fontSize: "28px" }}>🖼️</span>
      <span className="text-[11px] tracking-wide uppercase">Empty Image Block</span>
    </div>
  );

  const renderImage = () => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt={alt}
      className="nexus-image__media absolute inset-0 h-full w-full object-cover"
      draggable={false}
    />
  );

  if (fillSlide) {
    return (
      <div
        ref={rootRef}
        className={rootClass}
        style={rootStyle}
        onClick={handleClick}
        data-nexus-media-aspect="16/9"
      >
        <div className={cn("nexus-image__frame overflow-hidden bg-muted")} style={frameStyle}>
          {image ? renderImage() : renderEmpty()}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={rootClass} style={rootStyle}>
      {image ? (
        useAspectFrame ? (
          <AspectRatio
            ratio={16 / 9}
            className="overflow-hidden bg-muted"
            style={frameStyle}
          >
            {renderImage()}
          </AspectRatio>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={alt}
            style={{
              width: width || "100%",
              height: height || "auto",
              maxWidth: "100%",
              borderRadius: borderRadius || "0px",
              boxShadow: shadowDepth || "none",
              objectFit: "cover",
            }}
          />
        )
      ) : (
        <AspectRatio
          ratio={16 / 9}
          className="flex items-center justify-center border border-dashed border-border bg-muted text-muted-foreground"
          style={frameStyle}
        >
          {renderEmpty()}
        </AspectRatio>
      )}
    </div>
  );
}

export default NexusImageRender;
