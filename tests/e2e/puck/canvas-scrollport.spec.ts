/**
 * @fileoverview Browser automation — Puck canvas scrollport / duplicate scrollbar regressions.
 *
 * Registry: .ai/docs/testing.md
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:browser:puck-canvas-scrollport
 */

import { test, expect } from "@playwright/test";
import {
  gotoDesktopPuckEditor,
  gotoInteractivePuckEditor,
  readCanvasScrollSnapshot,
  readDesktopLetterboxSnapshot,
  readInteractiveCanvasHeightSnapshot,
  readInteractivePreviewGutterSnapshot,
  scrollCanvasShellToBottom,
  tapDesktopViewportPreset,
} from "../helpers/puckCanvasScrollport";

test.describe("Puck desktop canvas scrollport", () => {
  test.beforeEach(async ({ page }) => {
    await gotoDesktopPuckEditor(page, process.env.PUCK_E2E_EDIT_PATH ?? "/test/edit");
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

  test("desktop 1280 preset shrinks to fit between open sidebars on Full HD", async ({ page }) => {
    const snapshot = await readDesktopLetterboxSnapshot(page);

    expect(snapshot.viewportWidth).toBe(1280);
    expect(snapshot.zoom).toBeLessThan(1);
    expect(snapshot.inlineTransform).toContain("scale(");
    expect(snapshot.rootVisualWidth).toBeLessThanOrEqual(snapshot.innerWidth + 2);
    expect(snapshot.rootOverLeft).toBe(false);
    expect(snapshot.rootOverRight).toBe(false);
  });
});

test.describe("Puck interactive preview scrollport", () => {
  test.beforeEach(async ({ page }) => {
    await gotoInteractivePuckEditor(page, process.env.PUCK_E2E_EDIT_PATH ?? "/test/edit");
  });

  test("does not reserve an empty scrollbar gutter stripe inside the preview", async ({ page }) => {
    const snapshot = await readInteractivePreviewGutterSnapshot(page);

    expect(snapshot.previewMode).toBe("interactive");
    expect(snapshot.shellGutter).not.toBe("stable");
    expect(snapshot.iframeHtmlGutter).not.toBe("stable");
    expect(snapshot.innerOverflowX).toBe("hidden");
    expect(snapshot.reservedGutterPx).toBeLessThanOrEqual(2);
    expect(snapshot.h1ClippedByIframeTop).toBe(false);
  });

  test("canvas shell fills the viewport below the header", async ({ page }) => {
    const snapshot = await readInteractiveCanvasHeightSnapshot(page);

    expect(snapshot.shellBottomGapPx).toBeLessThanOrEqual(2);
    expect(snapshot.rootInnerBottomGapPx).toBeLessThanOrEqual(2);
    expect(snapshot.shellHeight).toBeGreaterThanOrEqual(snapshot.minExpectedShellHeight - 4);
    expect(snapshot.iframeHeight).toBeGreaterThanOrEqual(snapshot.rootHeight - 4);
    expect(snapshot.rootHeight).toBeGreaterThanOrEqual(snapshot.innerHeight - 4);
  });
});
