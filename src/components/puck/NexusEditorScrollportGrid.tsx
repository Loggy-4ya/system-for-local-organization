"use client";

/**
 * @fileoverview Compact editor layout sync — nav rail height for overlay panel positioning.
 *
 * Site-default background is a single global `InfiniteGrid` in `layout.tsx` (`#nexus-bg`).
 * This module no longer portals a second grid into the Puck canvas.
 *
 * @module src/components/puck/NexusEditorScrollportGrid
 */

import { useEffect } from "react";
import { PUCK_MOBILE_CANVAS_SHELL_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";
import {
  PUCK_COMPACT_PLUGIN_PANEL_SELECTOR,
  syncCanvasIslandStackBottom,
} from "@/components/puck/lib/canvasIslandStackSync";
import {
  PUCK_COMPACT_LAYOUT_INNER_SELECTOR,
  PUCK_COMPACT_LAYOUT_NAV_SELECTOR,
  syncCompactNavRailHeight,
  usesMobileScrollportGridBackdropMount,
  usesMobileScrollportGridViewport,
} from "@/components/puck/lib/mobileScrollportGridFreeze";
import { NEXUS_PANEL_LAYOUT_SETTLED_EVENT } from "@/components/puck/lib/sidebarLayoutLimits";

/**
 * Syncs compact editor CSS vars when the bottom nav or panel layout changes.
 *
 * @returns null
 */
export function NexusEditorScrollportGrid(): null {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let panelObserver: ResizeObserver | null = null;
    let observedPanel: Element | null = null;

    const bindPanelObserver = () => {
      const panel = document.querySelector(PUCK_COMPACT_PLUGIN_PANEL_SELECTOR);
      if (panel === observedPanel) return;

      panelObserver?.disconnect();
      observedPanel = panel;

      if (panel && panelObserver) {
        panelObserver.observe(panel);
      }
    };

    const sync = () => {
      if (!usesMobileScrollportGridViewport()) return;
      syncCompactNavRailHeight();
      bindPanelObserver();
      syncCanvasIslandStackBottom();
    };

    sync();

    const navRail = document.querySelector(PUCK_COMPACT_LAYOUT_NAV_SELECTOR);
    const canvasShell = document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR);
    const navObserver =
      usesMobileScrollportGridBackdropMount() && navRail && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(sync)
        : null;
    const canvasObserver =
      usesMobileScrollportGridBackdropMount() && canvasShell && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(sync)
        : null;

    if (typeof ResizeObserver !== "undefined") {
      panelObserver = new ResizeObserver(sync);
    }

    if (navObserver && navRail) {
      navObserver.observe(navRail);
    }

    if (canvasObserver && canvasShell) {
      canvasObserver.observe(canvasShell);
    }

    bindPanelObserver();

    const layoutInner = document.querySelector(PUCK_COMPACT_LAYOUT_INNER_SELECTOR);
    const layoutObserver =
      layoutInner && typeof MutationObserver !== "undefined"
        ? new MutationObserver(sync)
        : null;

    if (layoutObserver && layoutInner) {
      layoutObserver.observe(layoutInner, {
        attributes: true,
        attributeFilter: ["class", "style"],
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener("resize", sync);
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, sync);

    return () => {
      navObserver?.disconnect();
      canvasObserver?.disconnect();
      panelObserver?.disconnect();
      layoutObserver?.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, sync);
    };
  }, []);

  return null;
}

export default NexusEditorScrollportGrid;
