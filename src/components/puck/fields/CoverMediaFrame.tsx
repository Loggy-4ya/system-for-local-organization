"use client";

/**
 * @fileoverview Unified media frame — object-fit for raster/video and container-query cover for iframes.
 *
 * @module src/components/puck/fields/CoverMediaFrame
 */

import { cn } from "@/lib/utils";
import type { MediaFitMode } from "../lib/mediaFitMode";
import type { CSSProperties, ReactNode } from "react";

/** Props for {@link CoverMediaFrame}. */
export interface CoverMediaFrameProps {
  /** Cover crops to fill; contain letterboxes with themed background. */
  fit?: MediaFitMode;
  /** Width÷height for iframe cover math (e.g. 16/9 → 1.777…). */
  embedAspect?: number;
  /** Extra classes on the outer frame. */
  className?: string;
  /** Inline styles on the outer frame. */
  style?: CSSProperties;
  /** Media element(s) — img, video, iframe, or placeholder. */
  children: ReactNode;
}

/**
 * Overflow-hidden frame that applies consistent cover/contain behavior to all media types.
 *
 * Raster/video children should use class `nexus-media-cover__media`. Iframes use
 * `nexus-media-cover__embed` so container queries can scale them like `object-fit: cover`.
 *
 * @param props - See {@link CoverMediaFrameProps}.
 * @returns Sized media frame.
 */
export function CoverMediaFrame({
  fit = "cover",
  embedAspect,
  className,
  style,
  children,
}: CoverMediaFrameProps) {
  const frameStyle: CSSProperties = {
    ...style,
    ...(embedAspect != null && Number.isFinite(embedAspect) && embedAspect > 0
      ? { ["--nexus-embed-aspect" as string]: embedAspect }
      : {}),
  };

  return (
    <div
      className={cn(
        "nexus-media-cover",
        fit === "contain" ? "nexus-media-cover--contain" : "nexus-media-cover--cover",
        className,
      )}
      style={frameStyle}
    >
      {children}
    </div>
  );
}

export default CoverMediaFrame;
