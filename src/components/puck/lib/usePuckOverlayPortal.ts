/**
 * @fileoverview Registers Puck overlay portals so in-canvas controls receive clicks.
 *
 * @module src/components/puck/lib/usePuckOverlayPortal
 */

import { registerOverlayPortal } from "@puckeditor/core";
import { useCallback, useEffect, useRef } from "react";

/**
 * Return a callback ref that registers the element as a Puck overlay portal.
 *
 * @param enabled - When false, registration is skipped.
 * @returns Callback ref for the interactive control container.
 */
export function usePuckOverlayPortalRef(enabled: boolean) {
  const cleanupRef = useRef<(() => void) | void>(undefined);

  const setPortalRef = useCallback(
    (node: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      if (node && enabled) {
        cleanupRef.current = registerOverlayPortal(node, { disableDrag: true });
      }
    },
    [enabled],
  );

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    [],
  );

  return setPortalRef;
}
