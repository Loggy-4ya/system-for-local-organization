"use client";

/**
 * @fileoverview Tree-wide drag coordinator for the Puck outline panel.
 *
 * A single provider spans the full outline so drags can commit across nested
 * slot zones (e.g. carousel slides) as well as within sibling lists.
 *
 * @module src/components/puck/NexusOutlineDragContext
 */

import {
  filterOutlineDropTargetForGridItem,
  resolveOutlineDropFromPointer,
  resolveOutlineRowDropTarget,
  resolveOutlineZoneDropTarget,
  type OutlineDragSource,
  type OutlineDropPosition,
  type OutlineDropTarget,
} from "@/components/puck/lib/outlineSortableLogic";
import type { NexusGridItemZoneNode } from "@/components/puck/lib/nexusGridItemZonePolicy";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";

/** Puck move/reorder payload produced by the outline drag coordinator. */
export interface OutlineDragCommit {
  /** Moved block id. */
  itemId: string;
  /** Source zone compound key. */
  sourceZone: string;
  /** Source index within the source zone. */
  sourceIndex: number;
  /** Destination zone compound key. */
  destinationZone: string;
  /** Destination index within the destination zone. */
  destinationIndex: number;
}

/** Shared outline drag state. */
interface OutlineDragContextValue {
  /** Active drag source, if any. */
  dragSource: OutlineDragSource | null;
  /** Latest resolved drop target while dragging. */
  dropTarget: OutlineDropTarget | null;
  /** Horizontal pointer delta from drag start (negative = outdent). */
  dragPointerOffsetX: number;
  /** Begin dragging a block from the outline tree. */
  beginDrag: (source: OutlineDragSource, startClientX: number) => void;
  /** Track a row-level drop hover target. */
  hoverRowTarget: (
    targetZone: string,
    targetIndex: number,
    position: OutlineDropPosition,
  ) => void;
  /** Track a zone chrome drop target (title / empty list). */
  hoverZoneTarget: (destinationZone: string, destinationIndex: number) => void;
  /** Resolve the drop target under the pointer (capture-phase fallback). */
  hoverFromPointer: (clientX: number, clientY: number) => void;
  /** Commit the active drag using the latest hover target. */
  commitDrop: () => void;
  /** Clear drag state after cancel or successful drop. */
  clearDrag: () => void;
  /** Handle `dragend` on the source handle without racing `drop`. */
  finishDragFromSource: () => void;
}

const OutlineDragContext = createContext<OutlineDragContextValue | null>(null);

/** Props for {@link NexusOutlineDragProvider}. */
export interface NexusOutlineDragProviderProps {
  /** Outline tree children. */
  children: ReactNode;
  /** Called when a drag commits to a new zone/index. */
  onCommit: (commit: OutlineDragCommit) => void;
  /** Puck node index for grid-item destination validation. */
  outlineNodes?: Record<string, NexusGridItemZoneNode>;
}

/**
 * Provide tree-wide outline drag state.
 *
 * @param props - Provider props.
 * @returns Drag context wrapper.
 */
export function NexusOutlineDragProvider({
  children,
  onCommit,
  outlineNodes,
}: NexusOutlineDragProviderProps) {
  const [dragSource, setDragSource] = useState<OutlineDragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<OutlineDropTarget | null>(null);
  const [dragPointerOffsetX, setDragPointerOffsetX] = useState(0);
  const dragSourceRef = useRef<OutlineDragSource | null>(null);
  const dropTargetRef = useRef<OutlineDropTarget | null>(null);
  const droppedRef = useRef(false);
  const dragStartClientXRef = useRef(0);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const applyDropTarget = useCallback(
    (resolved: OutlineDropTarget | null, source: OutlineDragSource | null) => {
      if (!resolved || !source) {
        return;
      }

      const filtered = outlineNodes
        ? filterOutlineDropTargetForGridItem(source, resolved, outlineNodes)
        : resolved;

      if (!filtered) {
        return;
      }

      dropTargetRef.current = filtered;
      setDropTarget(filtered);
    },
    [outlineNodes],
  );

  const resolveHoverFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const source = dragSourceRef.current;
      if (!source) {
        return;
      }

      lastPointerRef.current = { x: clientX, y: clientY };

      const offsetX = clientX - dragStartClientXRef.current;
      setDragPointerOffsetX(offsetX);
      applyDropTarget(resolveOutlineDropFromPointer(source, clientX, clientY, offsetX), source);
    },
    [applyDropTarget],
  );

  const dragAutoScroll = useDragAutoScroll({
    getScrollInput: () => ({
      clientX: lastPointerRef.current.x,
      clientY: lastPointerRef.current.y,
    }),
    onTick: (clientY, clientX) => {
      resolveHoverFromPointer(clientX, clientY);
    },
  });

  const clearDrag = useCallback(() => {
    dragAutoScroll.stop();
    dragSourceRef.current = null;
    dropTargetRef.current = null;
    droppedRef.current = false;
    dragStartClientXRef.current = 0;
    setDragSource(null);
    setDropTarget(null);
    setDragPointerOffsetX(0);
  }, [dragAutoScroll]);

  const beginDrag = useCallback((source: OutlineDragSource, startClientX: number) => {
    dragSourceRef.current = source;
    dropTargetRef.current = null;
    droppedRef.current = false;
    dragStartClientXRef.current = startClientX;
    setDragSource(source);
    setDropTarget(null);
    setDragPointerOffsetX(0);
    dragAutoScroll.start();
  }, [dragAutoScroll]);

  const hoverRowTarget = useCallback(
    (targetZone: string, targetIndex: number, position: OutlineDropPosition) => {
      const source = dragSourceRef.current;
      if (!source) {
        return;
      }

      applyDropTarget(
        resolveOutlineRowDropTarget(source, targetZone, targetIndex, position),
        source,
      );
    },
    [applyDropTarget],
  );

  const hoverZoneTarget = useCallback(
    (destinationZone: string, destinationIndex: number) => {
      const source = dragSourceRef.current;
      if (!source) {
        return;
      }

      applyDropTarget(
        resolveOutlineZoneDropTarget(source, destinationZone, destinationIndex),
        source,
      );
    },
    [applyDropTarget],
  );

  const hoverFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      dragAutoScroll.updatePointer(clientX, clientY);
      resolveHoverFromPointer(clientX, clientY);
    },
    [dragAutoScroll, resolveHoverFromPointer],
  );

  const commitDrop = useCallback(() => {
    const source = dragSourceRef.current;
    const target = dropTargetRef.current;

    if (!source || !target || droppedRef.current) {
      return;
    }

    droppedRef.current = true;
    onCommit({
      itemId: source.itemId,
      sourceZone: source.sourceZone,
      sourceIndex: source.sourceIndex,
      destinationZone: target.destinationZone,
      destinationIndex: target.destinationIndex,
    });
    clearDrag();
  }, [clearDrag, onCommit]);

  const finishDragFromSource = useCallback(() => {
    window.setTimeout(() => {
      if (!droppedRef.current) {
        clearDrag();
      }
      droppedRef.current = false;
    }, 0);
  }, [clearDrag]);

  const value = useMemo(
    () => ({
      dragSource,
      dropTarget,
      dragPointerOffsetX,
      beginDrag,
      hoverRowTarget,
      hoverZoneTarget,
      hoverFromPointer,
      commitDrop,
      clearDrag,
      finishDragFromSource,
    }),
    [
      beginDrag,
      clearDrag,
      commitDrop,
      dragPointerOffsetX,
      dragSource,
      dropTarget,
      finishDragFromSource,
      hoverFromPointer,
      hoverRowTarget,
      hoverZoneTarget,
    ],
  );

  return <OutlineDragContext.Provider value={value}>{children}</OutlineDragContext.Provider>;
}

/**
 * Read the active outline drag context.
 *
 * @returns Drag context value.
 */
export function useOutlineDrag(): OutlineDragContextValue {
  const context = useContext(OutlineDragContext);
  if (!context) {
    throw new Error("useOutlineDrag must be used within NexusOutlineDragProvider");
  }
  return context;
}

/**
 * Attach native drag-over behavior for outline drop targets.
 *
 * @param event - Drag event.
 */
export function allowOutlineDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move";
}

export default NexusOutlineDragProvider;
