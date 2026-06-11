/**
 * @fileoverview React hook for strip-editor active index with Puck remount survival.
 *
 * @module src/components/puck/lib/useStripActiveIndex
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getStripActiveIndex, setStripActiveIndex } from "./stripEditorState";

/**
 * Manage active tab/slide index for strip editors inside Puck.
 *
 * @param componentId - Puck block id; when missing, uses local state only.
 * @param defaultIndex - Sidebar default index (e.g. `defaultActiveIndex`).
 * @param itemCount - Number of tabs or slides for clamping.
 * @param editorActiveIndex - Persisted index from Puck props when available.
 * @returns Clamped active index and setter that persists across remounts.
 */
export function useStripActiveIndex(
  componentId: string | undefined,
  defaultIndex: number,
  itemCount: number,
  editorActiveIndex?: number,
) {
  const maxIndex = Math.max(0, itemCount - 1);
  const preferredDefault = Math.min(
    Math.max(0, editorActiveIndex ?? defaultIndex),
    maxIndex,
  );
  const previousDefaultRef = useRef(defaultIndex);
  const previousEditorIndexRef = useRef(editorActiveIndex);

  const [activeIndex, setActiveIndexLocal] = useState(() =>
    componentId ? getStripActiveIndex(componentId, preferredDefault) : preferredDefault,
  );

  useEffect(() => {
    if (
      previousDefaultRef.current === defaultIndex &&
      previousEditorIndexRef.current === editorActiveIndex
    ) {
      return;
    }
    previousDefaultRef.current = defaultIndex;
    previousEditorIndexRef.current = editorActiveIndex;

    const nextDefault = Math.min(
      Math.max(0, editorActiveIndex ?? defaultIndex),
      maxIndex,
    );

    if (!componentId) {
      setActiveIndexLocal(nextDefault);
      return;
    }
    setStripActiveIndex(componentId, nextDefault);
    setActiveIndexLocal(nextDefault);
  }, [componentId, defaultIndex, editorActiveIndex, maxIndex]);

  const clampedIndex = Math.min(Math.max(0, activeIndex), maxIndex);

  const setActiveIndex = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(0, index), maxIndex);
      if (componentId) setStripActiveIndex(componentId, next);
      setActiveIndexLocal(next);
    },
    [componentId, maxIndex],
  );

  return [clampedIndex, setActiveIndex] as const;
}
