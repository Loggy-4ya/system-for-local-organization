/**
 * @fileoverview Browser automation — Puck canvas scrollport / duplicate scrollbar regressions.
 *
 * Registry: .ai/docs/testing.md
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:browser:puck-canvas-scrollport
 */

import { test, expect } from "@playwright/test";
import {
  gotoDesktopPuckEditor,
  readCanvasScrollSnapshot,
  scrollCanvasShellToBottom,
  tapDesktopViewportPreset,
} from "../helpers/puckCanvasScrollport";

test.describe("Puck desktop canvas scrollport", () => {
  test.beforeEach(async ({ page }) => {
    await gotoDesktopPuckEditor(page);
  });

  test("does not expose duplicate document + canvas vertical scrollbars", async ({ page }) => {
    await tapDesktopViewportPreset(page, 0);

    const snapshot = await readCanvasScrollSnapshot(page);

    expect(snapshot.documentScrollable).toBe(false);
    expect(snapshot.bodyScrollable).toBe(false);
    expect(snapshot.iframeScrollable).toBe(false);
    expect(snapshot.innerScrollableY).toBe(false);
    expect(snapshot.documentScrollable || snapshot.bodyScrollable).toBe(false);
  });

  test("letterboxed phone preset keeps preview reachable via canvas shell scroll", async ({
    page,
  }) => {
    await tapDesktopViewportPreset(page, 0);

    const before = await readCanvasScrollSnapshot(page);
    expect(before.rootScaledHeight).toBeGreaterThan(200);

    if (before.canvasShellScrollHeight <= before.canvasShellClientHeight + 1) {
      test.skip(true, "Preview fits the shell at this viewport — no letterbox scroll needed.");
    }

    const afterScroll = await scrollCanvasShellToBottom(page);

    expect(afterScroll.canvasShellScrollable).toBe(true);
    expect(afterScroll.previewSlotBottom).toBeLessThanOrEqual(afterScroll.canvasShellBottom + 4);
  });

  test("rootHeight stays stable after canvas shell scroll (no snap-back)", async ({ page }) => {
    await tapDesktopViewportPreset(page, 0);

    const before = await readCanvasScrollSnapshot(page);
    if (before.canvasShellScrollHeight <= before.canvasShellClientHeight + 1) {
      test.skip(true, "Preview fits the shell at this viewport — no letterbox scroll needed.");
    }

    await scrollCanvasShellToBottom(page);
    await page.waitForTimeout(400);

    const after = await readCanvasScrollSnapshot(page);
    expect(Math.abs(after.rootScaledHeight - before.rootScaledHeight)).toBeLessThanOrEqual(2);
  });
});
