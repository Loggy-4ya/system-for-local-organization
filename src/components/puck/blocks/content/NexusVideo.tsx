"use client";

/**
 * @fileoverview Puck block for Video players.
 *
 * Supports YouTube, Vimeo, and direct video file URLs with
 * aspect ratio, controls, and autoplay settings.
 *
 * @module src/components/puck/blocks/content/NexusVideo
 */

import React from "react";

export const NexusVideo = {
  label: "Video Player",
  fields: {
    url: {
      type: "text" as const,
      label: "Video URL (YouTube, Vimeo, or direct MP4 link)",
    },
    aspectRatio: {
      type: "select" as const,
      label: "Aspect Ratio",
      options: [
        { label: "16:9 (Widescreen)", value: "16-9" },
        { label: "4:3 (Standard)", value: "4-3" },
        { label: "1:1 (Square)", value: "1-1" },
      ],
    },
    autoplay: {
      type: "radio" as const,
      label: "Autoplay",
      options: [
        { label: "No", value: "no" },
        { label: "Yes (Muted)", value: "yes" },
      ],
    },
    controls: {
      type: "radio" as const,
      label: "Show Controls",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
  },
  defaultProps: {
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    aspectRatio: "16-9" as const,
    autoplay: "no" as const,
    controls: "yes" as const,
  },
  render({
    url,
    aspectRatio,
    autoplay,
    controls,
  }: {
    url: string;
    aspectRatio: "16-9" | "4-3" | "1-1";
    autoplay: "no" | "yes";
    controls: "yes" | "no";
  }) {
    /** Extract embed URL for YouTube or Vimeo */
    function getEmbedUrl(videoUrl: string) {
      if (!videoUrl) return "";
      // YouTube
      const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=${autoplay === "yes" ? "1" : "0"}&mute=${autoplay === "yes" ? "1" : "0"}&controls=${controls === "yes" ? "1" : "0"}`;
      }
      // Vimeo
      const vimeoMatch = videoUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${autoplay === "yes" ? "1" : "0"}&muted=${autoplay === "yes" ? "1" : "0"}`;
      }
      return "";
    }

    const embedUrl = getEmbedUrl(url);

    const paddingPercentages = {
      "16-9": "56.25%",
      "4-3": "75%",
      "1-1": "100%",
    };

    const pad = paddingPercentages[aspectRatio] || "56.25%";

    return (
      <div
        style={{
          width: "100%",
          padding: "var(--spacing-sm) 0",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "720px",
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
        </div>
      </div>
    );
  },
};

export default NexusVideo;
