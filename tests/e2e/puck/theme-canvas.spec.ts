/**
 * @fileoverview Browser automation — Puck editor theme toggle + canvas backdrop regressions.
 *
 * Registry: .ai/docs/testing.md
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:run -- browser:puck-theme-canvas
 */

import { test, expect } from "@playwright/test";
import {
  gotoDesktopPuckEditorForThemeCanvas,
  isTransparentCssColor,
  readCanvasShellGridLuminance,
  readPuckThemeCanvasSnapshot,
  togglePuckEditorTheme,
} from "../helpers/puckThemeCanvas";

test.describe("Puck editor theme canvas", () => {
  test.describe.configure({ timeout: 120_000 });

  test("theme toggle does not throw and keeps canvas layers transparent", async ({ page }) => {
    const pageErrors = await gotoDesktopPuckEditorForThemeCanvas(
      page,
      process.env.PUCK_E2E_EDIT_PATH ?? "/test1/edit",
    );
    const initial = await readPuckThemeCanvasSnapshot(page, pageErrors);
    expect(initial.hasGlobalGrid).toBe(true);
    expect(initial.hasCanvasEditGrid).toBe(false);
    expect(initial.gridInstanceCount).toBe(1);
    expect(initial.gridPortaledInCanvasShell).toBe(true);
    const initialGrid = await readCanvasShellGridLuminance(page);
    expect(initialGrid.luminance).not.toBeNull();
    expect(isTransparentCssColor(initial.canvasRootBackground)).toBe(true);

    await togglePuckEditorTheme(page);

    const after = await readPuckThemeCanvasSnapshot(page, pageErrors);
    expect(after.hasGlobalGrid).toBe(true);
    expect(after.hasCanvasEditGrid).toBe(false);
    expect(after.gridInstanceCount).toBe(1);
    expect(after.gridPortaledInCanvasShell).toBe(true);
    expect(isTransparentCssColor(after.canvasRootBackground)).toBe(true);
    expect(isTransparentCssColor(after.previewFrameBackground)).toBe(true);
    expect(after.previewUsesIframe).toBe(false);

    const transparencyCrash = pageErrors.some((message) =>
      message.includes("Cannot read properties of null (reading 'style')"),
    );
    expect(transparencyCrash).toBe(false);
    expect(pageErrors).toEqual([]);
  });

  test("global layout grid tracks theme through transparent canvas", async ({ page }) => {
    const pageErrors = await gotoDesktopPuckEditorForThemeCanvas(
      page,
      process.env.PUCK_E2E_EDIT_PATH ?? "/test1/edit",
    );

    let previous: { theme: string | null; luminance: number | null } | null = null;

    for (let index = 0; index < 4; index += 1) {
      const snapshot = await readPuckThemeCanvasSnapshot(page, pageErrors);
      const grid = await readCanvasShellGridLuminance(page);

      expect(snapshot.gridInstanceCount).toBe(1);
      expect(snapshot.hasCanvasEditGrid).toBe(false);
      expect(snapshot.gridPortaledInCanvasShell).toBe(true);
      expect(grid.patternBlue).not.toBeNull();
      expect(isTransparentCssColor(snapshot.canvasRootBackground)).toBe(true);

      await page.evaluate(() => {
        const layoutGrid = document.getElementById("nexus-bg");
        const layoutSharp = document.getElementById("nexus-bg-canvas-sharp");
        const editGrid = document.getElementById("nexus-canvas-edit-grid");
        const previewFrame = document.getElementById("preview-frame");
        if (!layoutGrid || !layoutSharp) {
          throw new Error("Layout grid missing");
        }
        if (editGrid) {
          throw new Error("Canvas edit grid must not mount — single layout grid only");
        }
        if (previewFrame instanceof HTMLIFrameElement) {
          throw new Error("Puck preview must render inline (iframe.enabled=false)");
        }
        if (layoutSharp.width < 1 || layoutSharp.height < 1) {
          throw new Error("Layout grid engine is not painting");
        }
      });

      previous = { theme: grid.theme, luminance: grid.luminance };

      await togglePuckEditorTheme(page);
      await page.waitForTimeout(250);

      const postToggleSnapshot = await readPuckThemeCanvasSnapshot(page, pageErrors);
      expect(isTransparentCssColor(postToggleSnapshot.canvasRootBackground)).toBe(true);
      expect(isTransparentCssColor(postToggleSnapshot.previewFrameBackground)).toBe(true);
    }

    expect(pageErrors).toEqual([]);
  });
});
