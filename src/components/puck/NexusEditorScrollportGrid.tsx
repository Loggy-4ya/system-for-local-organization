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
import {
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

    const sync = () => {
      if (!usesMobileScrollportGridViewport()) return;
      syncCompactNavRailHeight();
    };

    sync();

    const navRail = document.querySelector(PUCK_COMPACT_LAYOUT_NAV_SELECTOR);
    const navObserver =
      usesMobileScrollportGridBackdropMount() && navRail && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(sync)
        : null;

    if (navObserver && navRail) {
      navObserver.observe(navRail);
    }

    window.addEventListener("resize", sync);
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, sync);

    return () => {
      navObserver?.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, sync);
    };
  }, []);

  return null;
}

export default NexusEditorScrollportGrid;
