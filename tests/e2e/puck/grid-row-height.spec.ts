/**
 * @fileoverview Browser automation — carousel grid row-height flexibility regressions.
 *
 * Registry: .ai/docs/testing.md
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:browser:puck-grid-row-height
 */

import { test, expect } from "@playwright/test";
import { gotoDesktopPuckEditor } from "../helpers/puckCanvasScrollport";
import {
  gridRowMatchesVideoHeight,
  readPuckGridRowHeightSnapshot,
} from "../helpers/puckGridRowHeight";

test.describe("Puck carousel grid row-height sync", () => {
  test.beforeEach(async ({ page }) => {
    await gotoDesktopPuckEditor(page);
  });

  test("row tracks hug video blocks instead of staying oversized", async ({ page }) => {
    const snapshot = await readPuckGridRowHeightSnapshot(page);

    if (!snapshot.gridFound) {
      test.skip(true, "No synchronized grid on this editor page — add a carousel grid fixture.");
    }

    expect(snapshot.rowTrackHeightsPx.length).toBeGreaterThan(0);

    const videoCells = snapshot.cells.filter(
      (cell) => cell.hasContent && cell.videoHeightPx !== null && cell.videoHeightPx > 0,
    );

    if (videoCells.length === 0) {
      test.skip(true, "No video cells in the synchronized grid on this editor page.");
    }

    for (const cell of videoCells) {
      const videoHeightPx = cell.videoHeightPx as number;
      const rowTrackHeightPx = snapshot.rowTrackHeightsPx[cell.rowIndex];

      expect(cell.shellHeightPx).toBeLessThanOrEqual(videoHeightPx + 24);
      expect(cell.shellHeightPx).toBeGreaterThanOrEqual(videoHeightPx - 4);

      if (rowTrackHeightPx) {
        expect(gridRowMatchesVideoHeight(rowTrackHeightPx, videoHeightPx, 32)).toBe(true);
      }
    }
  });

  test("empty grid cells do not exceed their row track height", async ({ page }) => {
    const snapshot = await readPuckGridRowHeightSnapshot(page);

    if (!snapshot.gridFound) {
      test.skip(true, "No synchronized grid on this editor page — add a carousel grid fixture.");
    }

    const emptyCells = snapshot.cells.filter((cell) => !cell.hasContent);
    if (emptyCells.length === 0) {
      test.skip(true, "No empty grid cells on this editor page.");
    }

    for (const cell of emptyCells) {
      const rowTrackHeightPx = snapshot.rowTrackHeightsPx[cell.rowIndex];
      if (!rowTrackHeightPx) {
        continue;
      }

      expect(cell.shellHeightPx).toBeLessThanOrEqual(rowTrackHeightPx + 8);
    }
  });
});
