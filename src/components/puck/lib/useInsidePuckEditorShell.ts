"use client";

/**
 * @fileoverview React hook — tracks whether the preview iframe is hosted by the Puck editor.
 *
 * @module src/components/puck/lib/useInsidePuckEditorShell
 */

import { useEffect, useState } from "react";
import { isInsidePuckEditorShell } from "@/components/puck/lib/previewIframeGridBacking";

/**
 * @returns True when the preview document is inside the Puck editor shell iframe.
 */
export function useInsidePuckEditorShell(): boolean {
  const [inside, setInside] = useState(() => {
    if (typeof window === "undefined") return false;
    return isInsidePuckEditorShell();
  });

  useEffect(() => {
    const sync = () => setInside(isInsidePuckEditorShell());

    sync();
    window.addEventListener("resize", sync);

    try {
      window.parent?.addEventListener("resize", sync);
    } catch {
      /* cross-origin parent */
    }

    return () => {
      window.removeEventListener("resize", sync);
      try {
        window.parent?.removeEventListener("resize", sync);
      } catch {
        /* ignore */
      }
    };
  }, []);

  return inside;
}
