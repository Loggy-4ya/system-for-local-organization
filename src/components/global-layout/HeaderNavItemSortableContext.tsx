"use client";

/**
 * @fileoverview Cross-category drag reorder for header navigation link rows.
 *
 * @module src/components/global-layout/HeaderNavItemSortableContext
 */

import {
  moveHeaderNavItem,
  shouldShowEditorDropSlotAfter,
  shouldShowEditorDropSlotBefore,
  type HeaderNavDragSource,
  type HeaderNavDragTarget,
} from "@/components/global-layout/lib/editorSortableLogic";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import type { HeaderCategory } from "@shared/constants/globalLayout";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/** Minimum pointer movement before drag activates. */
const DRAG_THRESHOLD_PX = 5;

/** Active cross-category nav drag session. */
export interface HeaderNavDragState {
  /** Dragged item location. */
  source: HeaderNavDragSource;
  /** Current hover target. */
  target: HeaderNavDragTarget;
}

/** Registered nav row in the category tree. */
interface RegisteredNavRow {
  /** Owning category id. */
  categoryId: string;
  /** Item index inside the category. */
  itemIndex: number;
  /** Row element. */
  element: HTMLElement;
}

/** Registered category list container used for empty/append drops. */
interface RegisteredCategoryListZone {
  /** Category id. */
  categoryId: string;
  /** Number of items currently in the category. */
  itemCount: number;
  /** List container element. */
  element: HTMLElement;
}

/** Context value exposed to nav row components. */
export interface HeaderNavItemSortableContextValue {
  /** Active drag session, if any. */
  dragState: HeaderNavDragState | null;
  /** Register one nav row element. */
  registerNavRow: (categoryId: string, itemIndex: number, node: HTMLElement | null) => void;
  /** Register a category list container for empty/append drops. */
  registerCategoryListZone: (
    categoryId: string,
    itemCount: number,
    node: HTMLElement | null,
  ) => void;
  /** Pointer handlers for a nav row drag handle. */
  getNavHandleProps: (
    categoryId: string,
    itemIndex: number,
  ) => {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  };
  /** Row class names for drag/hover affordances. */
  getNavRowClassName: (categoryId: string, itemIndex: number, baseClassName: string) => string;
  /** Category card class names when receiving a cross-category drop. */
  getCategoryClassName: (categoryId: string, baseClassName: string) => string;
  /** Whether to render a drop slot before the row. */
  shouldShowDropSlotBefore: (categoryId: string, itemIndex: number) => boolean;
  /** Whether to render a trailing drop slot after the final row. */
  shouldShowDropSlotAfter: (categoryId: string, itemIndex: number, itemCount: number) => boolean;
}

const HeaderNavItemSortableContext = createContext<HeaderNavItemSortableContextValue | null>(
  null,
);

/** Props for {@link HeaderNavItemSortableProvider}. */
export interface HeaderNavItemSortableProviderProps {
  /** Current header categories. */
  categories: readonly HeaderCategory[];
  /** Called after a successful cross-category move or reorder. */
  onCategoriesChange: (categories: HeaderCategory[]) => void;
  /** Nav rows that consume the drag context. */
  children: ReactNode;
}

/**
 * Provide cross-category drag reorder for header navigation items.
 *
 * @param props - Provider props.
 * @returns Context provider wrapper.
 */
export function HeaderNavItemSortableProvider({
  categories,
  onCategoriesChange,
  children,
}: HeaderNavItemSortableProviderProps) {
  const navRowsRef = useRef<RegisteredNavRow[]>([]);
  const listZonesRef = useRef<RegisteredCategoryListZone[]>([]);
  const sessionRef = useRef<{
    active: boolean;
    pointerId: number;
    source: HeaderNavDragSource;
    startX: number;
    startY: number;
  } | null>(null);

  const [dragState, setDragState] = useState<HeaderNavDragState | null>(null);
  const dragStateRef = useRef<HeaderNavDragState | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const registerNavRow = useCallback(
    (categoryId: string, itemIndex: number, node: HTMLElement | null) => {
      const rows = navRowsRef.current.filter(
        (row) => !(row.categoryId === categoryId && row.itemIndex === itemIndex),
      );

      if (node) {
        rows.push({ categoryId, itemIndex, element: node });
      }

      navRowsRef.current = rows;
    },
    [],
  );

  const registerCategoryListZone = useCallback(
    (categoryId: string, itemCount: number, node: HTMLElement | null) => {
      const zones = listZonesRef.current.filter((zone) => zone.categoryId !== categoryId);

      if (node) {
        zones.push({ categoryId, itemCount, element: node });
      }

      listZonesRef.current = zones;
    },
    [],
  );

  const resolveHover = useCallback((clientY: number): HeaderNavDragState | null => {
    const session = sessionRef.current;
    if (!session) {
      return null;
    }

    for (const zone of listZonesRef.current) {
      const rect = zone.element.getBoundingClientRect();
      if (clientY < rect.top || clientY > rect.bottom) {
        continue;
      }

      const categoryRows = navRowsRef.current
        .filter((row) => row.categoryId === zone.categoryId)
        .sort((left, right) => left.itemIndex - right.itemIndex);

      if (categoryRows.length === 0) {
        return {
          source: session.source,
          target: {
            categoryId: zone.categoryId,
            itemIndex: 0,
            position: "before",
          },
        };
      }

      for (const row of categoryRows) {
        const rowRect = row.element.getBoundingClientRect();
        const midpoint = rowRect.top + rowRect.height / 2;

        if (clientY < midpoint) {
          return {
            source: session.source,
            target: {
              categoryId: zone.categoryId,
              itemIndex: row.itemIndex,
              position: "before",
            },
          };
        }
      }

      const lastRow = categoryRows[categoryRows.length - 1];
      return {
        source: session.source,
        target: {
          categoryId: zone.categoryId,
          itemIndex: lastRow.itemIndex,
          position: "after",
        },
      };
    }

    return dragStateRef.current;
  }, []);

  const dragAutoScroll = useDragAutoScroll({
    onTick: (clientY) => {
      const session = sessionRef.current;
      if (!session?.active) {
        return;
      }

      const hover = resolveHover(clientY);
      if (hover) {
        setDragState(hover);
      }
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
        const nextCategories = moveHeaderNavItem(categories, state.source, state.target);

        if (nextCategories !== categories) {
          onCategoriesChange(nextCategories);
        }
      }

      setDragState(null);
    },
    [categories, dragAutoScroll, onCategoriesChange],
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
          source: session.source,
          target: {
            categoryId: session.source.categoryId,
            itemIndex: session.source.itemIndex,
            position: "after",
          },
        });
      }

      if (session.active) {
        event.preventDefault();
        dragAutoScroll.updatePointer(event.clientX, event.clientY);
        const hover = resolveHover(event.clientY);
        if (hover) {
          setDragState(hover);
        }
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

  const getNavHandleProps = useCallback(
    (categoryId: string, itemIndex: number) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        sessionRef.current = {
          active: false,
          pointerId: event.pointerId,
          source: { categoryId, itemIndex },
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

  const getNavRowClassName = useCallback(
    (categoryId: string, itemIndex: number, baseClassName: string) => {
      if (!dragState) {
        return baseClassName;
      }

      const classes = [baseClassName];

      if (
        dragState.source.categoryId === categoryId &&
        dragState.source.itemIndex === itemIndex
      ) {
        classes.push("global-layout-editor__item-row--dragging");
      }

      if (
        dragState.target.categoryId === categoryId &&
        dragState.target.itemIndex === itemIndex
      ) {
        classes.push(
          dragState.target.position === "before"
            ? "global-layout-editor__item-row--over-before"
            : "global-layout-editor__item-row--over-after",
        );
      }

      return classes.join(" ");
    },
    [dragState],
  );

  const getCategoryClassName = useCallback(
    (categoryId: string, baseClassName: string) => {
      if (!dragState) {
        return baseClassName;
      }

      if (
        dragState.target.categoryId === categoryId &&
        dragState.source.categoryId !== categoryId
      ) {
        return `${baseClassName} global-layout-editor__card--receiving`;
      }

      return baseClassName;
    },
    [dragState],
  );

  const shouldShowDropSlotBefore = useCallback(
    (categoryId: string, itemIndex: number) => {
      if (!dragState || dragState.target.categoryId !== categoryId) {
        return false;
      }

      return shouldShowEditorDropSlotBefore(
        dragState.target.itemIndex,
        itemIndex,
        dragState.target.position,
      );
    },
    [dragState],
  );

  const shouldShowDropSlotAfter = useCallback(
    (categoryId: string, itemIndex: number, itemCount: number) => {
      if (!dragState || dragState.target.categoryId !== categoryId) {
        return false;
      }

      return shouldShowEditorDropSlotAfter(
        dragState.target.itemIndex,
        itemIndex,
        itemCount,
        dragState.target.position,
      );
    },
    [dragState],
  );

  const value = useMemo<HeaderNavItemSortableContextValue>(
    () => ({
      dragState,
      registerNavRow,
      registerCategoryListZone,
      getNavHandleProps,
      getNavRowClassName,
      getCategoryClassName,
      shouldShowDropSlotBefore,
      shouldShowDropSlotAfter,
    }),
    [
      dragState,
      registerNavRow,
      registerCategoryListZone,
      getNavHandleProps,
      getNavRowClassName,
      getCategoryClassName,
      shouldShowDropSlotBefore,
      shouldShowDropSlotAfter,
    ],
  );

  return (
    <HeaderNavItemSortableContext.Provider value={value}>
      {children}
    </HeaderNavItemSortableContext.Provider>
  );
}

/**
 * Consume the header nav cross-category drag context.
 *
 * @returns Drag helpers for nav rows.
 */
export function useHeaderNavItemSortable(): HeaderNavItemSortableContextValue {
  const context = useContext(HeaderNavItemSortableContext);

  if (!context) {
    throw new Error("useHeaderNavItemSortable must be used within HeaderNavItemSortableProvider");
  }

  return context;
}

export default HeaderNavItemSortableProvider;
