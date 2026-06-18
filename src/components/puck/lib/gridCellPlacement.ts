/**
 * @fileoverview Explicit CSS grid placement for {@link NexusGrid} array cells.
 *
 * Puck grid cells use row-major packing instead of browser auto-placement so
 * carousel slides do not develop phantom gaps when span presets differ.
 *
 * Tests: `tests/puck/lib/gridCellPlacement.test.ts` — `npm run test:grid-cell-placement`
 *
 * @module src/components/puck/lib/gridCellPlacement
 */

/** Span input for one grid cell. */
export interface GridCellSpanInput {
  /** Column span (1–columns). */
  spanCol: number;
  /** Row span (≥ 1). */
  spanRow: number;
}

/** Resolved inline grid placement for one cell shell. */
export interface GridCellPlacement {
  /** CSS `grid-column` value (1-based line / span). */
  gridColumn: string;
  /** CSS `grid-row` value (1-based line / span). */
  gridRow: string;
}

/**
 * Clamp a numeric span to a safe integer floor.
 *
 * @param value - Raw span value.
 * @param min - Minimum allowed span.
 * @returns Clamped integer span.
 */
function clampSpan(value: number, min: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.trunc(value));
}

/**
 * Resolve explicit row-major placements for grid cells in array order.
 *
 * @param columns - CSS grid column count (e.g. 12).
 * @param cells - Cell span inputs in sidebar / array order.
 * @returns Placement per cell index.
 */
export function resolveGridCellPlacements(
  columns: number,
  cells: readonly GridCellSpanInput[],
): GridCellPlacement[] {
  const colCount = Math.max(1, clampSpan(columns, 1));
  const occupancy: boolean[][] = [];

  const isRegionFree = (
    row: number,
    col: number,
    colSpan: number,
    rowSpan: number,
  ): boolean => {
    if (col + colSpan > colCount) {
      return false;
    }

    for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
      for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
        if (occupancy[row + rowOffset]?.[col + colOffset]) {
          return false;
        }
      }
    }

    return true;
  };

  const occupyRegion = (
    row: number,
    col: number,
    colSpan: number,
    rowSpan: number,
  ): void => {
    for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
      if (!occupancy[row + rowOffset]) {
        occupancy[row + rowOffset] = [];
      }
      for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
        occupancy[row + rowOffset][col + colOffset] = true;
      }
    }
  };

  return cells.map(({ spanCol, spanRow }) => {
    const colSpan = Math.min(clampSpan(spanCol, 1), colCount);
    const rowSpan = clampSpan(spanRow, 1);

    for (let row = 0; ; row += 1) {
      for (let col = 0; col <= colCount - colSpan; col += 1) {
        if (!isRegionFree(row, col, colSpan, rowSpan)) {
          continue;
        }

        occupyRegion(row, col, colSpan, rowSpan);
        return {
          gridColumn: `${col + 1} / span ${colSpan}`,
          gridRow: `${row + 1} / span ${rowSpan}`,
        };
      }
    }
  });
}

export default resolveGridCellPlacements;
