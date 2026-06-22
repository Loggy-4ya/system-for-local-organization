"use client";

/**
 * @fileoverview Image block render with optional carousel slide fill.
 *
 * @module src/components/puck/blocks/content/NexusImageRender
 */

import { useGetPuck } from "@puckeditor/core";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import { useCarouselSlideMedia, useCarouselSlideComposite } from "../../CarouselSlideMediaContext";
import { CoverMediaFrame } from "../../fields/CoverMediaFrame";
import { syncPuckComponentOverlayAfterLayout } from "../../lib/puckOverlaySync";
import {
  CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  NEXUS_CAROUSEL_FILL_ATTR,
  carouselFillAspectRatioStyle,
  resolveCarouselMediaFill,
  type CarouselMediaFillMode,
} from "../../lib/carouselMediaFill";
import { mediaFitToObjectFit, normalizeMediaFitMode, type MediaFitMode } from "../../lib/mediaFitMode";
import { selectPuckComponentById } from "../../lib/selectPuckComponentById";
import {
  resolveMediaAspectRatioNumeric,
  ratioToMediaAspectAttr,
} from "../../lib/mediaAspectRatio";
import { usePuckPreviewMode } from "../../lib/useNexusPuck";
import { useInterpolatedNexusValue } from "../../lib/nexusPageVariablesContext";

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
  mediaFit?: MediaFitMode;
  aspectRatioPreset?: string;
  aspectRatioCustom?: string;
  puck?: { isEditing?: boolean };
}

/** Internal props for shared image body (editor + published). */
interface NexusImageBodyProps extends NexusImageRenderProps {
  editLayoutMode: boolean;
  onSelectInCarousel?: () => void;
  syncSelectionOverlay?: () => void;
}

const ALIGN_MAP = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

/**
 * Shared image body — no Puck store hooks (safe inside `<Render>` and carousel slots).
 *
 * @param props - Image configuration and layout flags.
 * @returns Image UI.
 */
function NexusImageBody({
  id,
  image,
  alt,
  width,
  height,
  align,
  borderRadius,
  shadowDepth,
  carouselFill = "auto",
  mediaFit = "cover",
  aspectRatioPreset = "16-9",
  aspectRatioCustom = "16/9",
  editLayoutMode,
  onSelectInCarousel,
  syncSelectionOverlay,
}: NexusImageBodyProps) {
  const resolvedImage = useInterpolatedNexusValue(image);
  const resolvedAlt = useInterpolatedNexusValue(alt);
  const safeImage = sanitizeMediaUrl(resolvedImage);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [layoutRoot, setLayoutRoot] = useState<HTMLDivElement | null>(null);
  const inCarouselSlide = useCarouselSlideMedia();
  const compositeCarouselSlide = useCarouselSlideComposite();
  const fillSlide = resolveCarouselMediaFill(
    carouselFill,
    inCarouselSlide,
    layoutRoot,
    compositeCarouselSlide,
  );

  const assignRootRef = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    setLayoutRoot(node);
  }, []);

  /** Propagate aspect ratio to the slide shell so drop-zone `aspect-ratio` can read it. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !fillSlide) {
      return undefined;
    }

    const slide = root.closest<HTMLElement>(".nexus-carousel__slide");
    if (!slide) {
      return undefined;
    }

    const ratio = resolveMediaAspectRatioNumeric(aspectRatioPreset, aspectRatioCustom);
    slide.style.setProperty("--nexus-media-aspect-ratio", String(ratio));

    return () => {
      slide.style.removeProperty("--nexus-media-aspect-ratio");
    };
  }, [fillSlide, aspectRatioPreset, aspectRatioCustom]);

  useLayoutEffect(() => {
    if (!editLayoutMode || !fillSlide || !syncSelectionOverlay) return;
    syncSelectionOverlay();
  }, [editLayoutMode, fillSlide, syncSelectionOverlay, layoutRoot, image]);

  const fit = normalizeMediaFitMode(mediaFit);
  const objectFit = mediaFitToObjectFit(fit);
  const aspectRatio = resolveMediaAspectRatioNumeric(aspectRatioPreset, aspectRatioCustom);
  const mediaAspectAttr = ratioToMediaAspectAttr(aspectRatio);
  const fillAspectStyle = carouselFillAspectRatioStyle(aspectRatio);

  const useAspectFrame = !fillSlide && (height === "auto" || !height);

  /**
   * Open image settings when clicked inside a carousel slide.
   *
   * @param event - Click on the image root.
   */
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!editLayoutMode || !onSelectInCarousel || !fillSlide) return;
      event.stopPropagation();
      onSelectInCarousel();
    },
    [editLayoutMode, fillSlide, onSelectInCarousel],
  );

  const rootClass = cn(
    "nexus-image",
    fillSlide && "nexus-image--fill-slide",
    fillSlide && CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  );

  const rootStyle: CSSProperties = fillSlide
    ? {
        width: "100%",
        ...fillAspectStyle,
        ["--nexus-media-object-fit" as string]: objectFit,
      }
    : {
        display: "flex",
        justifyContent: ALIGN_MAP[align] ?? "center",
        width: "100%",
        ["--nexus-media-object-fit" as string]: objectFit,
      };

  const frameStyle: CSSProperties = fillSlide
    ? {
        width: "100%",
        aspectRatio,
        boxSizing: "border-box",
      }
    : {
        width: width || "100%",
        maxWidth: "100%",
        ...(height && height !== "auto" ? { height, minHeight: height } : {}),
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
      src={safeImage}
      alt={resolvedAlt}
      className="nexus-media-cover__media"
      draggable={false}
    />
  );

  const mediaContent = safeImage ? renderImage() : renderEmpty();

  if (fillSlide) {
    return (
      <div
        ref={assignRootRef}
        className={rootClass}
        style={rootStyle}
        onClick={handleClick}
        data-nexus-media-aspect={mediaAspectAttr}
        {...(fillSlide ? { [NEXUS_CAROUSEL_FILL_ATTR]: "true" as const } : {})}
      >
        <div className={cn("nexus-image__frame relative overflow-hidden bg-muted")} style={frameStyle}>
          <CoverMediaFrame fit={fit} className="absolute inset-0 h-full w-full">
            {mediaContent}
          </CoverMediaFrame>
        </div>
      </div>
    );
  }

  return (
    <div ref={assignRootRef} className={rootClass} style={rootStyle}>
      {safeImage ? (
        useAspectFrame ? (
          <div
            className="relative overflow-hidden bg-muted"
            style={{ ...frameStyle, aspectRatio }}
          >
            <CoverMediaFrame fit={fit} className="absolute inset-0 h-full w-full">
              {renderImage()}
            </CoverMediaFrame>
          </div>
        ) : (
          <CoverMediaFrame
            fit={fit}
            style={{ ...frameStyle, position: "relative" }}
            className="overflow-hidden bg-muted"
          >
            {renderImage()}
          </CoverMediaFrame>
        )
      ) : (
        <div
          className="relative flex items-center justify-center overflow-hidden border border-dashed border-border bg-muted text-muted-foreground"
          style={{ ...frameStyle, aspectRatio }}
        >
          <CoverMediaFrame fit={fit} className="absolute inset-0 h-full w-full">
            {renderEmpty()}
          </CoverMediaFrame>
        </div>
      )}
    </div>
  );
}

/**
 * Puck editor shell — subscribes to Puck store hooks (must render inside `<Puck>`).
 *
 * @param props - Image configuration from the block render.
 * @returns Image block with edit/interactive preview behavior.
 */
function NexusImageEditorShell(props: NexusImageRenderProps) {
  const previewMode = usePuckPreviewMode();
  const editLayoutMode = previewMode !== "interactive";
  const getPuck = useGetPuck();

  const onSelectInCarousel = useCallback(() => {
    if (!props.id) return;
    selectPuckComponentById(getPuck(), props.id);
  }, [getPuck, props.id]);

  const syncSelectionOverlay = useCallback(() => {
    syncPuckComponentOverlayAfterLayout(getPuck(), props.id);
  }, [getPuck, props.id]);

  return (
    <NexusImageBody
      {...props}
      editLayoutMode={editLayoutMode}
      onSelectInCarousel={onSelectInCarousel}
      syncSelectionOverlay={syncSelectionOverlay}
    />
  );
}

/**
 * Published / static image — no Puck store hooks (safe inside `<Render>`).
 *
 * @param props - Image configuration from the block render.
 * @returns Image UI for the public site.
 */
function NexusImageView(props: NexusImageRenderProps) {
  return <NexusImageBody {...props} editLayoutMode={false} />;
}

/**
 * Image block entry — routes to editor or static render based on Puck context.
 *
 * @param props - Image configuration and Puck edit context.
 * @returns Image UI.
 */
export function NexusImageRender(props: NexusImageRenderProps) {
  if (props.puck?.isEditing) {
    return <NexusImageEditorShell {...props} />;
  }

  return <NexusImageView {...props} />;
}

export default NexusImageRender;
