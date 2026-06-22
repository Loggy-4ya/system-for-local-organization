/**
 * @fileoverview Playwright helpers for Puck canvas scrollport / scrollbar regressions.
 *
 * Registry: .ai/docs/testing.md
 */

import type { Page } from "@playwright/test";
import { DEFAULT_PUCK_E2E_EDIT_PATH, gotoPuckEditor } from "./puckMobileEditor";

/** Live DOM snapshot of editor scroll ownership. */
export interface PuckCanvasScrollSnapshot {
  documentScrollable: boolean;
  bodyScrollable: boolean;
  canvasShellScrollable: boolean;
  iframeScrollable: boolean;
  innerScrollableY: boolean;
  verticalOverflowOwnerCount: number;
  canvasShellClientHeight: number;
  canvasShellScrollHeight: number;
  previewSlotBottom: number;
  canvasShellBottom: number;
  rootScaledHeight: number;
}

/**
 * Whether an element currently exposes vertical overflow scrolling.
 *
 * @param element - Candidate scrollport.
 */
function isVerticallyScrollable(element: Element | null | undefined): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const overflowY = getComputedStyle(element).overflowY;
  if (overflowY !== "auto" && overflowY !== "scroll") return false;
  return element.scrollHeight > element.clientHeight + 1;
}

/**
 * Open the Puck editor on desktop width and wait for zoom/content-height sync.
 *
 * @param page - Playwright page.
 * @param editPath - Editor route.
 */
export async function gotoDesktopPuckEditor(
  page: Page,
  editPath = DEFAULT_PUCK_E2E_EDIT_PATH,
): Promise<void> {
  await page.setViewportSize({ width: 1360, height: 820 });
  await gotoPuckEditor(page, editPath);
  await page.waitForTimeout(1200);
}

/**
 * Select a fixed viewport preset on desktop canvas controls (0=Phone … 3=Full-width).
 *
 * @param page - Playwright page.
 * @param presetIndex - Preset button index in the expanded tray.
 */
export async function tapDesktopViewportPreset(page: Page, presetIndex: number): Promise<void> {
  const toggle = page.locator('[class*="ViewportControls-toggleButton_"]').first();
  await toggle.waitFor({ state: "visible" });
  await toggle.click();
  await page.waitForTimeout(300);

  const tray = page.locator('[class*="ViewportControls--isExpanded"] [class*="ViewportButton"]');
  await tray.nth(presetIndex).click();
  await page.waitForTimeout(900);
}

/**
 * Read scrollport ownership and preview clipping markers from the live DOM.
 *
 * @param page - Playwright page.
 */
export async function readCanvasScrollSnapshot(page: Page): Promise<PuckCanvasScrollSnapshot> {
  return page.evaluate(() => {
    const isVerticallyScrollable = (element: Element | null | undefined): boolean => {
      if (!(element instanceof HTMLElement)) return false;
      const overflowY = getComputedStyle(element).overflowY;
      if (overflowY !== "auto" && overflowY !== "scroll") return false;
      return element.scrollHeight > element.clientHeight + 1;
    };

    const shell =
      (document.querySelector(
        '.Puck [class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])',
      ) as HTMLElement | null) ??
      (document.querySelector('[class*="PuckCanvas--fullScreen"]') as HTMLElement | null);
    const inner = document.querySelector('[class*="PuckCanvas-inner"]') as HTMLElement | null;
    const iframe = document.getElementById("preview-frame") as HTMLIFrameElement | null;
    const slot = iframe?.contentDocument?.querySelector(".global-layout-page-content-slot");
    const root = document.getElementById("puck-canvas-root");

    const overflowOwners = Array.from(
      document.querySelectorAll("html, body, .Puck, .Puck *"),
    ).filter((element) => isVerticallyScrollable(element));

    return {
      documentScrollable: isVerticallyScrollable(document.documentElement),
      bodyScrollable: isVerticallyScrollable(document.body),
      canvasShellScrollable: isVerticallyScrollable(shell),
      iframeScrollable: isVerticallyScrollable(iframe),
      innerScrollableY: isVerticallyScrollable(inner),
      verticalOverflowOwnerCount: overflowOwners.length,
      canvasShellClientHeight: shell?.clientHeight ?? 0,
      canvasShellScrollHeight: shell?.scrollHeight ?? 0,
      previewSlotBottom: slot?.getBoundingClientRect().bottom ?? 0,
      canvasShellBottom: shell?.getBoundingClientRect().bottom ?? 0,
      rootScaledHeight: root?.getBoundingClientRect().height ?? 0,
    };
  });
}

/**
 * Scroll the canvas shell to the bottom and return updated clipping markers.
 *
 * @param page - Playwright page.
 */
export async function scrollCanvasShellToBottom(page: Page): Promise<PuckCanvasScrollSnapshot> {
  await page.evaluate(() => {
    const shell =
      (document.querySelector(
        '.Puck [class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])',
      ) as HTMLElement | null) ??
      (document.querySelector('[class*="PuckCanvas--fullScreen"]') as HTMLElement | null);
    if (!shell) return;
    shell.scrollTop = shell.scrollHeight;
  });
  await page.waitForTimeout(200);
  return readCanvasScrollSnapshot(page);
}
