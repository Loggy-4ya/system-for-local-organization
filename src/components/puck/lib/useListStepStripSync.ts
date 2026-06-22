/**
 * @fileoverview Sync stepper list canvas highlight when a sidebar step field is focused.
 *
 * @module src/components/puck/lib/useListStepStripSync
 */

import { useGetPuck } from "@puckeditor/core";
import { useCallback, useEffect } from "react";
import {
  parseListStepFieldPath,
  resolveFlatStepIndex,
  type ListStepItem,
} from "./listStepTree";
import { setStripActiveIndex } from "./stripEditorState";

/**
 * Keep the canvas stepper highlight aligned with the focused sidebar step field.
 *
 * @param name - Puck field path (`items[n].text`, `items[n].children[m].text`, …).
 * @param items - Current list items from the selected block (for flat index resolution).
 */
export function useListStepStripSync(
  name: string | undefined,
  items: ListStepItem[] | undefined,
): () => void {
  const getPuck = useGetPuck();
  const parsed = parseListStepFieldPath(name);

  const syncStripIndex = useCallback(() => {
    if (!parsed) return;

    const { selectedItem } = getPuck();
    const componentId = selectedItem?.props?.id as string | undefined;
    if (!componentId) return;

    const flatIndex = resolveFlatStepIndex(
      items,
      parsed.parentIndex,
      parsed.childIndex,
      "yes",
      { expandAll: true },
    );
    setStripActiveIndex(componentId, flatIndex);
  }, [getPuck, items, parsed]);

  useEffect(() => {
    syncStripIndex();
  }, [syncStripIndex]);

  return syncStripIndex;
}

export default useListStepStripSync;
