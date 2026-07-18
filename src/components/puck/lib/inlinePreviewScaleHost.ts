/**
 * @fileoverview Inline Puck preview scale host — keeps zoom off overlay portal siblings.
 *
 * With `iframe.enabled: false`, Puck portals `[data-puck-overlay]` into `#preview-frame`.
 * A `transform: scale()` on `#puck-canvas-root` makes that ancestor the containing block for
 * absolute overlays while Puck positions them from viewport `getBoundingClientRect()` coords —
 * the duplicate/delete action bar drifts away from the selection ring.
 *
 * Page content is wrapped in `#nexus-puck-preview-scale-host` at React render time
 * ({@link PageRoot}); overlays stay direct children of `#preview-frame` outside the scaled subtree.
 *
 * Inline zoom uses the non-standard CSS `zoom` property (not `transform: scale`) so layout boxes
 * grow with the preview — `transform` on an inner ancestor leaves unscaled overflow clips on
 * section containers and crops text at every viewport preset.
 *
 * @module src/components/puck/lib/inlinePreviewScaleHost
 */

import { isInlinePuckPreview } from "@/components/puck/lib/previewIframeDocumentReady";

/** DOM id for the scaled content wrapper inside inline `#preview-frame`. */
export const NEXUS_INLINE_PREVIEW_SCALE_HOST_ID = "nexus-puck-preview-scale-host";

/** Puck canvas root — receives layout width/height in inline mode (not zoom/transform). */
const PUCK_CANVAS_ROOT_ID = "puck-canvas-root";

/** Float tolerance when comparing Puck zoom to parsed CSS zoom. */
const INLINE_ZOOM_PRESENTATION_TOLERANCE = 0.001;

/**
 * Parse a CSS `zoom` inline value.
 *
 * @param zoom - CSS zoom value (`"1"`, `"0.92"`, `"normal"`, etc.).
 * @returns Numeric zoom factor or null when not parseable.
 */
export function parseCssZoom(zoom: string | null | undefined): number | null {
  if (!zoom || zoom === "normal") {
    return null;
  }

  const parsed = Number.parseFloat(zoom);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

/**
 * Whether the element is the inline preview zoom host.
 *
 * @param element - Candidate DOM node.
 * @returns True when inline preview zoom should use CSS `zoom` on this host.
 */
export function isInlinePreviewZoomHost(element: HTMLElement | null | undefined): boolean {
  return Boolean(isInlinePuckPreview() && element?.id === NEXUS_INLINE_PREVIEW_SCALE_HOST_ID);
}

/**
 * Read the visual scale factor applied to a preview zoom target element.
 *
 * @param element - `#nexus-puck-preview-scale-host` or `#puck-canvas-root`.
 * @returns Parsed zoom/transform scale or null.
 */
export function readPuckPreviewVisualScaleFromElement(
  element: HTMLElement | null | undefined,
): number | null {
  if (!element) {
    return null;
  }

  if (isInlinePreviewZoomHost(element)) {
    return parseCssZoom(element.style.zoom);
  }

  const scaleMatch = element.style.transform.match(/scale\(([\d.]+)\)/);
  if (scaleMatch) {
    return Number.parseFloat(scaleMatch[1]);
  }

  return null;
}

/**
 * Apply inline preview zoom presentation on the scale host.
 *
 * @param host - `#nexus-puck-preview-scale-host`.
 * @param zoom - Puck zoom factor.
 */
export function applyInlinePreviewZoomPresentation(host: HTMLElement, zoom: number): void {
  host.style.zoom = String(zoom);
  host.style.removeProperty("transform");
  host.style.removeProperty("transform-origin");
}

/**
 * Clear inline preview zoom presentation from the scale host.
 *
 * @param host - `#nexus-puck-preview-scale-host`.
 */
export function clearInlinePreviewZoomPresentation(host: HTMLElement): void {
  host.style.removeProperty("zoom");
  host.style.removeProperty("transform");
  host.style.removeProperty("transform-origin");
}

/**
 * Whether inline scale-host zoom drifted from the expected Puck zoom factor.
 *
 * @param host - `#nexus-puck-preview-scale-host`.
 * @param expectedZoom - Target zoom from Puck store.
 * @returns True when zoom should be re-applied.
 */
export function inlinePreviewZoomPresentationDrifted(
  host: HTMLElement | null | undefined,
  expectedZoom: number,
): boolean {
  if (!host || !isInlinePreviewZoomHost(host)) {
    return false;
  }

  const parsedZoom = readPuckPreviewVisualScaleFromElement(host);
  const zoomDrifted =
    parsedZoom === null || Math.abs(parsedZoom - expectedZoom) > INLINE_ZOOM_PRESENTATION_TOLERANCE;

  const transformDrifted =
    host.style.transform !== "" && host.style.transform !== "none" && host.style.transform.length > 0;

  return zoomDrifted || transformDrifted;
}

/**
 * Resolve the element that receives Puck preview zoom (`zoom` inline, `transform` iframe).
 *
 * @returns Scale host when inline preview is active, otherwise `#puck-canvas-root`.
 */
export function resolvePuckPreviewTransformElement(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (isInlinePuckPreview()) {
    const host = document.getElementById(NEXUS_INLINE_PREVIEW_SCALE_HOST_ID);
    if (host instanceof HTMLElement) {
      return host;
    }
  }

  return document.getElementById(PUCK_CANVAS_ROOT_ID) as HTMLElement | null;
}
