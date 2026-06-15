"use client";

/**
 * @fileoverview RAF-driven edge auto-scroll while pointer-dragging sortable rows.
 *
 * @module src/lib/useDragAutoScroll
 */

import {
  applyDragAutoScroll,
  type DragAutoScrollInput,
} from "@/lib/dragAutoScrollLogic";
import { useCallback, useEffect, useRef } from "react";

/** Options for {@link useDragAutoScroll}. */
export interface UseDragAutoScrollOptions {
  /**
   * Called after each auto-scroll frame so drag hover targets can be refreshed
   * against the updated layout.
   */
  onTick?: (clientY: number, clientX: number) => void;
  /**
   * Optional custom scroll input resolver (e.g. Puck preview iframe mapping).
   * Defaults to the last pointer position in the parent window.
   */
  getScrollInput?: () => DragAutoScrollInput | null;
}

/**
 * Manage viewport and nested-container edge auto-scroll during an active drag.
 *
 * @param options - Optional scroll tick callback.
 * @returns Drag auto-scroll controls.
 */
export function useDragAutoScroll(options: UseDragAutoScrollOptions = {}) {
  const pointerRef = useRef<DragAutoScrollInput>({ clientX: 0, clientY: 0 });
  const activeRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const onTickRef = useRef(options.onTick);
  const getScrollInputRef = useRef(options.getScrollInput);

  useEffect(() => {
    onTickRef.current = options.onTick;
    getScrollInputRef.current = options.getScrollInput;
  }, [options.getScrollInput, options.onTick]);

  const stop = useCallback(() => {
    activeRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!activeRef.current) {
      return;
    }

    const input = getScrollInputRef.current?.() ?? pointerRef.current;
    if (input) {
      applyDragAutoScroll(input);
      onTickRef.current?.(input.clientY, input.clientX);
    }

    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    activeRef.current = true;

    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    pointerRef.current = { clientX, clientY };
  }, []);

  const updateScrollInput = useCallback((input: DragAutoScrollInput) => {
    pointerRef.current = input;
  }, []);

  useEffect(() => stop, [stop]);

  return {
    start,
    stop,
    updatePointer,
    updateScrollInput,
  };
}

/** @deprecated Use {@link useDragAutoScroll}. */
export const useEditorDragAutoScroll = useDragAutoScroll;

export default useDragAutoScroll;
