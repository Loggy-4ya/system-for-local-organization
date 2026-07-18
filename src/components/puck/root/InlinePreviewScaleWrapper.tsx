"use client";

/**
 * @fileoverview React wrapper that receives inline Puck preview zoom transform.
 *
 * Rendered by {@link PageRoot} so `[data-puck-overlay]` portals stay outside the scaled subtree.
 *
 * @module src/components/puck/root/InlinePreviewScaleWrapper
 */

import type { ReactNode } from "react";
import { NEXUS_INLINE_PREVIEW_SCALE_HOST_ID } from "@/components/puck/lib/inlinePreviewScaleHost";

/** Props for {@link InlinePreviewScaleWrapper}. */
export interface InlinePreviewScaleWrapperProps {
  /** Page root subtree to scale inside inline preview. */
  children: ReactNode;
}

/**
 * Wrap Puck page content for inline preview zoom — overlays remain unscaled siblings.
 *
 * Zoom is applied via CSS `zoom` on this host (see {@link applyInlinePreviewZoomPresentation}),
 * not `transform: scale`, so block layout boxes track the visual scale and section overflow
 * does not crop text at device presets.
 *
 * @param props - Child page root render output.
 * @returns Scale host wrapper element.
 */
export function InlinePreviewScaleWrapper({ children }: InlinePreviewScaleWrapperProps) {
  return (
    <div
      id={NEXUS_INLINE_PREVIEW_SCALE_HOST_ID}
      className="nexus-puck-preview-scale-host"
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

export default InlinePreviewScaleWrapper;
