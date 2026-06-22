"use client";

/**
 * @fileoverview Root layout wrapper for the global {@link InfiniteGrid}.
 *
 * Subscribes to {@link pageBackgroundGridStore} so Puck page background grid motion
 * toggles update `InfiniteGrid.isStatic` without remounting the canvas engine.
 *
 * @module src/components/background/LayoutInfiniteGrid
 */

import { useSyncExternalStore } from "react";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";
import {
  getPageBackgroundGridIsStatic,
  subscribePageBackgroundGrid,
} from "@/components/background/pageBackgroundGridStore";

/**
 * Layout-level InfiniteGrid driven by the active Puck page background settings.
 *
 * @returns Global background canvas for the site shell.
 */
export function LayoutInfiniteGrid() {
  const isStatic = useSyncExternalStore(
    subscribePageBackgroundGrid,
    getPageBackgroundGridIsStatic,
    () => false,
  );

  return <InfiniteGrid isStatic={isStatic} />;
}

export default LayoutInfiniteGrid;
