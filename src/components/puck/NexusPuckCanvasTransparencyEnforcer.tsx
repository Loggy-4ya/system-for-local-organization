"use client";

/**
 * @fileoverview Forces Puck canvas / preview layers transparent so the scrollport grid shows through.
 *
 * Puck 0.21 paints opaque grey/white on `PuckCanvas`, `PuckCanvas-root`, and the preview iframe.
 * Stylesheet overrides can lose to load order or module specificity — this enforcer applies
 * inline `background: transparent !important` on every canvas shell node after mount.
 *
 * @module src/components/puck/NexusPuckCanvasTransparencyEnforcer
 */

import { useEffect } from "react";
import {
  PUCK_CANVAS_INNER_SELECTOR,
  PUCK_CANVAS_SHELL_SELECTOR,
  PUCK_MOBILE_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";

/** Inline style keys cleared then set transparent on canvas chrome nodes. */
const TRANSPARENT_BG_PROPS = ["background", "background-color", "background-image"] as const;

/** Selectors for Puck preview chrome that must stay transparent in the editor shell. */
const CANVAS_TRANSPARENCY_SELECTORS = [
  PUCK_CANVAS_SHELL_SELECTOR,
  PUCK_MOBILE_CANVAS_SHELL_SELECTOR,
  PUCK_CANVAS_INNER_SELECTOR,
  '.Puck [class*="PuckCanvas-root"]',
  ".Puck #puck-canvas-root",
  '.Puck [class*="PuckPreview"]',
  '.Puck [class*="PuckPreview-frame"]',
  ".Puck iframe#preview-frame",
  "#preview-frame",
] as const;

/**
 * Apply transparent background to a single element via inline styles (`!important`).
 *
 * @param element - DOM node to clear.
 */
function forceTransparentBackground(element: HTMLElement): void {
  for (const prop of TRANSPARENT_BG_PROPS) {
    element.style.setProperty(
      prop,
      prop === "background-image" ? "none" : "transparent",
      "important",
    );
  }
}

/**
 * Walk all canvas transparency targets and force transparent backgrounds.
 *
 * @param root - Editor document root (defaults to `document`).
 */
export function syncPuckCanvasTransparency(root: ParentNode = document): void {
  if (typeof document === "undefined") {
    return;
  }

  for (const selector of CANVAS_TRANSPARENCY_SELECTORS) {
    const nodes = root.querySelectorAll<HTMLElement>(selector);
    nodes.forEach(forceTransparentBackground);
  }
}

/**
 * Force transparent backgrounds inside the Puck preview iframe document.
 *
 * Called synchronously on theme switch so the iframe repaint lands in the same
 * mutation flush — no intermediate opaque frame.
 */
function forceIframeTransparency(): void {
  const iframe = document.querySelector<HTMLIFrameElement>(
    ".Puck iframe#preview-frame, iframe#preview-frame",
  );
  if (!iframe) return;

  let iframeDoc: Document | null = null;
  try {
    iframeDoc = iframe.contentDocument;
  } catch {
    return;
  }
  if (!iframeDoc) return;

  for (const el of [iframeDoc.documentElement, iframeDoc.body, iframeDoc.getElementById("frame-root")]) {
    if (!el) continue;
    el.style.setProperty("background", "transparent", "important");
    el.style.setProperty("background-color", "transparent", "important");
  }
}

/**
 * Silent Puck child — keeps canvas / preview chrome transparent after Puck paints.
 *
 * @returns null
 */
export function NexusPuckCanvasTransparencyEnforcer(): null {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    let rafId = 0;
    let applying = false;

    const run = () => {
      if (applying) {
        return;
      }

      applying = true;
      try {
        syncPuckCanvasTransparency();
      } finally {
        applying = false;
      }
    };

    const schedule = () => {
      if (rafId !== 0) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = 0;
        run();
      });
    };

    run();
    schedule();

    const puckRoot = document.querySelector(".Puck");
    const observer =
      puckRoot && typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            run();
          })
        : null;

    if (observer && puckRoot) {
      observer.observe(puckRoot, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true,
      });
    }

    const themeObserver = new MutationObserver(() => {
      run();
      forceIframeTransparency();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("resize", schedule);

    return () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
      observer?.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return null;
}

export default NexusPuckCanvasTransparencyEnforcer;
