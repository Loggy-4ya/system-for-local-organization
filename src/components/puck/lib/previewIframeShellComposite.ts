"use client";

/**
 * @fileoverview Detect when Puck edit mode must paint the site grid inside the preview iframe.
 *
 * Most browsers composite the parent shell scrollport grid through the transparent preview
 * iframe during edit (single grid on the canvas shell). Some environments fail that
 * bleed-through between Puck block wrappers — margin gaps render opaque/black — so edit
 * mode routes the grid into the iframe document instead and suppresses the shell grid.
 * Interactive preview uses the same iframe-contained grid so the shell backdrop does not
 * paint over the editor header on compact layouts.
 *
 * @module src/components/puck/lib/previewIframeShellComposite
 */

import { useEffect, useState } from "react";
import { isWebKitEngine } from "@/components/background/infiniteGridIconLoader";

/** sessionStorage key — cached per tab. */
const SESSION_KEY = "nexus-iframe-contained-edit-grid";

/**
 * Probe whether edit mode should use an iframe-contained grid instead of shell bleed-through.
 *
 * WebKit (Safari desktop + all iOS browsers) and Brave fail parent-shell grid compositing
 * through the transparent preview iframe — Puck block wrappers look blank unless the grid
 * paints inside the iframe document.
 *
 * @returns True when Puck edit should mount InfiniteGrid inside the preview iframe.
 */
export async function detectRequiresIframeContainedEditGrid(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  if (isWebKitEngine(navigator.userAgent)) {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode */
    }
    return true;
  }

  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached !== null) return cached === "1";
  } catch {
    /* private mode */
  }

  let requiresIframeContainedEditGrid = false;

  try {
    const nav = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } };
    if (nav.brave?.isBrave) {
      requiresIframeContainedEditGrid = await nav.brave.isBrave();
    }
  } catch {
    requiresIframeContainedEditGrid = false;
  }

  try {
    sessionStorage.setItem(SESSION_KEY, requiresIframeContainedEditGrid ? "1" : "0");
  } catch {
    /* ignore */
  }

  return requiresIframeContainedEditGrid;
}

/**
 * Read cached iframe-contained edit grid flag synchronously (false until probed).
 *
 * @returns Cached compositing-fallback flag from sessionStorage.
 */
export function readRequiresIframeContainedEditGridCached(): boolean {
  if (typeof navigator !== "undefined" && isWebKitEngine(navigator.userAgent)) {
    return true;
  }

  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * React hook — tracks whether edit mode must paint the grid inside the preview iframe.
 *
 * @returns True after the compositing probe completes.
 */
export function useRequiresIframeContainedEditGrid(): boolean {
  const [requiresIframeContainedEditGrid, setRequiresIframeContainedEditGrid] = useState(
    readRequiresIframeContainedEditGridCached,
  );

  useEffect(() => {
    let cancelled = false;

    void detectRequiresIframeContainedEditGrid().then((result) => {
      if (!cancelled) {
        setRequiresIframeContainedEditGrid(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return requiresIframeContainedEditGrid;
}
