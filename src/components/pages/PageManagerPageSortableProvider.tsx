"use client";

/**
 * @fileoverview Cross-section drag reorder for Page Manager catalog cards.
 *
 * @module src/components/pages/PageManagerPageSortableProvider
 */

import {
  shouldShowEditorDropSlotAfter,
  shouldShowEditorDropSlotBefore,
} from "@/components/global-layout/lib/editorSortableLogic";
import type { ManagerCatalogSection } from "@shared/constants/pageCategoriesHub";
import { PAGE_CATALOG_DRAG_HORIZONTAL_MIN_WIDTH } from "@shared/constants/pageCatalogDisplay";
import {
  moveManagerCatalogPage,
  type PageManagerCatalogDragSource,
  type PageManagerCatalogDragTarget,
  type PageManagerCrossDomainMove,
} from "@shared/lib/pageManagerCatalogLogic";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import type { OutlineDropPosition } from "@/components/puck/lib/outlineSortableLogic";
import {
  beginPageManagerCatalogDragGhost,
  finishPageManagerCatalogDragGhost,
  updatePageManagerCatalogDragGhost,
  type PageManagerCatalogDragGhostSession,
} from "@/components/pages/lib/pageManagerCatalogDragGhost";
import {
  applyCatalogDragPreviewTransforms,
  captureCatalogGridVisualRects,
  clearCatalogDragPreviewTransforms,
  commitCatalogDropMotion,
  type PendingCatalogDropFlip,
  type RegisteredCatalogGridCell,
} from "@/components/pages/lib/pageManagerCatalogDragMotion";
import { resolveManagerCatalogPreviewShiftOffsets } from "@shared/lib/pageManagerCatalogDragMotionLogic";
import { flushSync } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/** Minimum pointer movement before drag activates. */
const DRAG_THRESHOLD_PX = 5;

/**
 * Whether catalog page drag should use horizontal (left/right) drop slots.
 *
 * Matches the multi-column grid breakpoint in `page-catalog.css`.
 *
 * @returns `true` when the viewport is wide enough for side drop animation.
 */
function catalogPageDragUsesHorizontalSlots(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(min-width: ${PAGE_CATALOG_DRAG_HORIZONTAL_MIN_WIDTH}px)`).matches;
}

/**
 * Resolve insert-before/after from pointer position relative to a card rect.
 *
 * @param rect - Card bounding box.
 * @param clientX - Pointer X.
 * @param clientY - Pointer Y.
 * @param horizontal - Use left/right halves instead of top/bottom.
 * @returns Drop side relative to the hovered card.
 */
function resolveCatalogPageDropPosition(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  clientX: number,
  clientY: number,
  horizontal: boolean,
): OutlineDropPosition {
  if (horizontal) {
    return clientX < rect.left + rect.width / 2 ? "before" : "after";
  }
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

/** Active page-card drag session. */
export interface PageManagerPageDragState {
  source: PageManagerCatalogDragSource;
  target: PageManagerCatalogDragTarget;
}

interface RegisteredPageRow {
  sectionId: string;
  pageIndex: number;
  element: HTMLElement;
}

interface RegisteredSectionZone {
  sectionId: string;
  pageCount: number;
  element: HTMLElement;
}

/** Context value for page-card drag reordering. */
export interface PageManagerPageSortableContextValue {
  dragState: PageManagerPageDragState | null;
  isDropAnimating: boolean;
  registerPageRow: (sectionId: string, pageIndex: number, node: HTMLElement | null) => void;
  registerGridCell: (sectionId: string, pageIndex: number, node: HTMLElement | null) => void;
  registerSectionZone: (sectionId: string, pageCount: number, node: HTMLElement | null) => void;
  getPageHandleProps: (
    sectionId: string,
    pageIndex: number,
  ) => { onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void };
  getPageRowClassName: (sectionId: string, pageIndex: number, baseClassName: string) => string;
  getSectionClassName: (sectionId: string, baseClassName: string) => string;
  shouldShowDropSlotBefore: (sectionId: string, pageIndex: number) => boolean;
  shouldShowDropSlotAfter: (sectionId: string, pageIndex: number, pageCount: number) => boolean;
}

const PageManagerPageSortableContext = createContext<PageManagerPageSortableContextValue | null>(
  null,
);

/** Props for {@link PageManagerPageSortableProvider}. */
export interface PageManagerPageSortableProviderProps {
  sections: readonly ManagerCatalogSection[];
  knownDomains: readonly string[];
  onSectionsChange: (sections: ManagerCatalogSection[]) => void;
  onCrossDomainMove: (pending: PageManagerCrossDomainMove) => void;
  children: ReactNode;
}

/**
 * Provide cross-section drag reorder for page catalog cards.
 *
 * @param props - Provider props.
 * @returns Context provider wrapper.
 */
export function PageManagerPageSortableProvider({
  sections,
  knownDomains,
  onSectionsChange,
  onCrossDomainMove,
  children,
}: PageManagerPageSortableProviderProps) {
  const pageRowsRef = useRef<RegisteredPageRow[]>([]);
  const gridCellsRef = useRef<RegisteredCatalogGridCell[]>([]);
  const sectionZonesRef = useRef<RegisteredSectionZone[]>([]);
  const sessionRef = useRef<{
    active: boolean;
    pointerId: number;
    source: PageManagerCatalogDragSource;
    startX: number;
    startY: number;
  } | null>(null);

  const [dragState, setDragState] = useState<PageManagerPageDragState | null>(null);
  const [isDropAnimating, setIsDropAnimating] = useState(false);
  const dragStateRef = useRef<PageManagerPageDragState | null>(null);
  const ghostSessionRef = useRef<PageManagerCatalogDragGhostSession | null>(null);
  const pendingDropFlipRef = useRef<PendingCatalogDropFlip | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
    if (!dragState) {
      document.body.classList.remove("page-manager-catalog--dragging");
      return undefined;
    }

    document.body.classList.add("page-manager-catalog--dragging");
    return () => {
      document.body.classList.remove("page-manager-catalog--dragging");
    };
  }, [dragState]);

  useEffect(() => {
    if (!isDropAnimating) {
      document.body.classList.remove("page-manager-catalog--drop-animating");
      return undefined;
    }

    document.body.classList.add("page-manager-catalog--drop-animating");
    return () => {
      document.body.classList.remove("page-manager-catalog--drop-animating");
    };
  }, [isDropAnimating]);

  const registerPageRow = useCallback(
    (sectionId: string, pageIndex: number, node: HTMLElement | null) => {
      const rows = pageRowsRef.current.filter(
        (row) => !(row.sectionId === sectionId && row.pageIndex === pageIndex),
      );
      if (node) rows.push({ sectionId, pageIndex, element: node });
      pageRowsRef.current = rows;
    },
    [],
  );

  const registerGridCell = useCallback(
    (sectionId: string, pageIndex: number, node: HTMLElement | null) => {
      const cells = gridCellsRef.current.filter(
        (cell) => !(cell.sectionId === sectionId && cell.pageIndex === pageIndex),
      );
      if (node) cells.push({ sectionId, pageIndex, element: node });
      gridCellsRef.current = cells;
    },
    [],
  );

  const registerSectionZone = useCallback(
    (sectionId: string, pageCount: number, node: HTMLElement | null) => {
      const zones = sectionZonesRef.current.filter((zone) => zone.sectionId !== sectionId);
      if (node) zones.push({ sectionId, pageCount, element: node });
      sectionZonesRef.current = zones;
    },
    [],
  );

  const resolveHover = useCallback(
    (clientX: number, clientY: number): PageManagerPageDragState | null => {
      const session = sessionRef.current;
      if (!session) return null;

      for (const zone of sectionZonesRef.current) {
        const rect = zone.element.getBoundingClientRect();
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          continue;
        }

        const sectionRows = pageRowsRef.current
          .filter((row) => row.sectionId === zone.sectionId)
          .sort((left, right) => left.pageIndex - right.pageIndex);

        if (sectionRows.length === 0) {
          return {
            source: session.source,
            target: { sectionId: zone.sectionId, pageIndex: 0, position: "before" },
          };
        }

        for (const row of sectionRows) {
          const rowRect = row.element.getBoundingClientRect();
          if (
            clientX >= rowRect.left &&
            clientX <= rowRect.right &&
            clientY >= rowRect.top &&
            clientY <= rowRect.bottom
          ) {
            const horizontal = catalogPageDragUsesHorizontalSlots();
            return {
              source: session.source,
              target: {
                sectionId: zone.sectionId,
                pageIndex: row.pageIndex,
                position: resolveCatalogPageDropPosition(
                  rowRect,
                  clientX,
                  clientY,
                  horizontal,
                ),
              },
            };
          }
        }

        let nearestRow = sectionRows[0]!;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const row of sectionRows) {
          const rowRect = row.element.getBoundingClientRect();
          const centerX = rowRect.left + rowRect.width / 2;
          const centerY = rowRect.top + rowRect.height / 2;
          const distance = Math.hypot(clientX - centerX, clientY - centerY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestRow = row;
          }
        }

        const nearestRect = nearestRow.element.getBoundingClientRect();
        const horizontal = catalogPageDragUsesHorizontalSlots();
        return {
          source: session.source,
          target: {
            sectionId: zone.sectionId,
            pageIndex: nearestRow.pageIndex,
            position: resolveCatalogPageDropPosition(
              nearestRect,
              clientX,
              clientY,
              horizontal,
            ),
          },
        };
      }

      return dragStateRef.current;
    },
    [],
  );

  const dragAutoScroll = useDragAutoScroll({
    onTick: (clientY, clientX) => {
      if (!sessionRef.current?.active) return;
      const hover = resolveHover(clientX, clientY);
      if (hover) setDragState(hover);
    },
  });

  useLayoutEffect(() => {
    const pendingDrop = pendingDropFlipRef.current;
    if (pendingDrop) {
      pendingDropFlipRef.current = null;

      commitCatalogDropMotion(pendingDrop, gridCellsRef.current, () => {
        setIsDropAnimating(false);
      });
      return;
    }

    if (!dragState) {
      clearCatalogDragPreviewTransforms(gridCellsRef.current);
      return;
    }

    const { source, target } = dragState;
    if (source.sectionId !== target.sectionId) {
      clearCatalogDragPreviewTransforms(gridCellsRef.current);
      return;
    }

    const section = sections.find((entry) => entry.id === source.sectionId);
    if (!section) {
      return;
    }

    const shifts = resolveManagerCatalogPreviewShiftOffsets(
      section.pages.length,
      source.pageIndex,
      target.pageIndex,
      target.position,
    );
    const sectionCells = gridCellsRef.current.filter((cell) => cell.sectionId === source.sectionId);
    applyCatalogDragPreviewTransforms(sectionCells, shifts);
  }, [dragState, sections]);

  const findPageRowElement = useCallback((sectionId: string, pageIndex: number) => {
    return (
      pageRowsRef.current.find(
        (row) => row.sectionId === sectionId && row.pageIndex === pageIndex,
      )?.element ?? null
    );
  }, []);

  const finishSession = useCallback(
    (didDrag: boolean) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      dragAutoScroll.stop();
      document.body.classList.remove("global-layout-editor--dragging");

      const finalState = dragStateRef.current;
      const ghostSession = ghostSessionRef.current;
      ghostSessionRef.current = null;

      if (!didDrag || !finalState) {
        setDragState(null);
        setIsDropAnimating(false);
        finishPageManagerCatalogDragGhost(ghostSession);
        return;
      }

      const result = moveManagerCatalogPage(
        sections,
        finalState.source,
        finalState.target,
        knownDomains,
      );

      if (result.crossDomainMove) {
        setDragState(null);
        setIsDropAnimating(false);
        finishPageManagerCatalogDragGhost(ghostSession, {
          onComplete: () => onCrossDomainMove(result.crossDomainMove!),
        });
        return;
      }

      const sourceSection = sections.find((entry) => entry.id === finalState.source.sectionId);
      const movedPage = sourceSection?.pages[finalState.source.pageIndex];
      const movedPath = movedPage?.path ?? null;
      const didReorder = result.sections !== sections;

      if (didReorder && movedPath && ghostSession) {
        const affectedSectionIds = new Set<string>([
          finalState.source.sectionId,
          finalState.target.sectionId,
        ]);
        const beforeRects = captureCatalogGridVisualRects(
          gridCellsRef.current,
          affectedSectionIds,
        );
        const ghostRect = ghostSession.ghost.getBoundingClientRect();

        pendingDropFlipRef.current = {
          beforeRects,
          ghostRect,
          movedPath,
          ghostSession,
          affectedSectionIds,
        };

        flushSync(() => {
          onSectionsChange(result.sections);
          setIsDropAnimating(true);
          setDragState(null);
        });
        return;
      }

      setDragState(null);
      setIsDropAnimating(false);
      finishPageManagerCatalogDragGhost(ghostSession);
    },
    [dragAutoScroll, knownDomains, onCrossDomainMove, onSectionsChange, sections],
  );

  const handleDocumentPointerMove = useCallback(
    (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);

      if (!session.active && distance >= DRAG_THRESHOLD_PX) {
        session.active = true;
        document.body.classList.add("global-layout-editor--dragging");
        dragAutoScroll.start();

        const sourceElement = findPageRowElement(session.source.sectionId, session.source.pageIndex);
        if (sourceElement) {
          ghostSessionRef.current = beginPageManagerCatalogDragGhost(
            sourceElement,
            event.clientX,
            event.clientY,
          );
        }

        setDragState({
          source: session.source,
          target: {
            sectionId: session.source.sectionId,
            pageIndex: session.source.pageIndex,
            position: "after",
          },
        });
      }

      if (session.active) {
        event.preventDefault();
        dragAutoScroll.updatePointer(event.clientX, event.clientY);
        if (ghostSessionRef.current) {
          updatePageManagerCatalogDragGhost(
            ghostSessionRef.current,
            event.clientX,
            event.clientY,
          );
        }
        const hover = resolveHover(event.clientX, event.clientY);
        if (hover) setDragState(hover);
      }
    },
    [dragAutoScroll, findPageRowElement, resolveHover],
  );

  const handleDocumentPointerUp = useCallback(
    (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      document.removeEventListener("pointermove", handleDocumentPointerMove);
      document.removeEventListener("pointerup", handleDocumentPointerUp);
      document.removeEventListener("pointercancel", handleDocumentPointerUp);
      finishSession(session.active);
    },
    [finishSession, handleDocumentPointerMove],
  );

  const getPageHandleProps = useCallback(
    (sectionId: string, pageIndex: number) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        sessionRef.current = {
          active: false,
          pointerId: event.pointerId,
          source: { sectionId, pageIndex },
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

  const getPageRowClassName = useCallback(
    (sectionId: string, pageIndex: number, baseClassName: string) => {
      if (!dragState) {
        return baseClassName;
      }
      const classes = [baseClassName];
      if (
        dragState.source.sectionId === sectionId &&
        dragState.source.pageIndex === pageIndex
      ) {
        classes.push("page-manager-catalog__card-wrap--drag-source");
      }
      if (
        dragState.target.sectionId === sectionId &&
        dragState.target.pageIndex === pageIndex
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

  const getSectionClassName = useCallback(
    (sectionId: string, baseClassName: string) => {
      if (!dragState) return baseClassName;
      if (
        dragState.target.sectionId === sectionId &&
        dragState.source.sectionId !== sectionId
      ) {
        return `${baseClassName} global-layout-editor__card--receiving`;
      }
      return baseClassName;
    },
    [dragState],
  );

  const shouldShowDropSlotBefore = useCallback(
    (sectionId: string, pageIndex: number) => {
      if (!dragState || dragState.target.sectionId !== sectionId) return false;
      return shouldShowEditorDropSlotBefore(
        dragState.target.pageIndex,
        pageIndex,
        dragState.target.position,
      );
    },
    [dragState],
  );

  const shouldShowDropSlotAfter = useCallback(
    (sectionId: string, pageIndex: number, pageCount: number) => {
      if (!dragState || dragState.target.sectionId !== sectionId) return false;
      return shouldShowEditorDropSlotAfter(
        dragState.target.pageIndex,
        pageIndex,
        pageCount,
        dragState.target.position,
      );
    },
    [dragState],
  );

  const value = useMemo<PageManagerPageSortableContextValue>(
    () => ({
      dragState,
      isDropAnimating,
      registerPageRow,
      registerGridCell,
      registerSectionZone,
      getPageHandleProps,
      getPageRowClassName,
      getSectionClassName,
      shouldShowDropSlotBefore,
      shouldShowDropSlotAfter,
    }),
    [
      dragState,
      isDropAnimating,
      registerPageRow,
      registerGridCell,
      registerSectionZone,
      getPageHandleProps,
      getPageRowClassName,
      getSectionClassName,
      shouldShowDropSlotBefore,
      shouldShowDropSlotAfter,
    ],
  );

  return (
    <PageManagerPageSortableContext.Provider value={value}>
      {children}
    </PageManagerPageSortableContext.Provider>
  );
}

/**
 * Consume the page manager catalog page drag context.
 *
 * @returns Drag helpers for catalog cards.
 */
export function usePageManagerPageSortable(): PageManagerPageSortableContextValue {
  const context = useContext(PageManagerPageSortableContext);
  if (!context) {
    throw new Error("usePageManagerPageSortable must be used within PageManagerPageSortableProvider");
  }
  return context;
}

export default PageManagerPageSortableProvider;
