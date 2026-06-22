"use client";

/**
 * @fileoverview Readable image preview for Puck sidebar and settings upload fields.
 *
 * Uses `object-fit: contain` at a taller minimum height so text in screenshots
 * remains legible in the small settings panel.
 *
 * @module src/components/media/SettingsMediaPreview
 */

import { cn } from "@/lib/utils";

/** Props for {@link SettingsMediaPreview}. */
export interface SettingsMediaPreviewProps {
  /** Media URL — image or video. */
  src: string;
  /** Accessible label for raster previews. */
  alt?: string;
  /** Optional className on the outer frame. */
  className?: string;
}

/**
 * Sidebar-sized media preview with readable contain scaling.
 *
 * @param props - Preview source and labelling.
 * @returns Preview frame or null when src is empty.
 */
export function SettingsMediaPreview({ src, alt = "Preview", className }: SettingsMediaPreviewProps) {
  if (!src?.trim()) return null;

  const isVideo =
    src.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || src.includes("video");

  return (
    <div
      className={cn("nexus-settings-media-preview", className)}
      data-nexus-settings-media-preview=""
    >
      {isVideo ? (
        <video
          src={src}
          className="nexus-settings-media-preview__media"
          controls
          muted
          playsInline
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="nexus-settings-media-preview__media" />
      )}
    </div>
  );
}

export default SettingsMediaPreview;
