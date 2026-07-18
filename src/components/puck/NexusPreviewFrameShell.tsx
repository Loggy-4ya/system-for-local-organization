"use client";

/**
 * @fileoverview Parent-document hooks for Puck `#preview-frame` transparency.
 *
 * CSS alone cannot always win against Chromium's compositor for `srcDoc` iframes. This helper
 * sets legacy `allowtransparency` plus inline transparent backgrounds on the iframe element and
 * re-applies preview-document styles after each iframe `load`.
 *
 * @module src/components/puck/NexusPreviewFrameShell
 */

import { useTheme } from "@teispace/next-themes";
import { useLayoutEffect } from "react";
import { syncPreviewIframeDocumentStyles } from "@/components/puck/PuckIframeTheme";
import { isPreviewIframeDocumentReady } from "@/components/puck/lib/previewIframeDocumentReady";
import { usePuckPreviewMode } from "@/components/puck/lib/useNexusPuck";

/**
 * Apply transparent shell styling to `#preview-frame` from the parent Puck document.
 *
 * @returns null
 */
export function NexusPreviewFrameShell(): null {
  const { resolvedTheme } = useTheme();
  const previewMode = usePuckPreviewMode();

  useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncFrame = () => {
      const frame = document.getElementById("preview-frame");
      if (!(frame instanceof HTMLIFrameElement)) {
        return;
      }

      frame.setAttribute("allowtransparency", "true");
      frame.style.setProperty("background", "transparent", "important");
      frame.style.setProperty("background-color", "transparent", "important");

      const iframeDoc = frame.contentDocument;
      if (isPreviewIframeDocumentReady(iframeDoc)) {
        syncPreviewIframeDocumentStyles(
          iframeDoc,
          previewMode,
          resolvedTheme === "light" ? "light" : "dark",
        );
      }
    };

    syncFrame();

    const frame = document.getElementById("preview-frame");
    frame?.addEventListener("load", syncFrame);

    return () => {
      frame?.removeEventListener("load", syncFrame);
    };
  }, [previewMode, resolvedTheme]);

  return null;
}

export default NexusPreviewFrameShell;
