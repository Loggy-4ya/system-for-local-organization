"use client";

/**
 * @fileoverview Stabilize Puck canvas layout while sidebar resize handles drag.
 *
 * Puck recalculates auto-zoom on every canvas `ResizeObserver` tick during sidebar
 * drag. That produces `height: NaN` when the frame momentarily measures 0px and
 * causes visible preview flicker. This module toggles `data-nexus-sidebar-resizing`
 * and freezes `#puck-canvas-root` inline dimensions for the drag duration.
 *
 * @module src/components/puck/NexusSidebarResizeStabilizer
 */

import { useEffect, useRef } from "react";
import {
  PUCK_CANVAS_INNER_SELECTOR,
  PUCK_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import { PUCK_CANVAS_TRANSFORM_FROZEN_ATTR } from "@/components/puck/lib/sanitizePuckZoomConfig";
import {
  clearInlinePreviewZoomPresentation,
  isInlinePreviewZoomHost,
  resolvePuckPreviewTransformElement,
} from "@/components/puck/lib/inlinePreviewScaleHost";

/** Attribute set on `<html>` while a Puck sidebar resize handle is active. */
export const NEXUS_SIDEBAR_RESIZING_ATTR = "data-nexus-sidebar-resizing";

/** Puck preview root inside the canvas — receives zoom `height` / `transform`. */
const PUCK_CANVAS_ROOT_ID = "puck-canvas-root";

/** Snapshot of canvas root layout captured at drag start. */
interface FrozenCanvasStyle {
  heightPx: number;
  transform: string;
  zoom: string;
}

/**
 * Capture current canvas root layout for the drag-freeze loop.
 *
 * @returns Frozen style snapshot or null when the root is missing.
 */
function captureFrozenCanvasStyle(): FrozenCanvasStyle | null {
  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!root) return null;

  const rect = root.getBoundingClientRect();
  const frameEl =
    (document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
    (document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null);
  const frameHeight = frameEl?.clientHeight ?? frameEl?.getBoundingClientRect().height ?? 0;
  const heightPx = rect.height > 0 ? rect.height : frameHeight;

  if (heightPx <= 0) return null;

  const transformEl = resolvePuckPreviewTransformElement() ?? root;
  const transform = transformEl.style.transform;
  const safeTransform =
    transform && !transform.includes("NaN") && transform !== "none" ? transform : "scale(1)";
  const zoom = transformEl.style.zoom;
  const safeZoom =
    zoom && zoom !== "normal" && !zoom.includes("NaN") ? zoom : "1";

  return {
    heightPx,
    transform: safeTransform,
    zoom: safeZoom,
  };
}

/**
 * Apply captured layout to `#puck-canvas-root` with `!important` to beat React updates.
 *
 * @param frozen - Layout snapshot from drag start.
 */
function applyFrozenCanvasStyle(frozen: FrozenCanvasStyle): void {
  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!root) return;

  const transformEl = resolvePuckPreviewTransformElement() ?? root;

  root.setAttribute(PUCK_CANVAS_TRANSFORM_FROZEN_ATTR, "");
  root.style.setProperty("height", `${frozen.heightPx}px`, "important");
  root.style.setProperty("transition", "none", "important");
  if (isInlinePreviewZoomHost(transformEl)) {
    transformEl.style.setProperty("zoom", frozen.zoom, "important");
    transformEl.style.setProperty("transform", "none", "important");
    root.style.setProperty("transform", "none", "important");
    root.style.setProperty("zoom", "normal", "important");
  } else {
    transformEl.style.setProperty("transform", frozen.transform, "important");
    if (transformEl !== root) {
      root.style.setProperty("transform", "none", "important");
    }
  }
}

/**
 * Remove drag-freeze overrides so Puck can run its post-drag auto-zoom once.
 */
function clearFrozenCanvasStyle(): void {
  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!root?.hasAttribute(PUCK_CANVAS_TRANSFORM_FROZEN_ATTR)) return;

  const transformEl = resolvePuckPreviewTransformElement() ?? root;

  root.removeAttribute(PUCK_CANVAS_TRANSFORM_FROZEN_ATTR);
  root.style.removeProperty("height");
  root.style.removeProperty("transform");
  root.style.removeProperty("zoom");
  root.style.removeProperty("transition");
  if (isInlinePreviewZoomHost(transformEl)) {
    clearInlinePreviewZoomPresentation(transformEl);
  } else {
    transformEl.style.removeProperty("transform");
  }
}

/**
 * Observe Puck's resize overlay and expose a stable document-level flag.
 *
 * @returns null
 */
export function NexusSidebarResizeStabilizer() {
  const rafRef = useRef<number | null>(null);
  const frozenRef = useRef<FrozenCanvasStyle | null>(null);
  const wasResizingRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const stopRaf = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const runFreezeLoop = () => {
      if (!document.documentElement.hasAttribute(NEXUS_SIDEBAR_RESIZING_ATTR)) {
        stopRaf();
        return;
      }

      if (!frozenRef.current) {
        frozenRef.current = captureFrozenCanvasStyle();
      }

      if (frozenRef.current) {
        applyFrozenCanvasStyle(frozenRef.current);
      }

      rafRef.current = requestAnimationFrame(runFreezeLoop);
    };

    const syncFlag = () => {
      // Only freeze for Puck's horizontal sidebar drag — not compact vertical panel resize.
      const resizing = Boolean(document.querySelector("[data-resize-overlay]"));
      document.documentElement.toggleAttribute(NEXUS_SIDEBAR_RESIZING_ATTR, resizing);

      if (resizing && !wasResizingRef.current) {
        frozenRef.current = captureFrozenCanvasStyle();
        stopRaf();
        runFreezeLoop();
      }

      if (!resizing && wasResizingRef.current) {
        stopRaf();
        frozenRef.current = null;
        clearFrozenCanvasStyle();
      }

      wasResizingRef.current = resizing;
    };

    syncFlag();

    const observer = new MutationObserver(syncFlag);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      stopRaf();
      frozenRef.current = null;
      wasResizingRef.current = false;
      document.documentElement.removeAttribute(NEXUS_SIDEBAR_RESIZING_ATTR);
      clearFrozenCanvasStyle();
    };
  }, []);

  return null;
}

export default NexusSidebarResizeStabilizer;
