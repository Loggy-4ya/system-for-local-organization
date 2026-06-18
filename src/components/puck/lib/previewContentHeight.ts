/**
 * @fileoverview Measure preview iframe content height and clamp Puck zoom rootHeight.
 *
 * Edit mode must size the canvas to page content — not stretch to the iframe viewport,
 * which creates an "infinite" empty scrollport through the transparent letterbox grid.
 *
 * Tests: `tests/puck/lib/previewContentHeight.test.ts` — `npm run test:preview-content-height`
 *
 * @module src/components/puck/lib/previewContentHeight
 */

import type { PuckZoomConfig } from "@/components/puck/lib/sanitizePuckZoomConfig";

/** CSS selector for the primary page content column inside the preview iframe. */
export const PREVIEW_PAGE_CONTENT_SLOT_SELECTOR = ".global-layout-page-content-slot";

/**
 * Measure the rendered page content height inside the preview iframe.
 *
 * Prefers the page content slot bounding box; falls back to document scroll height.
 *
 * @param doc - Preview iframe document.
 * @returns Content height in px, or null when unavailable.
 */
export function measurePreviewIframeContentHeightPx(doc: Document | null | undefined): number | null {
  if (!doc?.documentElement) {
    return null;
  }

  const slot = doc.querySelector(PREVIEW_PAGE_CONTENT_SLOT_SELECTOR);
  if (slot) {
    const rect = slot.getBoundingClientRect();
    if (rect.height > 0 && Number.isFinite(rect.height)) {
      return Math.ceil(rect.height);
    }
  }

  const scrollHeight = doc.documentElement.scrollHeight;
  if (scrollHeight > 0 && Number.isFinite(scrollHeight)) {
    return Math.ceil(scrollHeight);
  }

  return null;
}

/**
 * Clamp Puck `rootHeight` so the scaled preview cannot exceed measured page content.
 *
 * @param config - Sanitized zoom config candidate.
 * @param contentHeightPx - Measured iframe content height in px.
 * @returns Zoom config with bounded `rootHeight`.
 */
export function clampPuckRootHeightToMeasuredContent(
  config: PuckZoomConfig,
  contentHeightPx: number | null,
): PuckZoomConfig {
  if (contentHeightPx === null || contentHeightPx <= 0) {
    return config;
  }

  const scale = config.zoom * config.autoZoom;
  if (!Number.isFinite(scale) || scale <= 0) {
    return config;
  }

  const maxRootHeight = Math.max(1, Math.ceil(contentHeightPx / scale));
  if (config.rootHeight <= maxRootHeight) {
    return config;
  }

  return {
    ...config,
    rootHeight: maxRootHeight,
  };
}

/**
 * Resolve preview iframe document from the editor shell.
 *
 * @returns Preview document or null when unavailable.
 */
export function resolvePreviewIframeDocument(): Document | null {
  if (typeof document === "undefined") {
    return null;
  }

  const iframe = document.getElementById("preview-frame") as HTMLIFrameElement | null;
  return iframe?.contentDocument ?? null;
}

/**
 * Clamp zoom config using live preview iframe content measurements.
 *
 * @param config - Sanitized zoom config candidate.
 * @returns Zoom config bounded to measured content height.
 */
export function clampPuckRootHeightToPreviewContent(config: PuckZoomConfig): PuckZoomConfig {
  const contentHeightPx = measurePreviewIframeContentHeightPx(resolvePreviewIframeDocument());
  return clampPuckRootHeightToMeasuredContent(config, contentHeightPx);
}
