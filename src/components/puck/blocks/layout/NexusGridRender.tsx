"use client";

/**
 * @fileoverview Grid layout render — CSS grid host with array-managed cells.
 *
 * Each cell is a Puck array slot (`items[].content`). Cell order can be changed from
 * the sidebar array (native Puck drag) or by dragging cell shells on the canvas.
 *
 * @module src/components/puck/blocks/layout/NexusGridRender
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useGetPuck, type PuckAction, type Data } from "@puckeditor/core";
import { cn } from "@/lib/utils";
import { findComponentById, replaceComponentProps } from "../../lib/puckDataTree";
import {
  NEXUS_GRID_ITEM_DEFAULT_SPAN_COL,
  NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW,
  resolveCarouselAwareGridCellSpanRow,
  resolveCarouselAwareGridGap,
} from "../../lib/gridEditSizing";
import {
  reorderGridItemArray,
  resolveGridCellDropIndex,
  type GridItemArrayEntry,
} from "../../lib/gridItemArrayReorder";
import { resolveGridCellPlacements } from "../../lib/gridCellPlacement";
import {
  GridItemCellShell,
  type GridItemContentComponent,
} from "./gridItemCellRender";

/** Single grid cell from the `items` array field. */
export interface NexusGridItemRecord {
  label?: string;
  spanCol?: string;
  spanRow?: string;
  content?: GridItemContentComponent;
}

/** Props for {@link NexusGridRender}. */
export interface NexusGridRenderProps {
  id?: string;
  columns: string;
  gap: string;
  items?: NexusGridItemRecord[];
  puck?: { isEditing?: boolean };
}

/** Minimal Puck store accessor for canvas cell reorder (editor only). */
interface NexusGridPuckStore {
  appState: { data?: Data };
  dispatch: (action: PuckAction) => void;
}

/** Internal props for the shared grid body. */
interface NexusGridBodyProps extends NexusGridRenderProps {
  /** Puck store accessor for cell reorder dispatch (editor shell only). */
  getPuck?: () => NexusGridPuckStore;
}

/** Active canvas cell drag session. */
interface GridCellDragSession {
  /** Source cell index. */
  fromIndex: number;
  /** Pointer id for capture. */
  pointerId: number;
}

/**
 * Read the grid cell index from a DOM event target.
 *
 * @param target - Event target node.
 * @returns Cell index or null.
 */
function readGridCellIndexFromTarget(target: EventTarget | null): number | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const shell = target.closest("[data-nexus-grid-cell-index]");
  if (!(shell instanceof HTMLElement)) {
    return null;
  }

  const raw = shell.getAttribute("data-nexus-grid-cell-index");
  if (raw === null) {
    return null;
  }

  const index = Number.parseInt(raw, 10);
  return Number.isFinite(index) ? index : null;
}

/**
 * Stable React key for a grid cell — prefer nested block id over array index.
 *
 * @param gridId - Puck block id for the parent grid.
 * @param item - Grid cell record.
 * @param index - Zero-based array index fallback.
 * @returns Key string for the cell shell.
 */
function resolveGridCellReactKey(
  gridId: string | undefined,
  item: NexusGridItemRecord,
  index: number,
): string {
  const content = item.content;
  if (Array.isArray(content)) {
    for (const entry of content) {
      if (
        entry &&
        typeof entry === "object" &&
        "props" in entry &&
        entry.props &&
        typeof entry.props === "object" &&
        "id" in entry.props &&
        typeof entry.props.id === "string" &&
        entry.props.id
      ) {
        return `${gridId ?? "grid"}-cell-${entry.props.id}`;
      }
    }
  }

  const label = typeof item.label === "string" ? item.label.trim() : "";
  if (label) {
    return `${gridId ?? "grid"}-${label}-${index}`;
  }

  return `${gridId ?? "grid"}-cell-${index}`;
}

/**
 * Shared grid layout body — no Puck store hooks (safe inside `<Render>`).
 *
 * @param props - Grid body props.
 * @returns Grid container element.
 */
function NexusGridBody({
  id,
  columns,
  gap,
  items = [],
  puck,
  getPuck,
}: NexusGridBodyProps) {
  const editLayoutMode = Boolean(puck?.isEditing);
  const cols = parseInt(columns, 10) || 12;
  const rootRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<GridCellDragSession | null>(null);
  const [draggingFromIndex, setDraggingFromIndex] = useState<number | null>(null);
  const [inCarouselSlide, setInCarouselSlide] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    setInCarouselSlide(Boolean(root?.closest(".nexus-carousel__slide")));
  }, [id, items.length, editLayoutMode]);

  const resolvedGap = resolveCarouselAwareGridGap(gap, inCarouselSlide);

  const cellPlacements = useMemo(
    () =>
      resolveGridCellPlacements(
        cols,
        items.map((item) => ({
          spanCol: Number.parseInt(item.spanCol ?? NEXUS_GRID_ITEM_DEFAULT_SPAN_COL, 10),
          spanRow: resolveCarouselAwareGridCellSpanRow(item.spanRow, inCarouselSlide),
        })),
      ),
    [cols, inCarouselSlide, items],
  );

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridAutoRows: "auto",
    alignContent: "start",
    alignItems: "start",
    gap: resolvedGap,
    width: "100%",
  };

  const commitCellReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!id || fromIndex === toIndex || !getPuck) {
        return;
      }

      const puckState = getPuck();
      const data = puckState.appState.data;
      if (!data) {
        return;
      }

      const match = findComponentById(data, id);
      if (!match) {
        return;
      }

      const currentItems = Array.isArray(match.node.props.items)
        ? (match.node.props.items as GridItemArrayEntry[])
        : [];

      const nextItems = reorderGridItemArray(currentItems, fromIndex, toIndex);

      puckState.dispatch({
        type: "setData",
        data: replaceComponentProps(data, id, { items: nextItems }),
      });
    },
    [getPuck, id],
  );

  const endCellDrag = useCallback(() => {
    dragSessionRef.current = null;
    setDraggingFromIndex(null);
  }, []);

  const handleCellPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!editLayoutMode || !id) {
        return;
      }

      const target = event.target;
      if (target instanceof Element && target.closest("[data-puck-component]")) {
        return;
      }

      if (target instanceof Element && target.closest("[data-puck-dropzone]")) {
        const dropZone = target.closest("[data-puck-dropzone]");
        if (dropZone instanceof HTMLElement && dropZone.querySelector("[data-puck-component]")) {
          return;
        }
      }

      const cellIndex = readGridCellIndexFromTarget(event.currentTarget);
      if (cellIndex === null) {
        return;
      }

      dragSessionRef.current = {
        fromIndex: cellIndex,
        pointerId: event.pointerId,
      };
      setDraggingFromIndex(cellIndex);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [editLayoutMode, id],
  );

  const handleGridPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      const overIndex = readGridCellIndexFromTarget(
        document.elementFromPoint(event.clientX, event.clientY),
      );

      if (overIndex !== null && items.length > 0) {
        const toIndex = resolveGridCellDropIndex(
          session.fromIndex,
          overIndex,
          items.length,
        );
        commitCellReorder(session.fromIndex, toIndex);
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      endCellDrag();
    },
    [commitCellReorder, endCellDrag, items.length],
  );

  useEffect(() => {
    if (!editLayoutMode) {
      endCellDrag();
    }
  }, [editLayoutMode, endCellDrag]);

  return (
    <div
      ref={rootRef}
      className={cn("nexus-grid-host", editLayoutMode && "nexus-grid-host--edit")}
      style={{ width: "100%" }}
    >
      <div
        className={cn("nexus-grid", editLayoutMode && "nexus-grid--edit")}
        style={gridStyle}
        onPointerUp={handleGridPointerUp}
        onPointerCancel={endCellDrag}
      >
        {items.map((item, index) => (
          <GridItemCellShell
            key={resolveGridCellReactKey(id, item, index)}
            cellIndex={index}
            Content={item.content}
            editLayoutMode={editLayoutMode}
            inCarouselSlide={inCarouselSlide}
            isDraggingCell={draggingFromIndex === index}
            placement={cellPlacements[index] ?? { gridColumn: "1 / span 1", gridRow: "1 / span 1" }}
            onCellPointerDown={editLayoutMode ? handleCellPointerDown : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Puck editor shell — subscribes to Puck store hooks (must render inside `<Puck>`).
 *
 * @param props - Grid render props.
 * @returns Grid with edit-mode canvas cell reorder.
 */
function NexusGridEditorShell(props: NexusGridRenderProps) {
  const getPuck = useGetPuck() as () => NexusGridPuckStore;

  return <NexusGridBody {...props} getPuck={getPuck} />;
}

/**
 * Published / static grid — no Puck store hooks (safe inside `<Render>`).
 *
 * @param props - Grid render props.
 * @returns Grid for the public site.
 */
function NexusGridView(props: NexusGridRenderProps) {
  return <NexusGridBody {...props} />;
}

/**
 * Grid layout entry — routes to editor or static render based on Puck context.
 *
 * @param props - Grid render props.
 * @returns Grid UI.
 */
export function NexusGridRender(props: NexusGridRenderProps) {
  if (props.puck?.isEditing) {
    return <NexusGridEditorShell {...props} />;
  }

  return <NexusGridView {...props} />;
}

export default NexusGridRender;
