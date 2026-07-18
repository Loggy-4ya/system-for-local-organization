/**
 * @fileoverview Playwright helpers for Puck editor theme + canvas backdrop regressions.
 *
 * Registry: .ai/docs/testing.md
 */

import type { Page } from "@playwright/test";
import { gotoDesktopPuckEditor } from "./puckCanvasScrollport";

/** Live DOM snapshot of editor theme + canvas transparency state. */
export interface PuckThemeCanvasSnapshot {
  theme: string | null;
  hasGlobalGrid: boolean;
  hasCanvasEditGrid: boolean;
  gridInstanceCount: number;
  gridPortaledInCanvasShell: boolean;
  hasPuckGridHost: boolean;
  canvasRootBackground: string;
  canvasRootInlineBackground: string;
  previewFrameBackground: string;
  previewUsesIframe: boolean;
  pageErrorCount: number;
}

/**
 * Read whether a CSS color resolves to transparent.
 *
 * @param color - Computed `background-color` string.
 */
export function isTransparentCssColor(color: string): boolean {
  return (
    color === "transparent" ||
    color === "rgba(0, 0, 0, 0)" ||
    color.endsWith(", 0)") ||
    color.endsWith(",0)")
  );
}

/**
 * Open the desktop Puck editor and attach a pageerror collector.
 *
 * @param page - Playwright page.
 * @param editPath - Editor route.
 * @returns Mutable error list populated by `page.on("pageerror")`.
 */
export async function gotoDesktopPuckEditorForThemeCanvas(
  page: Page,
  editPath = process.env.PUCK_E2E_EDIT_PATH ?? "/test1/edit",
): Promise<string[]> {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await gotoDesktopPuckEditor(page, editPath);
  await page.waitForFunction(() => {
    const sharp = document.getElementById(
      "nexus-bg-canvas-sharp",
    ) as HTMLCanvasElement | null;
    if (!sharp || sharp.width < 2 || sharp.height < 2) return false;
    const ctx = sharp.getContext("2d");
    if (!ctx) return false;
    for (let y = 0; y < sharp.height; y += 16) {
      for (let x = 0; x < sharp.width; x += 16) {
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
        if (a > 0 && b > r + 12) return true;
      }
    }
    return false;
  }, { timeout: 30_000 });

  return pageErrors;
}

/**
 * Click the Puck header theme toggle.
 *
 * @param page - Playwright page.
 */
export async function togglePuckEditorTheme(page: Page): Promise<void> {
  const toggle = page.getByRole("switch", { name: /Switch to .* theme/i });
  await toggle.waitFor({ state: "visible", timeout: 15_000 });
  const beforeChecked = await toggle.getAttribute("aria-checked");
  await toggle.click({ force: true });
  await page.waitForFunction((prev) => {
    const el = document.querySelector('[role="switch"][aria-label*="Switch to"]');
    return el?.getAttribute("aria-checked") !== prev;
  }, beforeChecked, { timeout: 15_000 });
  await page.waitForTimeout(400);
}

/**
 * Sample the layout grid at the Puck canvas shell centre.
 *
 * @param page - Playwright page on a Puck edit URL.
 */
export async function readCanvasShellGridLuminance(page: Page): Promise<{
  theme: string | null;
  luminance: number | null;
  patternBlue: number | null;
  rgb: string | null;
}> {
  return page.evaluate(() => {
    const theme = document.documentElement.getAttribute("data-theme");
    const grid = document.getElementById("nexus-bg");
    const canvas = document.getElementById("nexus-bg-canvas-sharp") as HTMLCanvasElement | null;
    const shell =
      (document.querySelector(
        '.Puck [class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])',
      ) as HTMLElement | null) ?? null;
    const sampleTarget =
      (document.getElementById("preview-frame") as HTMLElement | null) ??
      (document.getElementById("puck-canvas-root") as HTMLElement | null) ??
      (document.querySelector('[class*="PuckCanvas-root"]') as HTMLElement | null) ??
      shell;

    if (!grid || !canvas || !sampleTarget || canvas.width < 2 || canvas.height < 2) {
      return { theme, luminance: null, patternBlue: null, rgb: null };
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return { theme, luminance: null, patternBlue: null, rgb: null };

    const targetRect = sampleTarget.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const sampleX = Math.floor(
      ((targetRect.left + targetRect.width / 2 - gridRect.left) / gridRect.width) *
        canvas.width,
    );
    const sampleY = Math.floor(
      ((targetRect.top + targetRect.height / 2 - gridRect.top) / gridRect.height) *
        canvas.height,
    );

    let bestLum = 0;
    let bestBlue = 0;
    let bestRgb: [number, number, number] = [0, 0, 0];

    for (let dy = -32; dy <= 32; dy += 8) {
      for (let dx = -32; dx <= 32; dx += 8) {
        const x = Math.min(Math.max(sampleX + dx, 0), canvas.width - 1);
        const y = Math.min(Math.max(sampleY + dy, 0), canvas.height - 1);
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
        if (a < 1) continue;
        const lum = (r + g + b) / 3;
        if (b > r + 12 && b > bestBlue) {
          bestBlue = b;
          bestRgb = [r, g, b];
        }
        if (lum > bestLum) {
          bestLum = lum;
        }
      }
    }

    const [r, g, b] = bestRgb;
    return {
      theme,
      luminance: bestLum,
      patternBlue: bestBlue > 0 ? bestBlue : null,
      rgb: bestBlue > 0 ? `rgb(${r}, ${g}, ${b})` : null,
    };
  });
}

/**
 * Read theme + canvas transparency markers from the live editor DOM.
 *
 * @param page - Playwright page.
 * @param pageErrors - Collected runtime errors from `page.on("pageerror")`.
 */
export async function readPuckThemeCanvasSnapshot(
  page: Page,
  pageErrors: string[],
): Promise<PuckThemeCanvasSnapshot> {
  const dom = await page.evaluate(() => {
    const canvasRoot =
      (document.getElementById("puck-canvas-root") as HTMLElement | null) ??
      (document.querySelector('[class*="PuckCanvas-root"]') as HTMLElement | null);
    const previewFrame = document.getElementById("preview-frame");

    const parentGridCount = document.querySelectorAll("#nexus-bg").length;
    const canvasEditGridCount = document.querySelectorAll("#nexus-canvas-edit-grid").length;

    return {
      theme: document.documentElement.getAttribute("data-theme"),
      hasGlobalGrid: parentGridCount > 0,
      hasCanvasEditGrid: canvasEditGridCount > 0,
      gridInstanceCount: parentGridCount + canvasEditGridCount,
      gridPortaledInCanvasShell:
        parentGridCount === 1 &&
        canvasEditGridCount === 0 &&
        !document.getElementById("nexus-puck-grid-host"),
      hasPuckGridHost: Boolean(document.getElementById("nexus-puck-grid-host")),
      canvasRootBackground: canvasRoot ? getComputedStyle(canvasRoot).backgroundColor : "",
      canvasRootInlineBackground: canvasRoot?.style.backgroundColor ?? "",
      previewFrameBackground: previewFrame ? getComputedStyle(previewFrame).backgroundColor : "",
      previewUsesIframe: previewFrame instanceof HTMLIFrameElement,
    };
  });

  return {
    ...dom,
    pageErrorCount: pageErrors.length,
  };
}
