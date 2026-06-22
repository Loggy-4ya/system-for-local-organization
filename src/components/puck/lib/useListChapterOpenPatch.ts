/**
 * @fileoverview Persist `chapterOpen` toggles from the list canvas chevron to Puck data.
 *
 * @module src/components/puck/lib/useListChapterOpenPatch
 */

import { useGetPuck } from "@puckeditor/core";
import { useCallback } from "react";
import { findComponentById, replaceComponentProps } from "./puckDataTree";
import { isChapterOpen, type ListStepItem } from "./listStepTree";

/**
 * Return a handler that flips `chapterOpen` on a parent step and persists via Puck `setData`.
 *
 * @param blockId - Puck block id for the list component.
 * @param defaultExpandNested - Fallback when `chapterOpen` is unset.
 * @returns Toggle callback keyed by parent index.
 */
export function useListChapterOpenPatch(
  blockId: string | undefined,
  defaultExpandNested: "yes" | "no" = "yes",
): (parentIndex: number) => void {
  const getPuck = useGetPuck();

  return useCallback(
    (parentIndex: number) => {
      if (!blockId) return;

      const puck = getPuck();
      const data = puck.appState.data;
      const match = findComponentById(data, blockId);
      if (!match) return;

      const items = Array.isArray(match.node.props.items)
        ? ([...match.node.props.items] as ListStepItem[])
        : [];
      const current = items[parentIndex];
      if (!current) return;

      const open = isChapterOpen(current, defaultExpandNested);
      items[parentIndex] = {
        ...current,
        chapterOpen: open ? "no" : "yes",
      };

      puck.dispatch({
        type: "setData",
        data: replaceComponentProps(data, blockId, { items }),
      });
    },
    [blockId, defaultExpandNested, getPuck],
  );
}

export default useListChapterOpenPatch;
