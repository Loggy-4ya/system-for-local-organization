/**
 * @fileoverview Playwright helpers for carousel grid row-height sync regressions.
 *
 * Registry: .ai/docs/testing.md
 */

import type { Page } from "@playwright/test";

/** Per-cell geometry inside a synchronized Nexus grid. */
export interface PuckGridCellSnapshot {
  /** Cell index from `data-nexus-grid-cell-index`. */
  index: number;
  /** Zero-based row track index from inline `grid-row`. */
  rowIndex: number;
  /** Shell client height in px. */
  shellHeightPx: number;
  /** Video block height in px when present. */
  videoHeightPx: number | null;
  /** Whether the cell drop zone has nested Puck content. */
  hasContent: boolean;
}

/** Grid row-height sync snapshot from the preview iframe. */
export interface PuckGridRowHeightSnapshot {
  /** Whether a row-sync grid was found in the preview document. */
  gridFound: boolean;
  /** Parsed explicit row track heights in px. */
  rowTrackHeightsPx: number[];
  /** Measured cells in index order. */
  cells: PuckGridCellSnapshot[];
}

/**
 * Read synchronized grid row and cell geometry from the Puck preview iframe.
 *
 * @param page - Playwright page on a Puck edit URL.
 */
export async function readPuckGridRowHeightSnapshot(page: Page): Promise<PuckGridRowHeightSnapshot> {
  const frame = page.frameLocator("#preview-frame");

  return frame.locator("body").evaluate(() => {
    const grid = document.querySelector<HTMLElement>(".nexus-grid.nexus-grid--row-height-sync");
    if (!grid) {
      return {
        gridFound: false,
        rowTrackHeightsPx: [],
        cells: [],
      };
    }

    const templateRows =
      grid.style.gridTemplateRows.trim() ||
      getComputedStyle(grid).gridTemplateRows.trim();

    const rowTrackHeightsPx = templateRows
      .split(/\s+/)
      .map((token) => Number.parseFloat(token))
      .filter((value) => Number.isFinite(value) && value > 0);

    const cells = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-nexus-grid-cell-index]"),
    )
      .map((shell) => {
        const index = Number.parseInt(shell.getAttribute("data-nexus-grid-cell-index") ?? "", 10);
        const dropzone = shell.querySelector<HTMLElement>("[data-puck-dropzone]");
        const video = shell.querySelector<HTMLElement>(".nexus-video");
        const hasContent = Boolean(dropzone?.className.includes("DropZone--hasChildren"));
        const gridRow = shell.style.gridRow || getComputedStyle(shell).gridRow;
        const rowStartMatch = gridRow.match(/^(\d+)/);
        const rowIndex = rowStartMatch ? Number.parseInt(rowStartMatch[1], 10) - 1 : 0;

        return {
          index: Number.isFinite(index) ? index : -1,
          rowIndex,
          shellHeightPx: Math.ceil(shell.getBoundingClientRect().height),
          videoHeightPx: video ? Math.ceil(video.getBoundingClientRect().height) : null,
          hasContent,
        };
      })
      .sort((left, right) => left.index - right.index);

    return {
      gridFound: true,
      rowTrackHeightsPx,
      cells,
    };
  });
}

/**
 * Whether a grid row track is within tolerance of its tallest video cell.
 *
 * @param rowTrackHeightPx - Explicit CSS grid row track height.
 * @param videoHeightPx - Measured `.nexus-video` height in the same row.
 * @param tolerancePx - Allowed slack for borders/padding.
 */
export function gridRowMatchesVideoHeight(
  rowTrackHeightPx: number,
  videoHeightPx: number,
  tolerancePx = 20,
): boolean {
  return Math.abs(rowTrackHeightPx - videoHeightPx) <= tolerancePx;
}
