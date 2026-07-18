"use client";

/**
 * @fileoverview Forwards wheel events from the canvas chrome to the preview iframe.
 *
 * Puck paints letterbox gutters and the scrollport grid outside the iframe. Wheel
 * gestures there previously did nothing because only the iframe document scrolls tall
 * page content. This bridge scrolls `#preview-frame` when the pointer is not over it.
 *
 * @module src/components/puck/NexusCanvasWheelBridge
 */

import { useEffect } from "react";
import {
  canvasShellNeedsVerticalScroll,
} from "@/components/puck/lib/canvasLetterboxScrollport";
import { PUCK_CANVAS_INNER_SELECTOR, PUCK_CANVAS_SHELL_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";
import { isInlinePuckPreview } from "@/components/puck/lib/previewIframeDocumentReady";
import { usePuckPreviewMode } from "@/components/puck/lib/useNexusPuck";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

/** Preview iframe id assigned by Puck `AutoFrame`. */
const PREVIEW_FRAME_ID = "preview-frame";

/**
 * Mount wheel forwarding on desktop editor canvas chrome.
 *
 * @returns null
 */
export function NexusCanvasWheelBridge() {
  const previewMode = usePuckPreviewMode();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(`(min-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH + 1}px)`);
    let innerEl: HTMLElement | null = null;

    /**
     * Scroll the preview iframe when wheel events land on canvas chrome outside it.
     *
     * @param event - Wheel event from the canvas inner capture listener.
     */
    const onWheel = (event: WheelEvent) => {
      if (!media.matches) return;

      const frame = document.getElementById(PREVIEW_FRAME_ID);
      if (!(frame instanceof HTMLElement)) return;

      const target = event.target;
      if (target instanceof Node && frame.contains(target)) {
        return;
      }

      if (previewMode !== "interactive" && canvasShellNeedsVerticalScroll()) {
        const shell = document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null;
        shell?.scrollBy({
          top: event.deltaY,
          left: event.deltaX,
          behavior: "auto",
        });
        event.preventDefault();
        return;
      }

      if (isInlinePuckPreview()) {
        const scrollHost =
          (document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
          (document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null);
        scrollHost?.scrollBy({
          top: event.deltaY,
          left: event.deltaX,
          behavior: "auto",
        });
        event.preventDefault();
        return;
      }

      const iframeWindow = (frame as HTMLIFrameElement).contentWindow;
      if (!iframeWindow) return;

      iframeWindow.scrollBy({
        top: event.deltaY,
        left: event.deltaX,
        behavior: "auto",
      });
      event.preventDefault();
    };

    const attach = () => {
      detach();
      if (!media.matches) return;

      innerEl = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
      innerEl?.addEventListener("wheel", onWheel, { capture: true, passive: false });
    };

    const detach = () => {
      innerEl?.removeEventListener("wheel", onWheel, { capture: true });
      innerEl = null;
    };

    attach();
    media.addEventListener("change", attach);

    const puckRoot = document.querySelector(".Puck");
    const observer =
      puckRoot &&
      new MutationObserver(() => {
        if (!innerEl || !document.contains(innerEl)) {
          attach();
        }
      });
    if (observer && puckRoot) {
      observer.observe(puckRoot, { childList: true, subtree: true });
    }

    return () => {
      detach();
      media.removeEventListener("change", attach);
      observer?.disconnect();
    };
  }, [previewMode]);

  return null;
}

export default NexusCanvasWheelBridge;
