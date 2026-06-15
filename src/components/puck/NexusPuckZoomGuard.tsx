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
import { isMobilePanelLayoutMutating } from "@/components/puck/lib/mobilePanelLayout";
import { isAnyCanvasDragActive } from "@/components/puck/lib/canvasDropTargetLogic";
import {
  PUCK_CANVAS_INNER_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import {
  DEFAULT_PUCK_ZOOM_CONFIG,
  resolvePuckAppStore,
  resolvePuckScaledRootHeightPx,
  sanitizePuckZoomConfig,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";

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
  if (typeof document === "undefined" || isCanvasZoomMutationBlocked()) {
    return;
  }

  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  if (!root || !inner) {
    return;
  }

  const measured = root.getBoundingClientRect().height;
  const fallback =
    config !== undefined ? resolvePuckScaledRootHeightPx(config) : null;
  const visualHeight = measured > 0 && Number.isFinite(measured) ? measured : fallback;

  if (visualHeight === null || visualHeight <= 0) {
    return;
  }

  inner.style.setProperty("height", `${Math.ceil(visualHeight)}px`, "important");
}

/**
 * Remove scrollport height override so Puck can reclaim inner sizing when the guard unmounts.
 */
function clearCanvasInnerScrollportHeight(): void {
  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  inner?.style.removeProperty("height");
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
        syncCanvasInnerScrollportHeight(config);
      });
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

    const mountObserver = new MutationObserver(observeRoot);
    const puckRoot = document.querySelector(".Puck");
    if (puckRoot) {
      mountObserver.observe(puckRoot, { childList: true, subtree: true });
    }

    return () => {
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

      const sanitized = sanitizePuckZoomConfig(next, zoomFallbackRef.current);
      zoomFallbackRef.current = sanitized;
      originalSetZoom(sanitized);

      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          syncCanvasInnerScrollportHeight(sanitized);
        });
      }
    };

    appStore.setState({ setZoomConfig: patchedSetZoom });

    return () => {
      appStore.setState({ setZoomConfig: originalSetZoom });
    };
  }, []);

  return null;
}

export default NexusPuckZoomGuard;
