"use client";

/**
 * @fileoverview Pointer-driven drag helpers for the Puck outline tree.
 *
 * HTML5 `draggable` does not work reliably on touch devices. Rows use pointer
 * events with a small movement threshold so the full row is a drag surface.
 *
 * @module src/components/puck/lib/useOutlineRowPointerDrag
 */

import { useOutlineDrag } from "@/components/puck/NexusOutlineDragContext";
import type { OutlineLayerNode } from "@/components/puck/lib/outlineTreeModel";
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** Minimum pointer movement before a press becomes a drag. */
const OUTLINE_DRAG_THRESHOLD_PX = 6;

/** Props for {@link useOutlineRowPointerDrag}. */
export interface UseOutlineRowPointerDragOptions {
  /** Outline row node metadata. */
  node: OutlineLayerNode;
  /** Whether Puck permissions allow dragging this row. */
  canDrag: boolean;
  /** Called when the row is tapped without initiating a drag. */
  onTap?: () => void;
}

/**
 * Wire pointer press/move/release drag gestures for one outline row.
 *
 * @param options - Row drag options.
 * @returns Pointer handlers and drag state for the row shell.
 */
export function useOutlineRowPointerDrag({
  node,
  canDrag,
  onTap,
}: UseOutlineRowPointerDragOptions) {
  const { dragSource, beginDrag, hoverFromPointer, commitDrop, finishDragFromSource } =
    useOutlineDrag();
  const suppressClickRef = useRef(false);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const sessionRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const isDragging = dragSource?.itemId === node.itemId;

  const releasePointerCapture = useCallback((pointerId: number) => {
    const captureTarget = captureTargetRef.current;
    if (!captureTarget) {
      return;
    }

    try {
      if (captureTarget.hasPointerCapture(pointerId)) {
        captureTarget.releasePointerCapture(pointerId);
      }
    } catch {
      // Pointer may already be released when the row unmounts mid-drag.
    }

    captureTargetRef.current = null;
  }, []);

  const endPointerSession = useCallback(
    (didDrag: boolean) => {
      sessionRef.current = null;
      document.body.classList.remove("nexus-outline-pointer-dragging");

      if (didDrag) {
        suppressClickRef.current = true;
        commitDrop();
        finishDragFromSource();
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        return;
      }

      onTap?.();
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [commitDrop, finishDragFromSource, onTap],
  );

  const handleDocumentPointerMove = useCallback(
    (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      const deltaX = event.clientX - session.startX;
      const deltaY = event.clientY - session.startY;
      const distance = Math.hypot(deltaX, deltaY);

      if (!session.active && distance >= OUTLINE_DRAG_THRESHOLD_PX) {
        session.active = true;
        document.body.classList.add("nexus-outline-pointer-dragging");
        beginDrag(
          {
            itemId: node.itemId,
            sourceZone: node.zoneCompound,
            sourceIndex: node.index,
          },
          session.startX,
        );
      }

      if (session.active) {
        event.preventDefault();
        hoverFromPointer(event.clientX, event.clientY);
      }
    },
    [beginDrag, hoverFromPointer, node.index, node.itemId, node.zoneCompound],
  );

  const handleDocumentPointerUp = useCallback(
    (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      document.removeEventListener("pointermove", handleDocumentPointerMove);
      document.removeEventListener("pointerup", handleDocumentPointerUp);
      document.removeEventListener("pointercancel", handleDocumentPointerUp);

      releasePointerCapture(event.pointerId);
      endPointerSession(session.active);
    },
    [endPointerSession, handleDocumentPointerMove, releasePointerCapture],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!canDrag || event.button !== 0) {
        return;
      }

      captureTargetRef.current = event.currentTarget;
      sessionRef.current = {
        active: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
      document.addEventListener("pointermove", handleDocumentPointerMove, { passive: false });
      document.addEventListener("pointerup", handleDocumentPointerUp);
      document.addEventListener("pointercancel", handleDocumentPointerUp);
    },
    [canDrag, handleDocumentPointerMove, handleDocumentPointerUp],
  );

  const handlePointerUpOnRow = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      if (session.active) {
        event.preventDefault();
      }
    },
    [],
  );

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  return {
    handlePointerDown,
    handlePointerUpOnRow,
    isDragging,
    shouldSuppressClick,
  };
}

export default useOutlineRowPointerDrag;
