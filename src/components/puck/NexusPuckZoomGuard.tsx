"use client";

/**
 * @fileoverview Production-safe Puck zoom sanitization and canvas scrollport height sync.
 *
 * Patches Puck's internal `setZoomConfig` so NaN / runaway heights never reach the preview,
 * and keeps `.PuckCanvas-inner` height aligned with the scaled `#puck-canvas-root` bounds so
 * zoom-out / fit-to-screen does not leave a multi-thousand-pixel empty scrollport.
 *
 * Mount via {@link puckEditorOverrides} `PuckRootOverride`.
 *
 * @module src/components/puck/NexusPuckZoomGuard
 */

import { useEffect, useRef } from "react";
import { NEXUS_SIDEBAR_RESIZING_ATTR } from "@/components/puck/NexusSidebarResizeStabilizer";
import {
  isMobilePanelHeightTransitionActive,
  isMobilePanelLayoutMutating,
  NEXUS_PANEL_CLOSING_ATTR,
  NEXUS_PANEL_OPENING_ATTR,
  NEXUS_PANEL_CLOSE_SETTLING_ATTR,
} from "@/components/puck/lib/mobilePanelLayout";
import {
  clearMobilePreviewViewportOverrides,
} from "@/components/puck/lib/mobilePanelPreviewSync";
import { isAnyCanvasDragActive } from "@/components/puck/lib/canvasDropTargetLogic";
import {
  PUCK_CANVAS_INNER_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import {
  installPreviewContentHeightSync,
  syncPuckRootHeightToPreviewContent,
} from "@/components/puck/lib/previewContentHeight";
import {
  syncDesktopLetterboxCanvasScrollport,
  resetLetterboxScrollportState,
} from "@/components/puck/lib/canvasLetterboxScrollport";
import {
  installEditorCanvasScrollportBootstrap,
  resetEditorCanvasScrollports,
  syncInteractiveCanvasControlsInsetVar,
} from "@/components/puck/lib/interactivePreviewScrollport";
import { matchesDesktopEditorLayout } from "@/components/puck/lib/desktopEditorScrollport";
import {
  floorLetterboxDevicePreviewZoom,
  DEFAULT_PUCK_ZOOM_CONFIG,
  applyPuckCanvasRootZoomPresentation,
  resolvePuckAppStore,
  resolvePuckViewportWidthFromAppStore,
  sanitizePuckZoomConfig,
  type PuckInternalAppStore,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";
import {
  resolvePuckPreviewModeFromAppStore,
  type PuckPreviewMode,
} from "@/components/puck/lib/puckPreviewMode";
import { NEXUS_PANEL_LAYOUT_SETTLED_EVENT } from "@/components/puck/lib/sidebarLayoutLimits";

/** Puck internal store shape (subset) for viewport-driven zoom refresh. */
interface PuckViewportZoomAppStore {
  getState: () => {
    state: { ui: { viewports: { current: { width: number | "100%" } } } };
    zoomConfig: PuckZoomConfig;
    setZoomConfig: (config: PuckZoomConfig) => void;
  };
  subscribe: (listener: () => void) => () => void;
}

/**
 * Apply letterbox zoom from the active viewport preset and canvas frame width.
 *
 * @param appStore - Puck internal app store.
 * @param config - Candidate zoom config.
 * @returns Sanitized config with letterbox scale when applicable.
 */
function applyLetterboxZoomFloor(
  appStore: PuckInternalAppStore,
  config: PuckZoomConfig,
): PuckZoomConfig {
  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  const frameWidth =
    inner !== null && typeof inner.clientWidth === "number" && inner.clientWidth > 0
      ? inner.clientWidth
      : undefined;
  const viewportWidth = resolvePuckViewportWidthFromAppStore(appStore);

  if (viewportWidth === undefined) {
    return config;
  }

  return floorLetterboxDevicePreviewZoom(config, viewportWidth, frameWidth);
}

/** Puck preview root inside the canvas — receives zoom `height` / `transform`. */
const PUCK_CANVAS_ROOT_ID = "puck-canvas-root";

/**
 * Resolve the preview iframe document when the editor canvas is mounted.
 *
 * @returns Preview document or null when unavailable.
 */
function getPreviewDocument(): Document | null {
  if (typeof document === "undefined") {
    return null;
  }
  const iframe = document.getElementById("preview-frame") as HTMLIFrameElement | null;
  return iframe?.contentDocument ?? null;
}

/**
 * Whether canvas layout mutations should block zoom updates and inner-height sync.
 *
 * @returns True during sidebar drag-freeze, compact panel layout transitions, or canvas drag.
 */
function isCanvasZoomMutationBlocked(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  if (isMobilePanelHeightTransitionActive()) {
    return false;
  }

  return (
    document.documentElement.hasAttribute(NEXUS_SIDEBAR_RESIZING_ATTR) ||
    isMobilePanelLayoutMutating() ||
    isAnyCanvasDragActive(getPreviewDocument(), document)
  );
}

/**
 * Sync `.PuckCanvas-inner` height to the scaled visual bounds of `#puck-canvas-root`.
 *
 * Prefers live `getBoundingClientRect()` when available; falls back to zoom-config math.
 *
 * @param config - Last sanitized zoom config (optional fallback for math).
 */
function syncCanvasInnerScrollportHeight(config?: PuckZoomConfig): void {
  if (typeof document === "undefined") {
    return;
  }

  const blocked = isCanvasZoomMutationBlocked();
  const panelTransition = isMobilePanelHeightTransitionActive();
  if (blocked && !panelTransition) {
    return;
  }

  if (panelTransition && !matchesDesktopEditorLayout()) {
    return;
  }

  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  if (!inner) {
    return;
  }

  syncDesktopLetterboxCanvasScrollport(config);
}

/**
 * Remove scrollport height override so Puck can reclaim inner sizing when the guard unmounts.
 */
function clearCanvasInnerScrollportHeight(): void {
  clearMobilePreviewViewportOverrides();
  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  inner?.style.removeProperty("height");
  inner?.style.removeProperty("min-height");
  resetLetterboxScrollportState();
}

/**
 * Silent child of `<Puck>` — sanitizes zoom config in all environments and syncs canvas inner height.
 *
 * @returns null
 */
export function NexusPuckZoomGuard(): null {
  const zoomFallbackRef = useRef<PuckZoomConfig>(DEFAULT_PUCK_ZOOM_CONFIG);
  const syncRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const scheduleScrollportSync = (config?: PuckZoomConfig) => {
      if (syncRafRef.current !== null) {
        cancelAnimationFrame(syncRafRef.current);
      }

      syncRafRef.current = requestAnimationFrame(() => {
        syncRafRef.current = null;
        const resolvedConfig = config ?? zoomFallbackRef.current;
        applyPuckCanvasRootZoomPresentation(resolvedConfig);
        syncCanvasInnerScrollportHeight(resolvedConfig);
      });
    };

    const onPanelTransitionEnd = () => {
      if (isMobilePanelHeightTransitionActive()) {
        return;
      }

      clearMobilePreviewViewportOverrides();
      scheduleScrollportSync(zoomFallbackRef.current);
    };

    const rootObserver = new MutationObserver(() => {
      scheduleScrollportSync(zoomFallbackRef.current);
    });

    const observeRoot = () => {
      rootObserver.disconnect();
      const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
      if (!root) {
        return;
      }

      rootObserver.observe(root, {
        attributes: true,
        attributeFilter: ["style"],
      });
      scheduleScrollportSync(zoomFallbackRef.current);
    };

    observeRoot();

    const onPanelLayoutSettled = () => {
      clearMobilePreviewViewportOverrides();
      scheduleScrollportSync(zoomFallbackRef.current);
    };

    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, onPanelLayoutSettled);

    const panelTransitionObserver = new MutationObserver(onPanelTransitionEnd);
    panelTransitionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        NEXUS_PANEL_OPENING_ATTR,
        NEXUS_PANEL_CLOSING_ATTR,
        NEXUS_PANEL_CLOSE_SETTLING_ATTR,
      ],
    });
    onPanelTransitionEnd();

    const mountObserver = new MutationObserver(observeRoot);
    const puckRoot = document.querySelector(".Puck");
    if (puckRoot) {
      mountObserver.observe(puckRoot, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, onPanelLayoutSettled);
      panelTransitionObserver.disconnect();
      mountObserver.disconnect();
      rootObserver.disconnect();
      if (syncRafRef.current !== null) {
        cancelAnimationFrame(syncRafRef.current);
      }
      clearCanvasInnerScrollportHeight();
    };
  }, []);

  useEffect(() => {
    const appStore = resolvePuckAppStore();
    if (!appStore) {
      return;
    }

    const originalSetZoom = appStore.getState().setZoomConfig;

    const patchedSetZoom = (next: PuckZoomConfig) => {
      if (isCanvasZoomMutationBlocked()) {
        return;
      }

      const previewMode = resolvePuckPreviewModeFromAppStore(appStore);

      let sanitized = sanitizePuckZoomConfig(next, zoomFallbackRef.current);
      sanitized = applyLetterboxZoomFloor(appStore, sanitized);
      const synced = syncPuckRootHeightToPreviewContent(sanitized, previewMode);
      const current = sanitizePuckZoomConfig(
        appStore.getState().zoomConfig,
        zoomFallbackRef.current,
      );
      if (
        synced.rootHeight === current.rootHeight &&
        synced.zoom === current.zoom &&
        synced.autoZoom === current.autoZoom
      ) {
        zoomFallbackRef.current = synced;
        return;
      }

      zoomFallbackRef.current = synced;
      originalSetZoom(synced);

      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          applyPuckCanvasRootZoomPresentation(synced);
          syncCanvasInnerScrollportHeight(synced);
        });
      }
    };

    appStore.setState({ setZoomConfig: patchedSetZoom });

    const resyncRootHeightFromPreviewContent = () => {
      if (isCanvasZoomMutationBlocked()) {
        return;
      }

      const current = sanitizePuckZoomConfig(
        appStore.getState().zoomConfig,
        zoomFallbackRef.current,
      );
      patchedSetZoom(current);
    };

    const viewportStore = appStore as unknown as PuckViewportZoomAppStore;
    let lastViewportWidth = resolvePuckViewportWidthFromAppStore(appStore);
    let lastPreviewMode: PuckPreviewMode = resolvePuckPreviewModeFromAppStore(appStore);

    const unsubscribeViewport = viewportStore.subscribe(() => {
      const viewportWidth = resolvePuckViewportWidthFromAppStore(appStore);
      const previewMode = resolvePuckPreviewModeFromAppStore(appStore);

      if (previewMode !== lastPreviewMode) {
        lastPreviewMode = previewMode;
        resetLetterboxScrollportState();
        syncInteractiveCanvasControlsInsetVar(previewMode);
        resetEditorCanvasScrollports();
        resyncRootHeightFromPreviewContent();
        requestAnimationFrame(() => {
          syncCanvasInnerScrollportHeight(zoomFallbackRef.current);
        });
        return;
      }

      if (viewportWidth === lastViewportWidth) {
        return;
      }

      lastViewportWidth = viewportWidth;

      if (isCanvasZoomMutationBlocked()) {
        return;
      }

      const current = sanitizePuckZoomConfig(
        viewportStore.getState().zoomConfig,
        zoomFallbackRef.current,
      );
      const floored = applyLetterboxZoomFloor(appStore, current);

      if (
        floored.zoom === current.zoom &&
        floored.autoZoom === current.autoZoom &&
        floored.rootHeight === current.rootHeight
      ) {
        return;
      }

      patchedSetZoom(floored);
    });

    const teardownContentHeightSync = installPreviewContentHeightSync(
      resyncRootHeightFromPreviewContent,
    );

    const bootstrapPreviewScrollport = () => {
      const previewMode = resolvePuckPreviewModeFromAppStore(appStore);
      syncInteractiveCanvasControlsInsetVar(previewMode);
      resetEditorCanvasScrollports();
      resyncRootHeightFromPreviewContent();
      requestAnimationFrame(() => {
        syncCanvasInnerScrollportHeight(zoomFallbackRef.current);
      });
    };

    resetEditorCanvasScrollports();
    syncInteractiveCanvasControlsInsetVar(resolvePuckPreviewModeFromAppStore(appStore));
    const teardownScrollportBootstrap = installEditorCanvasScrollportBootstrap(
      bootstrapPreviewScrollport,
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resyncRootHeightFromPreviewContent();
      });
    });

    let frameResizeRaf: number | null = null;
    const scheduleLetterboxRecalcFromFrameResize = () => {
      if (frameResizeRaf !== null) {
        cancelAnimationFrame(frameResizeRaf);
      }

      frameResizeRaf = requestAnimationFrame(() => {
        frameResizeRaf = null;
        syncInteractiveCanvasControlsInsetVar(resolvePuckPreviewModeFromAppStore(appStore));
        resyncRootHeightFromPreviewContent();
      });
    };

    let frameResizeObserver: ResizeObserver | null = null;
    let lastObservedFrameWidthPx = 0;

    const observeCanvasInnerForLetterbox = () => {
      if (typeof ResizeObserver === "undefined") {
        return;
      }

      const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
      if (!inner) {
        return;
      }

      lastObservedFrameWidthPx = inner.clientWidth;

      if (!frameResizeObserver) {
        frameResizeObserver = new ResizeObserver((entries) => {
          const width = entries[0]?.contentRect.width ?? 0;
          if (width > 0 && Math.abs(width - lastObservedFrameWidthPx) < 1) {
            return;
          }

          lastObservedFrameWidthPx = width;
          scheduleLetterboxRecalcFromFrameResize();
        });
      }

      frameResizeObserver.disconnect();
      frameResizeObserver.observe(inner);
    };

    observeCanvasInnerForLetterbox();

    window.addEventListener("resize", scheduleLetterboxRecalcFromFrameResize);
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, scheduleLetterboxRecalcFromFrameResize);

    const mountFrameObserver = new MutationObserver(() => {
      observeCanvasInnerForLetterbox();
      scheduleLetterboxRecalcFromFrameResize();
    });
    const puckRoot = document.querySelector(".Puck");
    if (puckRoot) {
      mountFrameObserver.observe(puckRoot, { childList: true, subtree: true });
    }

    return () => {
      if (frameResizeRaf !== null) {
        cancelAnimationFrame(frameResizeRaf);
      }
      frameResizeObserver?.disconnect();
      mountFrameObserver.disconnect();
      window.removeEventListener("resize", scheduleLetterboxRecalcFromFrameResize);
      window.removeEventListener(
        NEXUS_PANEL_LAYOUT_SETTLED_EVENT,
        scheduleLetterboxRecalcFromFrameResize,
      );
      teardownScrollportBootstrap();
      teardownContentHeightSync();
      unsubscribeViewport();
      appStore.setState({ setZoomConfig: originalSetZoom });
    };
  }, []);

  return null;
}

export default NexusPuckZoomGuard;
