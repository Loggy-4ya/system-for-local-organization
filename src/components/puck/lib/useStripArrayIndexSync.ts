/**
 * @fileoverview Sync carousel/tab strip active index when a sidebar array item is opened.
 *
 * @module src/components/puck/lib/useStripArrayIndexSync
 */

import { useGetPuck } from "@puckeditor/core";
import { useCallback, useEffect } from "react";
import { setStripActiveIndex } from "./stripEditorState";

/**
 * Parse the array item index from a Puck field path such as `slides[2].label`.
 *
 * @param name - Puck field name.
 * @returns Zero-based index or null when not an array sub-field.
 */
export function parseArrayIndexFromFieldName(name?: string): number | null {
  if (!name) return null;
  const match = /\[(\d+)\]/.exec(name);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Keep canvas strip editors aligned with the expanded sidebar array item.
 *
 * @param arrayIndex - Zero-based array index or null when unavailable.
 */
export function useStripArrayIndexSync(arrayIndex: number | null) {
  const getPuck = useGetPuck();

  const syncStripIndex = useCallback(() => {
    if (arrayIndex === null) return;

    const { selectedItem } = getPuck();
    const componentId = selectedItem?.props?.id as string | undefined;
    if (!componentId) return;

    setStripActiveIndex(componentId, arrayIndex);
  }, [arrayIndex, getPuck]);

  useEffect(() => {
    syncStripIndex();
  }, [syncStripIndex]);

  return syncStripIndex;
}
