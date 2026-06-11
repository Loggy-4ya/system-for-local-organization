"use client";

/**
 * @fileoverview Video player render with editor-safe embed pointer handling.
 *
 * @module src/components/puck/blocks/content/NexusVideoRender
 */

import { usePuck } from "@measured/puck";

/** Props for {@link NexusVideoRender}. */
export interface NexusVideoRenderProps {
  url: string;
  aspectRatio: "16-9" | "4-3" | "1-1";
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

const PADDING_PERCENTAGES: Record<NexusVideoRenderProps["aspectRatio"], string> = {
  "16-9": "56.25%",
  "4-3": "75%",
  "1-1": "100%",
};

/**
 * Video player — embeds are non-interactive in edit layout mode so Puck overlays work.
 *
 * @param props - Video configuration and Puck edit context.
 * @returns Video player UI.
 */
export function NexusVideoRender({
  url,
  aspectRatio,
  autoplay,
  controls,
  puck,
}: NexusVideoRenderProps) {
  const { appState } = usePuck();
  const isInteractivePreview = appState.ui.previewMode === "interactive";
  const isEditing = puck?.isEditing ?? false;
  const editLayoutMode = isEditing && !isInteractivePreview;

  const embedUrl = getEmbedUrl(url, autoplay, controls);
  const pad = PADDING_PERCENTAGES[aspectRatio] || "56.25%";
  const mediaPointerEvents = editLayoutMode ? "none" : "auto";

  const rootClass = editLayoutMode
    ? "nexus-video nexus-video--edit"
    : "nexus-video nexus-video--interactive";

  return (
    <div
      className={rootClass}
      style={{
        width: "100%",
        padding: "var(--spacing-sm) 0",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="nexus-video__frame"
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: embedUrl ? pad : "0px",
          height: embedUrl ? "0px" : "auto",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-cell)",
          boxSizing: "border-box",
        }}
      >
        {url ? (
          embedUrl ? (
            <iframe
              src={embedUrl}
              title="Embedded Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: mediaPointerEvents,
              }}
            />
          ) : (
            <video
              src={url}
              controls={controls === "yes"}
              autoPlay={autoplay === "yes"}
              muted={autoplay === "yes"}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                pointerEvents: mediaPointerEvents,
              }}
            />
          )
        ) : (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              color: "var(--color-text-secondary)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "28px" }}>📹</span>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Empty Video Player
            </span>
          </div>
        )}

        {editLayoutMode && url ? (
          <span className="nexus-video__edit-badge">Video — use Interactive mode to play</span>
        ) : null}
      </div>
    </div>
  );
}

export default NexusVideoRender;
