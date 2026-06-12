/**
 * @fileoverview Sync carousel/tab canvas index when a sidebar array item is expanded.
 *
 * @module src/components/puck/lib/usePuckArrayOpenStripSync
 */

import { useEffect, useRef } from "react";
import {
  resolveArrayOpenIndex,
  resolvePuckArrayFieldId,
  type PuckArrayFieldState,
} from "./puckArrayFieldState";
import { setStripActiveIndex } from "./stripEditorState";
import { useNexusPuck } from "./useNexusPuck";

/**
 * Navigate the canvas strip when the user expands an array item in the sidebar.
 *
 * @param componentId - Puck block id for the carousel or tabs group.
 * @param fieldName - Array field name (`slides` or `tabs`).
 * @param enabled - Whether sync is active (edit mode + block selected on canvas).
 */
export function usePuckArrayOpenStripSync(
  componentId: string | undefined,
  fieldName: string,
  enabled: boolean,
): void {
  const arrayFieldId = componentId ? resolvePuckArrayFieldId(componentId, fieldName) : null;
  const previousOpenIdRef = useRef<string | null>(null);

  const arrayState = useNexusPuck((state) => {
    if (!arrayFieldId || !enabled) return undefined;
    return state.appState.ui.arrayState[arrayFieldId] as PuckArrayFieldState | undefined;
  });

  const openId = arrayState?.openId ?? null;

  useEffect(() => {
    if (!componentId || !enabled) {
      previousOpenIdRef.current = null;
      return;
    }

    if (!openId || !arrayState) {
      previousOpenIdRef.current = null;
      return;
    }

    if (openId === previousOpenIdRef.current) return;

    previousOpenIdRef.current = openId;

    const index = resolveArrayOpenIndex(arrayState);
    if (index === null) return;

    setStripActiveIndex(componentId, index);
  }, [arrayState, componentId, enabled, openId]);
}
