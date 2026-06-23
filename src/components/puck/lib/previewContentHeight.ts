/**
 * @fileoverview Measure preview iframe content height and sync Puck zoom rootHeight.
 *
 * Edit mode must size the canvas to page content — not stretch to the iframe viewport,
 * which creates an "infinite" empty scrollport through the transparent letterbox grid.
 * Measurements use intrinsic scroll heights (not clipped bounding boxes) so a small
 * `rootHeight` cannot collapse the measured content in a feedback loop.
 *
 * Tests: `tests/puck/lib/previewContentHeight.test.ts` — `npm run test:preview-content-height`
 *
 * @module src/components/puck/lib/previewContentHeight
 */

import {
  resolvePuckPreviewVisualScale,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";
import {
  PUCK_CANVAS_SHELL_SELECTOR,
  PUCK_MOBILE_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import {
  matchesDesktopEditorLayoutViewport,
  resolveInteractivePreviewInnerContentHeightPx,
  resolveInteractivePreviewShellViewportPx,
} from "@/components/puck/lib/interactivePreviewScrollport";
import {
  resolvePuckPreviewModeFromDocument,
  type PuckPreviewMode,
} from "@/components/puck/lib/puckPreviewMode";

/** CSS selector for the primary page content column inside the preview iframe. */
export const PREVIEW_PAGE_CONTENT_SLOT_SELECTOR = ".global-layout-page-content-slot";

/** Block column inside the page slot — stays content-sized when the slot flex-stretches. */
export const PREVIEW_PAGE_CONTENT_COLUMN_SELECTOR = ".global-layout-page-content-slot > div";

/** Puck preview mount inside the iframe — wraps PageRoot and drop zones. */
export const PREVIEW_FRAME_ROOT_ID = "frame-root";

/** Minimum unscaled root height for an empty editor page (welcome placeholder). */
export const PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX = 320;

/** Extra iframe height for Puck drag overlays below the last block (edit mode only). */
export const PREVIEW_CONTENT_HEIGHT_OVERLAY_PAD_PX = 48;

/**
 * Resolve overlay padding applied on top of measured block height when syncing `rootHeight`.
 *
 * @param previewMode - Active Puck preview mode.
 * @returns Overlay pad in px (zero in interactive preview — no drag chrome).
 */
export function resolvePreviewContentHeightOverlayPadPx(
  previewMode: PuckPreviewMode = "edit",
): number {
  return previewMode === "interactive" ? 0 : PREVIEW_CONTENT_HEIGHT_OVERLAY_PAD_PX;
}

/**
 * Resolve the largest intrinsic height among candidate elements.
 *
 * Uses `scrollHeight` / `offsetHeight` — not `getBoundingClientRect()` — so iframe
 * viewport clipping does not under-report content when `rootHeight` is temporarily low.
 *
 * @param element - Measured element.
 * @returns Intrinsic height in px, or 0 when unavailable.
 */
export function measureElementIntrinsicHeightPx(element: Element | null | undefined): number {
  if (!element || typeof element !== "object") {
    return 0;
  }

  const node = element as HTMLElement;
  const scrollHeight = node.scrollHeight;
  const offsetHeight = node.offsetHeight;
  const intrinsic = Math.max(
    Number.isFinite(scrollHeight) ? scrollHeight : 0,
    Number.isFinite(offsetHeight) ? offsetHeight : 0,
  );

  return intrinsic > 0 ? Math.ceil(intrinsic) : 0;
}

/**
 * Measure intrinsic page block height from the content slot only (no overlay padding).
 *
 * `#frame-root`, `body`, and `documentElement` are excluded — Puck assigns them the
 * current `rootHeight` viewport, so their `scrollHeight` creates a +48px-per-sync creep
 * when combined with {@link PREVIEW_CONTENT_HEIGHT_OVERLAY_PAD_PX}.
 *
 * @param doc - Preview iframe document.
 * @returns Unscaled block height in px, or null when the slot is not yet mounted.
 */
export function measurePreviewPageSlotHeightPx(doc: Document | null | undefined): number | null {
  if (!doc?.documentElement) {
    return null;
  }

  const columnHeight = measureElementIntrinsicHeightPx(
    doc.querySelector(PREVIEW_PAGE_CONTENT_COLUMN_SELECTOR),
  );
  const slotHeight = measureElementIntrinsicHeightPx(
    doc.querySelector(PREVIEW_PAGE_CONTENT_SLOT_SELECTOR),
  );

  if (columnHeight > 0 && (slotHeight === 0 || columnHeight <= slotHeight)) {
    return columnHeight;
  }

  if (slotHeight > 0) {
    return slotHeight;
  }

  return null;
}

/**
 * Measure the rendered page content height inside the preview iframe.
 *
 * Uses {@link measurePreviewPageSlotHeightPx} plus mode-specific overlay padding.
 * Returns null before the content slot mounts so callers can fall back to the canvas
 * shell floor once.
 *
 * @param doc - Preview iframe document.
 * @param previewMode - Active preview mode (`edit` applies drag overlay pad).
 * @returns Target Puck `rootHeight` in px, or null when unavailable.
 */
export function measurePreviewIframeContentHeightPx(
  doc: Document | null | undefined,
  previewMode?: PuckPreviewMode,
): number | null {
  if (!doc?.documentElement) {
    return null;
  }

  const slotHeight = measurePreviewPageSlotHeightPx(doc);
  if (slotHeight === null) {
    return null;
  }

  const resolvedMode = previewMode ?? resolvePuckPreviewModeFromDocument();
  return Math.ceil(slotHeight + resolvePreviewContentHeightOverlayPadPx(resolvedMode));
}

/**
 * Resolve the minimum Puck `rootHeight` from measured canvas shell viewport height.
 *
 * Keeps the edit canvas at least as tall as the bordered shell when content is sparse,
 * without reintroducing viewport-fill stretch on the page document itself.
 *
 * @param config - Sanitized zoom config candidate.
 * @param shellClientHeightPx - Desktop canvas shell viewport height in px.
 * @returns Minimum unscaled root height in px.
 */
export function resolvePreviewCanvasMinRootHeightPx(
  config: PuckZoomConfig,
  shellClientHeightPx: number | null | undefined,
): number {
  const scale = resolvePuckPreviewVisualScale(config);
  if (
    shellClientHeightPx === null ||
    shellClientHeightPx === undefined ||
    shellClientHeightPx <= 0 ||
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    return PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX;
  }

  return Math.max(PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX, Math.ceil(shellClientHeightPx / scale));
}

/**
 * Resolve the desktop canvas shell viewport height for min-root-height math.
 *
 * @returns Shell client height in px, or null when unavailable.
 */
export function resolvePreviewCanvasShellClientHeightPx(): number | null {
  if (typeof document === "undefined") {
    return null;
  }

  const shell =
    (document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
    (document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null);
  const height = shell?.clientHeight ?? 0;
  return height > 0 && Number.isFinite(height) ? height : null;
}

/**
 * Sync Puck `rootHeight` to measured page content (grow and shrink).
 *
 * When content height is known, `rootHeight` is `max(content, canvas shell viewport floor)` so sparse
 * pages fill the bordered panel while tall pages grow with blocks. When content is not yet measurable,
 * falls back to the shell viewport minimum once the canvas shell is laid out.
 *
 * @param config - Sanitized zoom config candidate.
 * @param contentHeightPx - Measured iframe content height in px.
 * @param canvasMinRootHeightPx - Shell viewport floor when content height is unknown.
 * @returns Zoom config with reactive `rootHeight`.
 */
export function syncPuckRootHeightToMeasuredContent(
  config: PuckZoomConfig,
  contentHeightPx: number | null,
  canvasMinRootHeightPx: number = PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX,
): PuckZoomConfig {
  const viewportFloor = Math.max(
    PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX,
    Math.ceil(canvasMinRootHeightPx),
  );

  if (contentHeightPx === null || contentHeightPx <= 0) {
    if (config.rootHeight >= viewportFloor) {
      return config;
    }

    return {
      ...config,
      rootHeight: viewportFloor,
    };
  }

  const targetRootHeight = Math.max(viewportFloor, Math.ceil(contentHeightPx));

  if (config.rootHeight === targetRootHeight) {
    return config;
  }

  return {
    ...config,
    rootHeight: targetRootHeight,
  };
}

/**
 * Clamp Puck `rootHeight` so the scaled preview cannot exceed measured page content.
 *
 * @deprecated Prefer {@link syncPuckRootHeightToMeasuredContent} — clamp-only cannot grow when blocks are added.
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

  const maxRootHeight = Math.max(1, Math.ceil(contentHeightPx));
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
 * Sync zoom config using live preview iframe content measurements.
 *
 * @param config - Sanitized zoom config candidate.
 * @returns Zoom config aligned to measured content height.
 */
export function syncPuckRootHeightToPreviewContent(
  config: PuckZoomConfig,
  previewMode?: PuckPreviewMode,
): PuckZoomConfig {
  const resolvedMode = previewMode ?? resolvePuckPreviewModeFromDocument();
  const shellClientHeightPx = resolvePreviewCanvasShellClientHeightPx();
  const interactiveInnerContentHeightPx =
    resolvedMode === "interactive" && matchesDesktopEditorLayoutViewport()
      ? resolveInteractivePreviewInnerContentHeightPx()
      : null;
  const interactiveShellViewportPx = resolveInteractivePreviewShellViewportPx(
    interactiveInnerContentHeightPx ?? shellClientHeightPx,
    0,
  );
  const canvasMinRootHeightPx = resolvePreviewCanvasMinRootHeightPx(
    config,
    resolvedMode === "interactive" ? interactiveShellViewportPx : shellClientHeightPx,
  );

  if (resolvedMode === "interactive") {
    // Shell not laid out yet — do not lock to the empty-page floor (320px overlap flash).
    if (interactiveShellViewportPx === null) {
      return config;
    }

    const viewportRootHeight = Math.max(
      PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX,
      Math.ceil(canvasMinRootHeightPx),
    );

    if (config.rootHeight === viewportRootHeight) {
      return config;
    }

    return {
      ...config,
      rootHeight: viewportRootHeight,
    };
  }

  const contentHeightPx = measurePreviewIframeContentHeightPx(
    resolvePreviewIframeDocument(),
    resolvedMode,
  );

  return syncPuckRootHeightToMeasuredContent(config, contentHeightPx, canvasMinRootHeightPx);
}

/**
 * Clamp zoom config using live preview iframe content measurements.
 *
 * @deprecated Prefer {@link syncPuckRootHeightToPreviewContent}.
 * @param config - Sanitized zoom config candidate.
 * @returns Zoom config bounded to measured content height.
 */
export function clampPuckRootHeightToPreviewContent(config: PuckZoomConfig): PuckZoomConfig {
  return clampPuckRootHeightToMeasuredContent(
    config,
    measurePreviewIframeContentHeightPx(resolvePreviewIframeDocument()),
  );
}

/**
 * Observe preview iframe content and invoke a callback when intrinsic height may have changed.
 *
 * Combines `ResizeObserver` (layout-driven blocks) with `MutationObserver` (DOM edits) because
 * constrained iframe viewports do not always emit resize events when `scrollHeight` grows.
 *
 * @param onChange - Debounced callback (one animation frame).
 * @returns Teardown function.
 */
export function installPreviewContentHeightSync(onChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  let rafId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let mountObserver: MutationObserver | null = null;

  const schedule = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      onChange();
    });
  };

  const attachToPreviewDocument = (doc: Document) => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();

    const slot = doc.querySelector(PREVIEW_PAGE_CONTENT_SLOT_SELECTOR);

    resizeObserver = new ResizeObserver(schedule);
    if (slot instanceof Element) {
      resizeObserver.observe(slot);
    }

    mutationObserver = new MutationObserver(schedule);
    const mutationRoot = slot ?? doc.body;
    if (mutationRoot) {
      mutationObserver.observe(mutationRoot, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    schedule();
  };

  const iframe = document.getElementById("preview-frame") as HTMLIFrameElement | null;
  const existingDoc = iframe?.contentDocument ?? null;
  if (existingDoc?.body) {
    attachToPreviewDocument(existingDoc);
  }

  mountObserver = new MutationObserver(() => {
    const frame = document.getElementById("preview-frame") as HTMLIFrameElement | null;
    const doc = frame?.contentDocument ?? null;
    if (doc?.body) {
      attachToPreviewDocument(doc);
    }
  });

  const puckRoot = document.querySelector(".Puck");
  if (puckRoot) {
    mountObserver.observe(puckRoot, { childList: true, subtree: true });
  }

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    mountObserver?.disconnect();
  };
}
