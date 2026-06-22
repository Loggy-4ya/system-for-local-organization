"use client";

/**
 * @fileoverview Puck editor compact layout sync — nav rail metrics and canvas island stack.
 *
 * Site-default background uses the single global {@link LayoutInfiniteGrid} (`#nexus-bg`).
 * This helper never mounts a second grid; it only keeps compact editor CSS vars in sync.
 *
 * @module src/components/puck/NexusEditorScrollportGrid
 */

import { useEffect } from "react";
import { PUCK_CANVAS_SHELL_SELECTOR, PUCK_MOBILE_CANVAS_SHELL_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";
import {
  PUCK_COMPACT_LAYOUT_INNER_SELECTOR,
  PUCK_COMPACT_LAYOUT_NAV_SELECTOR,
  applyMobileScrollportGridViewport,
  syncCompactNavRailHeight,
  usesMobileScrollportGridBackdropMount,
  usesMobileScrollportGridViewport,
} from "@/components/puck/lib/mobileScrollportGridFreeze";
import {
  PUCK_COMPACT_PLUGIN_PANEL_SELECTOR,
  syncCanvasIslandStackBottom,
} from "@/components/puck/lib/canvasIslandStackSync";
import { NEXUS_PANEL_LAYOUT_SETTLED_EVENT } from "@/components/puck/lib/sidebarLayoutLimits";

/**
 * Sync compact nav-rail height and canvas island stack positioning on editor routes.
 *
 * @returns null
 */
export function NexusEditorScrollportGrid(): null {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncDesktopShell = () => {
      applyMobileScrollportGridViewport();
      syncCompactNavRailHeight();
    };

    const shell =
      (document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
      (document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null);

    const shellObserver =
      shell && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!usesMobileScrollportGridBackdropMount()) {
              syncDesktopShell();
            }
          })
        : null;

    if (shellObserver && shell) {
      shellObserver.observe(shell);
    }

    syncDesktopShell();
    window.addEventListener("resize", syncDesktopShell);
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, syncDesktopShell);

    return () => {
      shellObserver?.disconnect();
      window.removeEventListener("resize", syncDesktopShell);
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, syncDesktopShell);
    };
  }, []);

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

    const syncCompactLayout = () => {
      if (!usesMobileScrollportGridViewport()) return;
      syncCompactNavRailHeight();
      bindPanelObserver();
      syncCanvasIslandStackBottom();
    };

    syncCompactLayout();

    const navRail = document.querySelector(PUCK_COMPACT_LAYOUT_NAV_SELECTOR);
    const canvasShell = document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR);
    const navObserver =
      usesMobileScrollportGridBackdropMount() && navRail && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncCompactLayout)
        : null;
    const canvasObserver =
      usesMobileScrollportGridBackdropMount() && canvasShell && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncCompactLayout)
        : null;

    if (typeof ResizeObserver !== "undefined") {
      panelObserver = new ResizeObserver(syncCompactLayout);
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
        ? new MutationObserver(syncCompactLayout)
        : null;

    if (layoutObserver && layoutInner) {
      layoutObserver.observe(layoutInner, {
        attributes: true,
        attributeFilter: ["class", "style"],
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener("resize", syncCompactLayout);
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, syncCompactLayout);

    return () => {
      navObserver?.disconnect();
      canvasObserver?.disconnect();
      panelObserver?.disconnect();
      layoutObserver?.disconnect();
      window.removeEventListener("resize", syncCompactLayout);
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, syncCompactLayout);
    };
  }, []);

  return null;
}

export default NexusEditorScrollportGrid;
