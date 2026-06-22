/**
 * @fileoverview Desktop Puck canvas scrollport — full-shell grid, shell-owned scroll.
 *
 * On desktop (≥901px), the canvas shell is transparent so global `#nexus-bg` shows through.
 *
 * Tests: `tests/puck/lib/desktopEditorScrollport.test.ts` — `npm run test:desktop-editor-scrollport`
 *
 * @module src/components/puck/lib/desktopEditorScrollport
 */

"use client";

import { useEffect, useState } from "react";
import { PUCK_DESKTOP_EDITOR_MQ } from "@/components/puck/usePuckMobileEditorChrome";

/**
 * Whether the given window uses the desktop Puck editor layout (side-by-side panels).
 *
 * @param target - Window to query; defaults to the current window.
 * @returns True when {@link PUCK_DESKTOP_EDITOR_MQ} matches.
 */
export function matchesDesktopEditorLayout(target: Window = window): boolean {
  if (typeof target.matchMedia !== "function") return false;
  return target.matchMedia(PUCK_DESKTOP_EDITOR_MQ).matches;
}

/**
 * Whether the given document hosts the Puck editor shell.
 *
 * @param doc - Document to inspect.
 * @returns True when a `.Puck` root is mounted.
 */
export function isPuckEditorDocument(doc: Document): boolean {
  return doc.querySelector(".Puck") !== null;
}

/**
 * Whether the editor shell scrollport grid owns the canvas background.
 *
 * Uses the parent document when called from the Puck preview iframe.
 *
 * @param target - Window to start from; defaults to the current window.
 * @returns True on Puck editor routes where the shell scrollport grid owns the background.
 */
export function usesEditorShellScrollportGrid(target: Window = window): boolean {
  if (typeof target === "undefined") return false;

  try {
    const parent = target.parent;
    if (parent && parent !== target) {
      if (isPuckEditorDocument(parent.document)) {
        return true;
      }
      return matchesDesktopEditorLayout(parent);
    }
  } catch {
    /* cross-origin parent — fall through */
  }

  return isPuckEditorDocument(target.document) || matchesDesktopEditorLayout(target);
}

/**
 * Whether the editor should paint site-default grid on the desktop canvas shell (not in iframe).
 *
 * @deprecated Prefer {@link usesEditorShellScrollportGrid} — shell grid applies on compact too.
 * @param target - Window to start from; defaults to the current window.
 * @returns True on desktop Puck editor routes.
 */
export function usesDesktopScrollportGrid(target: Window = window): boolean {
  return usesEditorShellScrollportGrid(target);
}

/**
 * React hook — tracks shell scrollport grid mode (parent window on iframe routes).
 *
 * @returns True when iframe grid should stay off and shell grid owns the canvas panel.
 */
export function useEditorShellScrollportGridActive(): boolean {
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return usesEditorShellScrollportGrid();
  });

  useEffect(() => {
    const sync = () => setActive(usesEditorShellScrollportGrid());

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

/** @deprecated Prefer {@link useEditorShellScrollportGridActive}. */
export function useDesktopScrollportGridActive(): boolean {
  return useEditorShellScrollportGridActive();
}

/**
 * Required `puck-editor.css` fragments for desktop fixed-viewport centering (≥901px).
 *
 * Puck `#puck-canvas-root` is `position: absolute` with `left: auto`; horizontal centering
 * depends on `PuckCanvas-inner` `justify-content: center` (flex static position).
 */
export const DESKTOP_FIXED_VIEWPORT_CENTERING_CSS_CONTRACT = {
  canvasInnerCenter: "justify-content: center !important",
  fullWidthStretch: "[data-nexus-viewport-full-width]",
  fullWidthInnerStretch: "justify-content: stretch !important",
  canvasShellTransparent: "background: transparent !important",
  layoutInnerTransparent: "PuckLayout-inner",
} as const;

/**
 * Validate desktop fixed-viewport centering rules exist in `puck-editor.css`.
 *
 * @param cssText - Full puck-editor stylesheet text.
 * @returns Missing contract keys (empty when satisfied).
 */
export function findMissingDesktopFixedViewportCenteringCss(cssText: string): string[] {
  const missing: string[] = [];

  for (const [key, fragment] of Object.entries(DESKTOP_FIXED_VIEWPORT_CENTERING_CSS_CONTRACT)) {
    if (!cssText.includes(fragment)) {
      missing.push(key);
    }
  }

  return missing;
}
