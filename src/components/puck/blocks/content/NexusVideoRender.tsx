"use client";

/**
 * @fileoverview Video player render with editor-safe embed pointer handling.
 *
 * Tests: `tests/puck/lib/blockRenderVisibility.test.ts` — `npm run test:block-render-visibility`
 *
 * @module src/components/puck/blocks/content/NexusVideoRender
 */

import { useGetPuck } from "@puckeditor/core";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import { useCarouselSlideMedia } from "../../CarouselSlideMediaContext";
import { CoverMediaFrame } from "../../fields/CoverMediaFrame";
import {
  EMBED_PROVIDER_ASPECT_RATIO,
  extractYouTubeId,
  getVideoEmbedUrl,
  resolveVideoDisplayAspectRatio,
} from "../../lib/embedMedia";
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
  syncPuckComponentOverlayAfterLayout,
} from "../../lib/puckOverlaySync";
import {
  resolveMediaAspectRatioNumeric,
  ratioToMediaAspectAttr,
} from "../../lib/mediaAspectRatio";
import { usePuckPreviewMode } from "../../lib/useNexusPuck";
import {
  CONTENT_WIDTH_MAP,
  normalizeContentWidth,
  type ContentWidthToken,
} from "../../lib/contentWidthTokens";

/** Props for {@link NexusVideoRender}. */
export interface NexusVideoRenderProps {
  id?: string;
  url: string;
  aspectRatioPreset: string;
  aspectRatioCustom?: string;
  width: string;
  customWidth?: string;
  maxWidth: ContentWidthToken | "none" | "custom";
  maxWidthCustom?: string;
  align: "left" | "center" | "right";
  autoplay: "no" | "yes";
  controls: "yes" | "no";
  carouselFill?: CarouselMediaFillMode;
  mediaFit?: MediaFitMode;
  puck?: { isEditing?: boolean };
}

/** Internal props for shared video body (editor + published). */
interface NexusVideoBodyProps extends NexusVideoRenderProps {
  editLayoutMode: boolean;
  onSelectInCarousel?: () => void;
  /** Re-measure Puck selection overlay after carousel fill layout changes. */
  syncSelectionOverlay?: () => void;
}

const ALIGN_MAP = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

/**
 * Resolve configured width to a CSS length.
 *
 * @param width - Width preset or percentage token.
 * @param customWidth - Custom px/rem value when width is `custom`.
 * @returns CSS width value.
 */
function resolveVideoWidth(width: string, customWidth?: string): string {
  if (width === "custom") {
    return customWidth?.trim() || "100%";
  }
  const token = normalizeContentWidth(width);
  if (token in CONTENT_WIDTH_MAP) {
    return CONTENT_WIDTH_MAP[token as ContentWidthToken];
  }
  return width || "100%";
}

/**
 * Resolve max-width cap from token or custom CSS.
 *
 * @param maxWidth - Max width token, none, or custom.
 * @param maxWidthCustom - Custom CSS when maxWidth is `custom`.
 * @returns CSS max-width or undefined.
 */
function resolveMaxWidth(
  maxWidth: NexusVideoRenderProps["maxWidth"],
  maxWidthCustom?: string,
): string | undefined {
  if (maxWidth === "none") return undefined;
  if (maxWidth === "custom") {
    const trimmed = maxWidthCustom?.trim();
    return trimmed || CONTENT_WIDTH_MAP.lg;
  }
  return CONTENT_WIDTH_MAP[maxWidth as ContentWidthToken];
}

/**
 * Shared video body — no Puck store hooks (safe inside `<Render>` and carousel slots).
 *
 * @param props - Video configuration and layout flags.
 * @returns Video player UI.
 */
function NexusVideoBody({
  id,
  url,
  aspectRatioPreset,
  aspectRatioCustom,
  width,
  customWidth,
  maxWidth,
  maxWidthCustom,
  align,
  autoplay,
  controls,
  carouselFill = "auto",
  mediaFit = "cover",
  editLayoutMode,
  onSelectInCarousel,
  syncSelectionOverlay,
}: NexusVideoBodyProps) {
  const safeUrl = sanitizeMediaUrl(url);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [layoutRoot, setLayoutRoot] = useState<HTMLDivElement | null>(null);
  const inCarouselSlide = useCarouselSlideMedia();
  const fillSlide = resolveCarouselMediaFill(carouselFill, inCarouselSlide, layoutRoot);
  const youTubeId = extractYouTubeId(safeUrl);
  const [youTubePosterUrl, setYouTubePosterUrl] = useState<string | null>(() =>
    editLayoutMode && youTubeId
      ? `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`
      : null,
  );

  /** Capture mount for composite-layout detection inside grid cells. */
  const assignRootRef = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    setLayoutRoot(node);
  }, []);

  useLayoutEffect(() => {
    if (!fillSlide) {
      return undefined;
    }

    const slide = rootRef.current?.closest<HTMLElement>(".nexus-carousel__slide");
    if (!slide) {
      return undefined;
    }

    const ratio = resolveVideoDisplayAspectRatio(
      safeUrl,
      aspectRatioPreset,
      aspectRatioCustom,
      resolveMediaAspectRatioNumeric,
    );

    slide.style.setProperty("--nexus-media-aspect-ratio", String(ratio));

    return () => {
      slide.style.removeProperty("--nexus-media-aspect-ratio");
    };
  }, [fillSlide, url, aspectRatioPreset, aspectRatioCustom]);

  /** Re-measure Puck selection overlay after fill media settles (fixes half-height blue frame). */
  useLayoutEffect(() => {
    if (!editLayoutMode || !fillSlide || !syncSelectionOverlay) return;
    syncSelectionOverlay();
  }, [editLayoutMode, fillSlide, syncSelectionOverlay, layoutRoot, url, youTubePosterUrl]);

  /** Preload max-res YouTube art; fall back to hqdefault when maxres is missing. */
  useEffect(() => {
    if (!editLayoutMode || !youTubeId) {
      setYouTubePosterUrl(null);
      return;
    }

    const maxRes = `https://img.youtube.com/vi/${youTubeId}/maxresdefault.jpg`;
    const hqDefault = `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`;
    setYouTubePosterUrl(maxRes);

    let cancelled = false;
    const probe = new Image();

    probe.onload = () => {
      if (cancelled) return;
      setYouTubePosterUrl(probe.naturalWidth > 120 ? maxRes : hqDefault);
    };
    probe.onerror = () => {
      if (!cancelled) setYouTubePosterUrl(hqDefault);
    };
    probe.src = maxRes;

    return () => {
      cancelled = true;
    };
  }, [editLayoutMode, youTubeId, url]);

  const fit = normalizeMediaFitMode(mediaFit);
  const objectFit = mediaFitToObjectFit(fit);
  const embedUrl = getVideoEmbedUrl(safeUrl, autoplay, controls);
  const ratio = resolveVideoDisplayAspectRatio(
    safeUrl,
    aspectRatioPreset,
    aspectRatioCustom,
    resolveMediaAspectRatioNumeric,
  );
  const embedAspect = embedUrl ? EMBED_PROVIDER_ASPECT_RATIO : ratio;
  const mediaAspectAttr = ratioToMediaAspectAttr(ratio);
  const mediaPointerEvents = editLayoutMode ? "none" : "auto";
  const resolvedWidth = resolveVideoWidth(width, customWidth);
  const resolvedMaxWidth = resolveMaxWidth(maxWidth, maxWidthCustom);

  /**
   * Open video settings when clicked inside a carousel slide.
   *
   * @param event - Click on the video root.
   */
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!editLayoutMode || !onSelectInCarousel) return;
      if (!rootRef.current?.closest(".nexus-carousel__slide")) return;
      event.stopPropagation();
      onSelectInCarousel();
    },
    [editLayoutMode, onSelectInCarousel],
  );

  const rootClass = cn(
    editLayoutMode ? "nexus-video nexus-video--edit" : "nexus-video nexus-video--interactive",
    fillSlide && "nexus-video--fill-slide",
    fillSlide && CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  );

  const fillAspectStyle = carouselFillAspectRatioStyle(ratio);

  const rootStyle: CSSProperties = fillSlide
    ? {
        width: "100%",
        ...fillAspectStyle,
        ["--nexus-media-object-fit" as string]: objectFit,
      }
    : {
        display: "flex",
        justifyContent: ALIGN_MAP[align] ?? "center",
        alignItems: "flex-start",
        width: "100%",
        ["--nexus-media-object-fit" as string]: objectFit,
      };

  const frameStyle: CSSProperties = fillSlide
    ? {
        width: "100%",
        maxWidth: "none",
        aspectRatio: ratio,
        boxSizing: "border-box",
      }
    : {
        width: resolvedWidth,
        maxWidth: resolvedMaxWidth ?? "100%",
        boxSizing: "border-box",
        ...(editLayoutMode ? { lineHeight: 0 } : {}),
      };

  const renderMedia = () => {
    if (!safeUrl) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <span style={{ fontSize: "28px" }}>📹</span>
          <span className="text-[11px] tracking-wide uppercase">Empty Video Player</span>
        </div>
      );
    }

    if (editLayoutMode && youTubeId && youTubePosterUrl) {
      return (
        <div
          className="nexus-video__poster"
          role="img"
          aria-label="Video preview"
          style={{
            backgroundImage: `url("${youTubePosterUrl}")`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: fit === "contain" ? "contain" : "cover",
          }}
        />
      );
    }

    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title="Embedded Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="nexus-media-cover__embed"
          style={{ pointerEvents: mediaPointerEvents }}
        />
      );
    }

    return (
      <video
        src={safeUrl}
        controls={controls === "yes"}
        autoPlay={autoplay === "yes"}
        muted={autoplay === "yes"}
        preload="metadata"
        className="nexus-media-cover__media"
        style={{ pointerEvents: mediaPointerEvents }}
      />
    );
  };

  const mediaFrame = (
    <CoverMediaFrame
      fit={fit}
      embedAspect={embedUrl ? embedAspect : undefined}
      className="absolute inset-0 h-full w-full"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {renderMedia()}
    </CoverMediaFrame>
  );

  const editBadge =
    editLayoutMode && safeUrl ? (
      <span className="nexus-video__edit-badge">Play in Interactive mode</span>
    ) : null;

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
        <div
          className={cn(
            "nexus-video__frame nexus-video__frame--fill-slide relative overflow-hidden bg-muted",
          )}
          style={frameStyle}
        >
          {mediaFrame}
          {editBadge}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={assignRootRef}
      className={rootClass}
      style={rootStyle}
      onClick={handleClick}
    >
      <div
        className={cn(
          "nexus-video__frame relative overflow-hidden rounded-lg border border-border bg-muted",
        )}
        style={{ ...frameStyle, aspectRatio: ratio }}
      >
        {mediaFrame}

        {editBadge}
      </div>
    </div>
  );
}

/**
 * Puck editor shell — subscribes to Puck store hooks (must render inside `<Puck>`).
 *
 * @param props - Video configuration from the block render.
 * @returns Video player with edit/interactive preview behavior.
 */
function NexusVideoEditorShell(props: NexusVideoRenderProps) {
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
    <NexusVideoBody
      {...props}
      editLayoutMode={editLayoutMode}
      onSelectInCarousel={onSelectInCarousel}
      syncSelectionOverlay={syncSelectionOverlay}
    />
  );
}

/**
 * Published / static video — no Puck store hooks (safe inside `<Render>`).
 *
 * @param props - Video configuration from the block render.
 * @returns Interactive video player for the public site.
 */
function NexusVideoView(props: NexusVideoRenderProps) {
  return <NexusVideoBody {...props} editLayoutMode={false} />;
}

/**
 * Video player entry — routes to editor or static render based on Puck context.
 *
 * @param props - Video configuration and Puck edit context.
 * @returns Video player UI.
 */
export function NexusVideoRender(props: NexusVideoRenderProps) {
  if (props.puck?.isEditing) {
    return <NexusVideoEditorShell {...props} />;
  }

  return <NexusVideoView {...props} />;
}

export default NexusVideoRender;
