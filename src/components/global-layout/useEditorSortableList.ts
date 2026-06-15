"use client";

/**
 * @fileoverview Pointer-driven flat-list drag reorder for the Global Layout Editor.
 *
 * @module src/components/global-layout/useEditorSortableList
 */

import {
  reorderEditorList,
  resolveEditorRowDropPosition,
  shouldShowEditorDropSlotAfter,
  shouldShowEditorDropSlotBefore,
} from "@/components/global-layout/lib/editorSortableLogic";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import type { OutlineDropPosition } from "@/components/puck/lib/outlineSortableLogic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Minimum pointer movement before drag activates. */
const DRAG_THRESHOLD_PX = 5;

/** Active drag session state. */
export interface EditorSortableDragState {
  /** Index of the row being dragged. */
  fromIndex: number;
  /** Index of the row under the pointer. */
  overIndex: number;
  /** Insertion side relative to the hovered row. */
  overPosition: OutlineDropPosition;
}

/** Props for {@link useEditorSortableList}. */
export interface UseEditorSortableListOptions<T> {
  /** Current list items. */
  items: readonly T[];
  /** Called with the reordered list after a successful drop. */
  onReorder: (items: T[]) => void;
}

/**
 * Wire pointer drag reordering for a vertical list of rows.
 *
 * @param options - List reorder options.
 * @returns Drag state and row/handle prop factories.
 */
export function useEditorSortableList<T>({
  items,
  onReorder,
}: UseEditorSortableListOptions<T>) {
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const sessionRef = useRef<{
    active: boolean;
    pointerId: number;
    fromIndex: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [dragState, setDragState] = useState<EditorSortableDragState | null>(null);
  const dragStateRef = useRef<EditorSortableDragState | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const registerRowRef = useCallback((index: number, node: HTMLElement | null) => {
    rowRefs.current[index] = node;
  }, []);

  const resolveHover = useCallback((clientY: number): EditorSortableDragState | null => {
    const session = sessionRef.current;
    if (!session) {
      return null;
    }

    for (let index = 0; index < rowRefs.current.length; index += 1) {
      const row = rowRefs.current[index];
      if (!row) {
        continue;
      }

      const rect = row.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return {
          fromIndex: session.fromIndex,
          overIndex: index,
          overPosition: resolveEditorRowDropPosition(rect, clientY),
        };
      }
    }

    return {
      fromIndex: session.fromIndex,
      overIndex: session.fromIndex,
      overPosition: "after",
    };
  }, []);

  const dragAutoScroll = useDragAutoScroll({
    onTick: (clientY) => {
      const session = sessionRef.current;
      if (!session?.active) {
        return;
      }

      setDragState(resolveHover(clientY));
    },
  });

  const finishSession = useCallback(
    (didDrag: boolean) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      dragAutoScroll.stop();
      document.body.classList.remove("global-layout-editor--dragging");

      if (didDrag && dragStateRef.current) {
        const state = dragStateRef.current;
        const next = reorderEditorList(
          items,
          state.fromIndex,
          state.overIndex,
          state.overPosition,
        );
        if (next !== items) {
          onReorder(next);
        }
      }

      setDragState(null);
    },
    [dragAutoScroll, items, onReorder],
  );

  const handleDocumentPointerMove = useCallback(
    (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);

      if (!session.active && distance >= DRAG_THRESHOLD_PX) {
        session.active = true;
        document.body.classList.add("global-layout-editor--dragging");
        dragAutoScroll.start();
        setDragState({
          fromIndex: session.fromIndex,
          overIndex: session.fromIndex,
          overPosition: "after",
        });
      }

      if (session.active) {
        event.preventDefault();
        dragAutoScroll.updatePointer(event.clientX, event.clientY);
        setDragState(resolveHover(event.clientY));
      }
    },
    [dragAutoScroll, resolveHover],
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

      finishSession(session.active);
    },
    [finishSession, handleDocumentPointerMove],
  );

  const getHandleProps = useCallback(
    (index: number) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        sessionRef.current = {
          active: false,
          pointerId: event.pointerId,
          fromIndex: index,
          startX: event.clientX,
          startY: event.clientY,
        };

        document.addEventListener("pointermove", handleDocumentPointerMove, { passive: false });
        document.addEventListener("pointerup", handleDocumentPointerUp);
        document.addEventListener("pointercancel", handleDocumentPointerUp);
      },
    }),
    [handleDocumentPointerMove, handleDocumentPointerUp],
  );

  const getRowClassName = useCallback(
    (index: number, baseClassName: string) => {
      if (!dragState) {
        return baseClassName;
      }

      const classes = [baseClassName, "global-layout-editor__item-row--sortable-active"];

      if (dragState.fromIndex === index) {
        classes.push("global-layout-editor__item-row--dragging");
      }

      if (dragState.overIndex === index) {
        classes.push(
          dragState.overPosition === "before"
            ? "global-layout-editor__item-row--over-before"
            : "global-layout-editor__item-row--over-after",
        );
      }

      return classes.join(" ");
    },
    [dragState],
  );

  const shouldShowDropSlotBefore = useCallback(
    (index: number) =>
      shouldShowEditorDropSlotBefore(
        dragState?.overIndex ?? -1,
        index,
        dragState?.overPosition ?? null,
      ),
    [dragState],
  );

  const shouldShowDropSlotAfter = useCallback(
    (index: number) =>
      shouldShowEditorDropSlotAfter(
        dragState?.overIndex ?? -1,
        index,
        items.length,
        dragState?.overPosition ?? null,
      ),
    [dragState, items.length],
  );

  return {
    dragState,
    registerRowRef,
    getHandleProps,
    getRowClassName,
    shouldShowDropSlotBefore,
    shouldShowDropSlotAfter,
  };
}

export default useEditorSortableList;
