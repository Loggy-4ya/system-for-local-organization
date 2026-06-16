/**
 * @fileoverview Desktop Puck canvas scrollport — full-shell grid, shell-owned scroll.
 *
 * On desktop (≥901px or fine pointer), the InfiniteGrid mounts on the bordered canvas
 * shell. Tall page content scrolls inside the preview iframe — not on the shell.
 *
 * @module src/components/puck/lib/desktopEditorScrollport
 */

"use client";

import { useEffect, useState } from "react";
import { PUCK_DESKTOP_EDITOR_MQ } from "@/components/puck/usePuckMobileEditorChrome";

/**
 * Whether the given window uses desktop editor chrome (side-by-side layout).
 *
 * @param target - Window to query; defaults to the current window.
 * @returns True when {@link PUCK_DESKTOP_EDITOR_MQ} matches.
 */
export function matchesDesktopEditorChrome(target: Window = window): boolean {
  if (typeof target.matchMedia !== "function") return false;
  return target.matchMedia(PUCK_DESKTOP_EDITOR_MQ).matches;
}

/**
 * Whether the given document hosts the Puck editor shell.
 *
 * @param doc - Document to inspect.
 * @returns True when a `.Puck` root is mounted.
 */
function isPuckEditorDocument(doc: Document): boolean {
  return doc.querySelector(".Puck") !== null;
}

/**
 * Whether the editor should paint site-default grid on the canvas shell (not in iframe).
 *
 * Uses the parent document when called from the Puck preview iframe.
 *
 * @param target - Window to start from; defaults to the current window.
 * @returns True on Puck editor routes where the shell scrollport grid owns the background.
 */
export function usesDesktopScrollportGrid(target: Window = window): boolean {
  if (typeof target === "undefined") return false;

  try {
    const parent = target.parent;
    if (parent && parent !== target) {
      // Preview iframe — shell grid fills the canvas at every breakpoint (desktop + compact).
      if (isPuckEditorDocument(parent.document)) {
        return true;
      }
      return matchesDesktopEditorChrome(parent);
    }
  } catch {
    /* cross-origin parent — fall through */
  }

  return matchesDesktopEditorChrome(target);
}

/**
 * React hook — tracks desktop shell scrollport grid mode (parent window on iframe routes).
 *
 * @returns True when iframe grid should stay off and shell grid owns the canvas panel.
 */
export function useDesktopScrollportGridActive(): boolean {
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return usesDesktopScrollportGrid();
  });

  useEffect(() => {
    const sync = () => setActive(usesDesktopScrollportGrid());

    sync();

    let media: MediaQueryList | null = null;
    try {
      const owner = window.parent !== window ? window.parent : window;
      media = owner.matchMedia(PUCK_DESKTOP_EDITOR_MQ);
      media.addEventListener("change", sync);
    } catch {
      /* ignore cross-origin parent */
    }

    window.addEventListener("resize", sync);

    return () => {
      media?.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return active;
}
