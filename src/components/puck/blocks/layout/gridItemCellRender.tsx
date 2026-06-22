"use client";

/**
 * @fileoverview Shared grid cell shell + drop zone rendering for {@link NexusGridRender}.
 *
 * Edit-mode drop targeting mirrors carousel slide slots (shell, flex fill, CSS hitboxes).
 *
 * @module src/components/puck/blocks/layout/gridItemCellRender
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { GridCellPlacement } from "../../lib/gridCellPlacement";
import { NEXUS_GRID_ITEM_CAROUSEL_EDIT_EMPTY_MIN_HEIGHT_PX, NEXUS_GRID_ITEM_EDIT_EMPTY_MIN_HEIGHT_PX } from "../../lib/gridEditSizing";

/** Puck slot component shape for a grid cell body. */
export type GridItemContentComponent = React.ComponentType<{
  ref?: React.Ref<HTMLElement>;
  className?: string;
  style?: React.CSSProperties;
  minEmptyHeight?: number | string;
}>;

/** Grid placement styles for a cell shell. */
export function gridItemShellStyle(placement: GridCellPlacement): React.CSSProperties {
  return {
    gridColumn: placement.gridColumn,
    gridRow: placement.gridRow,
    minWidth: 0,
    width: "100%",
  };
}

/**
 * Render a grid cell content slot — carousel-style dropzone shell in edit mode.
 *
 * @param Content - Puck slot component for cell body.
 * @param editLayoutMode - Whether Puck editor is active.
 * @returns Drop zone UI.
 */
export function renderGridItemCellContent(
  Content: GridItemContentComponent | undefined,
  editLayoutMode: boolean,
  inCarouselSlide = false,
) {
  if (typeof Content !== "function") {
    return null;
  }

  if (!editLayoutMode) {
    return <Content className="nexus-grid-item" />;
  }

  const emptyMinHeightPx = inCarouselSlide
    ? NEXUS_GRID_ITEM_CAROUSEL_EDIT_EMPTY_MIN_HEIGHT_PX
    : NEXUS_GRID_ITEM_EDIT_EMPTY_MIN_HEIGHT_PX;

  return (
    <div className="nexus-grid-item__dropzone-shell">
      <Content
        className="nexus-grid-item nexus-grid-item__dropzone"
        minEmptyHeight={emptyMinHeightPx}
        style={{
          boxSizing: "border-box",
          display: "flex",
          flex: "1 1 auto",
          flexDirection: "column",
          width: "100%",
        }}
      />
    </div>
  );
}

/** Props for {@link GridItemCellShell}. */
export interface GridItemCellShellProps {
  /** Zero-based index in the parent grid `items` array. */
  cellIndex: number;
  /** Puck slot component for cell body. */
  Content?: GridItemContentComponent;
  /** Whether Puck editor layout mode is active. */
  editLayoutMode: boolean;
  /** Whether the cell renders inside a carousel slide. */
  inCarouselSlide?: boolean;
  /** Optional drag ref for canvas cell reorder (edit mode). */
  dragRef?: React.Ref<HTMLDivElement>;
  /** Whether this cell is the active reorder drag source. */
  isDraggingCell?: boolean;
  /** Explicit CSS grid placement (row-major, array order). */
  placement: GridCellPlacement;
  /** Pointer down on empty cell chrome for canvas reorder. */
  onCellPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  /** Click empty cell chrome to select the parent grid block. */
  onCellClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Grid cell chrome — CSS grid placement + optional edit drop zone shell.
 *
 * @param props - Cell shell props.
 * @returns Grid cell wrapper.
 */
export function GridItemCellShell({
  cellIndex,
  Content,
  editLayoutMode,
  inCarouselSlide = false,
  dragRef,
  isDraggingCell,
  placement,
  onCellPointerDown,
  onCellClick,
}: GridItemCellShellProps) {
  const shellStyle = gridItemShellStyle(placement);

  if (!editLayoutMode) {
    return (
      <div
        className="nexus-grid-item-shell"
        style={shellStyle}
        data-nexus-grid-cell-index={cellIndex}
      >
        {renderGridItemCellContent(Content, false)}
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      className={cn(
        "nexus-grid-item-shell",
        "nexus-grid-item--edit",
        isDraggingCell && "nexus-grid-item--cell-dragging",
      )}
      style={shellStyle}
      data-nexus-grid-cell-index={cellIndex}
      onPointerDown={onCellPointerDown}
      onClick={onCellClick}
    >
      {renderGridItemCellContent(Content, true, inCarouselSlide)}
    </div>
  );
}
