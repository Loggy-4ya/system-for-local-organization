"use client";

/**
 * @fileoverview Video player render with editor-safe embed pointer handling.
 *
 * @module src/components/puck/blocks/content/NexusVideoRender
 */

import { useGetPuck } from "@measured/puck";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { selectPuckComponentById } from "../../lib/selectPuckComponentById";
import {
  CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  resolveCarouselMediaFill,
  type CarouselMediaFillMode,
} from "../../lib/carouselMediaFill";
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
  aspectRatio: "16-9" | "4-3" | "1-1";
  width: string;
  customWidth?: string;
  maxWidth: ContentWidthToken | "none";
  align: "left" | "center" | "right";
  autoplay: "no" | "yes";
  controls: "yes" | "no";
  puck?: { isEditing?: boolean };
}

/**
 * Extract embed URL for YouTube or Vimeo sources.
 *
 * @param videoUrl - Raw video URL from sidebar.
 * @param autoplay - Autoplay flag.
 * @param controls - Show native controls flag.
 * @returns Embed URL or empty string for direct file URLs.
 */
function getEmbedUrl(
  videoUrl: string,
  autoplay: "no" | "yes",
  controls: "yes" | "no",
): string {
  if (!videoUrl) return "";

  const ytMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=${autoplay === "yes" ? "1" : "0"}&mute=${autoplay === "yes" ? "1" : "0"}&controls=${controls === "yes" ? "1" : "0"}`;
  }

  const vimeoMatch = videoUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${autoplay === "yes" ? "1" : "0"}&muted=${autoplay === "yes" ? "1" : "0"}`;
  }

  return "";
}

/**
 * Extract a YouTube video id from a watch or share URL.
 *
 * @param videoUrl - Raw video URL from sidebar.
 * @returns Eleven-character id or null.
 */
function extractYouTubeId(videoUrl: string): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  );
  return match?.[1] ?? null;
}

/** Numeric aspect ratios for Shadcn AspectRatio. */
const ASPECT_RATIOS: Record<NexusVideoRenderProps["aspectRatio"], number> = {
  "16-9": 16 / 9,
  "4-3": 4 / 3,
  "1-1": 1,
};

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
 * Resolve max-width cap from token.
 *
 * @param maxWidth - Max width token or none.
 * @returns CSS max-width or undefined.
 */
function resolveMaxWidth(maxWidth: NexusVideoRenderProps["maxWidth"]): string | undefined {
  if (maxWidth === "none") return undefined;
  return CONTENT_WIDTH_MAP[maxWidth];
}

/**
 * Video player — embeds are non-interactive in edit layout mode so Puck overlays work.
 *
 * @param props - Video configuration and Puck edit context.
 * @returns Video player UI.
 */
export function NexusVideoRender({
  id,
  url,
  aspectRatio,
  width,
  customWidth,
  maxWidth,
  align,
  autoplay,
  controls,
  puck,
}: NexusVideoRenderProps) {
  const previewMode = usePuckPreviewMode();
  const isInteractivePreview = previewMode === "interactive";
  const isEditing = puck?.isEditing ?? false;
  const editLayoutMode = isEditing && !isInteractivePreview;
  const getPuck = useGetPuck();
  const rootRef = useRef<HTMLDivElement>(null);
  const [fillSlide, setFillSlide] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    setFillSlide(Boolean(root?.closest(".nexus-carousel__slide")));
  }, [url, aspectRatio]);

  const embedUrl = getEmbedUrl(url, autoplay, controls);
  const youTubeId = extractYouTubeId(url);
  const ratio = ASPECT_RATIOS[aspectRatio] ?? 16 / 9;
  const mediaPointerEvents = editLayoutMode ? "none" : "auto";
  const resolvedWidth = resolveVideoWidth(width, customWidth);
  const resolvedMaxWidth = resolveMaxWidth(maxWidth);

  /**
   * Open video settings when clicked inside a carousel slide.
   *
   * @param event - Click on the video root.
   */
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!editLayoutMode || !id) return;
      if (!rootRef.current?.closest(".nexus-carousel__slide")) return;
      event.stopPropagation();
      selectPuckComponentById(getPuck(), id);
    },
    [editLayoutMode, getPuck, id],
  );

  const rootClass = cn(
    editLayoutMode ? "nexus-video nexus-video--edit" : "nexus-video nexus-video--interactive",
    fillSlide && "nexus-video--fill-slide",
    fillSlide && CAROUSEL_SLIDE_MEDIA_FILL_CLASS,
  );

  const rootStyle: CSSProperties = fillSlide
    ? { width: "100%" }
    : {
        width: "100%",
        padding: "var(--spacing-sm) 0",
        display: "flex",
        justifyContent: ALIGN_MAP[align] ?? "center",
      };

  const frameStyle: CSSProperties = fillSlide
    ? {
        width: "100%",
        maxWidth: "none",
        height: "100%",
        boxSizing: "border-box",
      }
    : {
        width: resolvedWidth,
        maxWidth: resolvedMaxWidth ?? "100%",
        boxSizing: "border-box",
      };

  const renderMedia = () => {
    if (!url) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <span style={{ fontSize: "28px" }}>📹</span>
          <span className="text-[11px] tracking-wide uppercase">Empty Video Player</span>
        </div>
      );
    }

    if (editLayoutMode && youTubeId) {
      return (
        <img
          src={`https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`}
          alt="Video preview"
          className="nexus-video__media absolute inset-0 h-full w-full object-cover"
          draggable={false}
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
          className="nexus-video__media absolute inset-0 h-full w-full"
          style={{ pointerEvents: mediaPointerEvents }}
        />
      );
    }

    return (
      <video
        src={url}
        controls={controls === "yes"}
        autoPlay={autoplay === "yes"}
        muted={autoplay === "yes"}
        preload="metadata"
        className="nexus-video__media absolute inset-0 h-full w-full object-cover"
        style={{ pointerEvents: mediaPointerEvents }}
      />
    );
  };

  const editBadge =
    editLayoutMode && url ? (
      <span className="nexus-video__edit-badge">Video — use Interactive mode to play</span>
    ) : null;

  if (fillSlide) {
    return (
      <div
        ref={rootRef}
        className={rootClass}
        style={rootStyle}
        onClick={handleClick}
        data-nexus-media-aspect={aspectRatio.replace("-", "/")}
      >
        <div
          className={cn(
            "nexus-video__frame nexus-video__frame--fill-slide overflow-hidden bg-muted",
          )}
        >
          {renderMedia()}
          {editBadge}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={rootClass}
      style={rootStyle}
      onClick={handleClick}
    >
      <div
        className={cn(
          "nexus-video__frame overflow-hidden rounded-lg border border-border bg-muted",
        )}
        style={frameStyle}
      >
        <AspectRatio ratio={ratio}>{renderMedia()}</AspectRatio>

        {editBadge}
      </div>
    </div>
  );
}

export default NexusVideoRender;
