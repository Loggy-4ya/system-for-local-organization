"use client";

/**
 * @fileoverview Freeze Puck canvas layout while the compact plugin panel height changes.
 *
 * Panel animations resize the editor grid. Puck auto-zoom reacts and re-renders the
 * preview on every tick. This module captures canvas transform once per mutation and
 * re-applies only when Puck overwrites it — height is left to the CSS grid transition.
 *
 * @module src/components/puck/NexusMobilePanelCanvasStabilizer
 */

import { useEffect, useRef } from "react";
import { isMobilePanelLayoutMutating } from "@/components/puck/lib/mobilePanelLayout";
import { PUCK_CANVAS_TRANSFORM_FROZEN_ATTR } from "@/components/puck/lib/sanitizePuckZoomConfig";

/** Puck preview root inside the canvas — receives zoom `height` / `transform`. */
const PUCK_CANVAS_ROOT_ID = "puck-canvas-root";

/** Snapshot of canvas root layout captured at mutation start. */
interface FrozenCanvasStyle {
  transform: string;
}

/**
 * Capture current canvas root transform for the freeze snapshot.
 *
 * Height is intentionally omitted so the editor grid can resize smoothly with the
 * compact panel open/close CSS transition.
 *
 * @returns Frozen style snapshot or null when the root is missing.
 */
function captureFrozenCanvasStyle(): FrozenCanvasStyle | null {
  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!root) return null;

  const transform = root.style.transform;
  const safeTransform =
    transform && !transform.includes("NaN") && transform !== "none" ? transform : "scale(1)";

  return {
    transform: safeTransform,
  };
}

/**
 * Apply captured transform to `#puck-canvas-root` with `!important` to beat React updates.
 *
 * @param frozen - Layout snapshot from mutation start.
 */
function applyFrozenCanvasStyle(frozen: FrozenCanvasStyle): void {
  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!root) return;

  root.setAttribute(PUCK_CANVAS_TRANSFORM_FROZEN_ATTR, "");
  root.style.setProperty("transform", frozen.transform, "important");
}

/**
 * Remove freeze overrides so Puck can run a single post-mutation auto-zoom pass.
 */
function clearFrozenCanvasStyle(): void {
  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!root?.hasAttribute(PUCK_CANVAS_TRANSFORM_FROZEN_ATTR)) return;

  root.removeAttribute(PUCK_CANVAS_TRANSFORM_FROZEN_ATTR);
  root.style.removeProperty("transform");
}

/**
 * Observe compact panel layout mutations and freeze canvas preview layout.
 *
 * @returns null
 */
export function NexusMobilePanelCanvasStabilizer() {
  const frozenRef = useRef<FrozenCanvasStyle | null>(null);
  const wasMutatingRef = useRef(false);
  const reapplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasObserverRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const clearReapplyTimer = () => {
      if (reapplyTimerRef.current !== null) {
        clearTimeout(reapplyTimerRef.current);
        reapplyTimerRef.current = null;
      }
    };

    const scheduleReapply = () => {
      if (!frozenRef.current || !wasMutatingRef.current) return;
      if (reapplyTimerRef.current !== null) return;

      reapplyTimerRef.current = setTimeout(() => {
        reapplyTimerRef.current = null;
        if (frozenRef.current) {
          applyFrozenCanvasStyle(frozenRef.current);
        }
      }, 120);
    };

    const observeCanvasRoot = () => {
      canvasObserverRef.current?.disconnect();

      const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
      if (!root) return;

      canvasObserverRef.current = new MutationObserver(scheduleReapply);
      canvasObserverRef.current.observe(root, {
        attributes: true,
        attributeFilter: ["style"],
      });
    };

    const unobserveCanvasRoot = () => {
      canvasObserverRef.current?.disconnect();
      canvasObserverRef.current = null;
      clearReapplyTimer();
    };

    const syncMutationState = () => {
      const mutating = isMobilePanelLayoutMutating();

      if (mutating && !wasMutatingRef.current) {
        frozenRef.current = captureFrozenCanvasStyle();
        if (frozenRef.current) {
          applyFrozenCanvasStyle(frozenRef.current);
        }
        observeCanvasRoot();
      }

      if (!mutating && wasMutatingRef.current) {
        unobserveCanvasRoot();
        frozenRef.current = null;
        clearFrozenCanvasStyle();
      }

      wasMutatingRef.current = mutating;
    };

    syncMutationState();

    const observer = new MutationObserver(syncMutationState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-nexus-panel-layout-mutating",
        "data-nexus-panel-resizing",
        "data-nexus-panel-closing",
        "data-nexus-panel-opening",
        "data-nexus-panel-expanding",
        "data-nexus-panel-collapsing",
        "data-nexus-panel-close-settling",
      ],
    });

    return () => {
      observer.disconnect();
      unobserveCanvasRoot();
      frozenRef.current = null;
      wasMutatingRef.current = false;
      clearFrozenCanvasStyle();
    };
  }, []);

  return null;
}

export default NexusMobilePanelCanvasStabilizer;
