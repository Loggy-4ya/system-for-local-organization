"use client";

/**
 * @fileoverview Sync Puck canvas viewport preset when the editor window or canvas frame resizes.
 *
 * Reacts to sidebar open/close (grid track width changes) via `ResizeObserver` and layout
 * class mutations — not only `window.resize`.
 *
 * @module src/components/puck/PuckAutoViewportSync
 */

import { useGetPuck } from "@puckeditor/core";
import { useEffect, useRef } from "react";
import {
  NEXUS_EDITOR_VIEWPORTS,
  resolveAutoViewport,
} from "@/components/puck/lib/resolveAutoViewport";
import {
  NEXUS_VIEWPORT_FULL_WIDTH_ATTR,
  PUCK_CANVAS_INNER_SELECTOR,
  PUCK_LAYOUT_ROOT_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import { NEXUS_PANEL_LAYOUT_SETTLED_EVENT } from "@/components/puck/lib/sidebarLayoutLimits";
import { isMobilePanelLayoutMutating } from "@/components/puck/lib/mobilePanelLayout";
import { NEXUS_COMPACT_EDITOR_ATTR, NEXUS_NARROW_EDITOR_ATTR } from "@/components/puck/NexusCompactEditorAttr";
import { NEXUS_SIDEBAR_RESIZING_ATTR } from "@/components/puck/NexusSidebarResizeStabilizer";
import { matchesCompactEditorViewport } from "@/components/puck/usePuckMobileEditorChrome";

const RESIZE_DEBOUNCE_MS = 150;

/** Puck internal store shape (subset) for viewport attribute sync. */
interface PuckViewportAppStore {
  getState: () => {
    state: { ui: { viewports: { current: { width: number | "100%"; height?: number | "auto" } } } };
  };
  subscribe: (listener: (state: ReturnType<PuckViewportAppStore["getState"]>) => void) => () => void;
}

/**
 * Resolve Puck's internal app store for viewport subscriptions.
 *
 * @returns App store or null before Puck mounts.
 */
function resolvePuckViewportAppStore(): PuckViewportAppStore | null {
  if (typeof window === "undefined") return null;

  const internal = (
    window as Window & { __PUCK_INTERNAL_DO_NOT_USE?: { appStore?: PuckViewportAppStore } }
  ).__PUCK_INTERNAL_DO_NOT_USE;

  return internal?.appStore ?? null;
}

/**
 * Toggle full-width layout attribute on `.Puck` from the active viewport preset.
 *
 * @param width - Current viewport width from Puck UI state.
 */
function syncViewportFullWidthAttribute(width: number | "100%"): void {
  document
    .querySelector(".Puck")
    ?.toggleAttribute(NEXUS_VIEWPORT_FULL_WIDTH_ATTR, width === "100%");
}

/**
 * Measure the Puck canvas inner frame width (same node as Puck `frameRef`).
 *
 * @returns Frame width in px, or undefined when not mounted.
 */
function measureCanvasFrameWidth(): number | undefined {
  if (typeof document === "undefined") return undefined;

  const innerEl = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  const width = innerEl?.clientWidth;
  return width && width > 0 ? width : undefined;
}

/**
 * Silent child of `<Puck>` — keeps preview viewport aligned with available canvas width.
 *
 * @returns null
 */
export function PuckAutoViewportSync() {
  const getPuck = useGetPuck();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncViewport = () => {
      if (
        document.documentElement.hasAttribute(NEXUS_SIDEBAR_RESIZING_ATTR) ||
        isMobilePanelLayoutMutating()
      ) {
        return;
      }

      const frameWidth = measureCanvasFrameWidth();
      const isCompactEditor =
        matchesCompactEditorViewport() ||
        document.documentElement.hasAttribute(NEXUS_COMPACT_EDITOR_ATTR);
      const isNarrowEditor =
        isCompactEditor ||
        document.documentElement.hasAttribute(NEXUS_NARROW_EDITOR_ATTR) ||
        window.innerWidth <= 900;

      const { appState, dispatch } = getPuck();
      const current = appState.ui.viewports.current;

      syncViewportFullWidthAttribute(current.width);

      // Preserve user-selected Phone / Tablet / Desktop presets on narrow viewports.
      if (isNarrowEditor && typeof current.width === "number") {
        return;
      }

      const preset = isNarrowEditor
        ? { width: "100%" as const, height: "auto" as const }
        : resolveAutoViewport(
            window.innerWidth,
            frameWidth,
            NEXUS_EDITOR_VIEWPORTS,
          );

      const nextWidth = preset.width;
      const nextHeight = preset.height ?? "auto";

      syncViewportFullWidthAttribute(nextWidth);

      if (current.width === nextWidth && current.height === nextHeight) {
        return;
      }

      dispatch({
        type: "setUi",
        ui: {
          viewports: {
            ...appState.ui.viewports,
            current: {
              width: nextWidth,
              height: nextHeight,
            },
          },
        },
        recordHistory: false,
      });
    };

    const scheduleSync = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(syncViewport, RESIZE_DEBOUNCE_MS);
    };

    syncViewport();
    window.addEventListener("resize", scheduleSync);
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, scheduleSync);

    const appStore = resolvePuckViewportAppStore();
    const unsubscribeViewport =
      appStore?.subscribe((state) => {
        syncViewportFullWidthAttribute(state.state.ui.viewports.current.width);
      }) ?? null;

    const canvasInner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR);
    let resizeObserverPaused = false;

    const canvasResizeObserver =
      canvasInner && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (resizeObserverPaused) return;
            scheduleSync();
          })
        : null;

    const pauseResizeObserver = () => {
      if (resizeObserverPaused || !canvasResizeObserver) return;
      canvasResizeObserver.disconnect();
      resizeObserverPaused = true;
    };

    const resumeResizeObserver = () => {
      if (!resizeObserverPaused || !canvasInner || !canvasResizeObserver) return;
      canvasResizeObserver.observe(canvasInner);
      resizeObserverPaused = false;
      scheduleSync();
    };

    const syncResizeObserverGate = () => {
      if (isMobilePanelLayoutMutating()) {
        pauseResizeObserver();
        return;
      }
      resumeResizeObserver();
    };

    if (canvasInner && canvasResizeObserver) {
      canvasResizeObserver.observe(canvasInner);
    }

    syncResizeObserverGate();
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, syncResizeObserverGate);

    const layoutRoot = document.querySelector(PUCK_LAYOUT_ROOT_SELECTOR);
    const layoutObserver =
      layoutRoot &&
      new MutationObserver((records) => {
        const classChanged = records.some(
          (record) => record.type === "attributes" && record.attributeName === "class",
        );
        if (classChanged && !isMobilePanelLayoutMutating()) {
          scheduleSync();
        }
      });
    if (layoutRoot && layoutObserver) {
      layoutObserver.observe(layoutRoot, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    const layoutInner = document.querySelector('[class*="PuckLayout-inner"]') as HTMLElement | null;
    const onGridTransitionEnd = (event: TransitionEvent) => {
      if (isMobilePanelLayoutMutating()) return;

      if (
        event.propertyName === "grid-template-columns" ||
        event.propertyName === "grid-template-rows" ||
        event.propertyName === "--nexus-mobile-panel-height"
      ) {
        scheduleSync();
      }
    };
    layoutInner?.addEventListener("transitionend", onGridTransitionEnd);

    const mutationGateObserver = new MutationObserver(syncResizeObserverGate);
    mutationGateObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-nexus-panel-layout-mutating",
        "data-nexus-panel-resizing",
        "data-nexus-panel-closing",
        "data-nexus-panel-opening",
        "data-nexus-panel-expanding",
        "data-nexus-panel-collapsing",
        "data-nexus-panel-close-settling",
        "data-nexus-sidebar-resizing",
      ],
    });

    return () => {
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, scheduleSync);
      unsubscribeViewport?.();
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, syncResizeObserverGate);
      mutationGateObserver.disconnect();
      layoutInner?.removeEventListener("transitionend", onGridTransitionEnd);
      canvasResizeObserver?.disconnect();
      layoutObserver?.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
      document.querySelector(".Puck")?.removeAttribute(NEXUS_VIEWPORT_FULL_WIDTH_ATTR);
    };
  }, [getPuck]);

  return null;
}

export default PuckAutoViewportSync;
