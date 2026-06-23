/**
 * @fileoverview Playwright helpers for Puck canvas scrollport / scrollbar regressions.
 *
 * Registry: .ai/docs/testing.md
 */

import type { Page } from "@playwright/test";
import { DEFAULT_PUCK_E2E_EDIT_PATH, loginForPuckEditor } from "./puckMobileEditor";

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

/** Desktop letterbox geometry for shrink-to-fit regressions. */
export interface PuckDesktopLetterboxSnapshot {
  viewportWidth: number;
  zoom: number;
  rootLayoutWidth: number;
  rootVisualWidth: number;
  innerWidth: number;
  shellWidth: number;
  leftSidebarRight: number;
  rightSidebarLeft: number;
  rootOverLeft: boolean;
  rootOverRight: boolean;
  inlineTransform: string;
}

/** Interactive preview scrollbar gutter diagnostics. */
export interface PuckInteractivePreviewGutterSnapshot {
  previewMode: string | null;
  shellGutter: string;
  innerOverflowX: string;
  iframeHtmlGutter: string;
  iframeHtmlClientWidth: number;
  contentSlotWidth: number;
  reservedGutterPx: number;
  h1TopInIframe: number;
  h1ClippedByIframeTop: boolean;
}

/** Interactive preview canvas height vs viewport. */
export interface PuckInteractiveCanvasHeightSnapshot {
  viewportHeight: number;
  headerHeight: number;
  shellHeight: number;
  innerHeight: number;
  rootHeight: number;
  iframeHeight: number;
  shellBottomGapPx: number;
  rootInnerBottomGapPx: number;
  minExpectedShellHeight: number;
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
 * Close stray Base UI overlays (select popovers, dialogs) that block canvas controls.
 *
 * @param page - Playwright page.
 */
export async function dismissBlockingEditorOverlays(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const overlay = page.locator('[data-slot="dialog-overlay"][data-open]');
  if (await overlay.count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
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
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loginForPuckEditor(page, editPath);
  await page.waitForFunction(() => {
    const root = document.getElementById("puck-canvas-root");
    const store = (
      window as Window & {
        __PUCK_INTERNAL_DO_NOT_USE?: { appStore?: { getState: () => { zoomConfig?: { zoom?: number } } } };
      }
    ).__PUCK_INTERNAL_DO_NOT_USE?.appStore;
    const zoom = store?.getState?.()?.zoomConfig?.zoom ?? 1;
    const parsed = root?.style.transform?.match(/scale\(([\d.]+)\)/);
    const inlineScale = parsed ? Number.parseFloat(parsed[1]) : null;
    return inlineScale !== null && Math.abs(inlineScale - zoom) < 0.01;
  }, { timeout: 20_000 });
  await dismissBlockingEditorOverlays(page);
}

/**
 * Open the Puck editor and switch to interactive preview mode.
 *
 * @param page - Playwright page.
 * @param editPath - Editor route.
 */
export async function gotoInteractivePuckEditor(
  page: Page,
  editPath = process.env.PUCK_E2E_EDIT_PATH ?? "/test/edit",
): Promise<void> {
  await gotoDesktopPuckEditor(page, editPath);
  await page.evaluate(() => {
    window.__PUCK_INTERNAL_DO_NOT_USE?.appStore?.getState().setUi({
      previewMode: "interactive",
      leftSideBarVisible: true,
      rightSideBarVisible: false,
    });
  });
  await page.waitForFunction(
    () => document.documentElement.getAttribute("data-nexus-puck-preview-mode") === "interactive",
    { timeout: 10_000 },
  );
  await page.waitForTimeout(500);
}

/**
 * Measure interactive preview scrollbar gutter reservation inside the iframe.
 *
 * @param page - Playwright page on interactive preview.
 */
export async function readInteractivePreviewGutterSnapshot(
  page: Page,
): Promise<PuckInteractivePreviewGutterSnapshot> {
  return page.evaluate(() => {
    const iframe = document.getElementById("preview-frame") as HTMLIFrameElement | null;
    const iframeDoc = iframe?.contentDocument;
    const htmlEl = iframeDoc?.documentElement;
    const slot = iframeDoc?.querySelector(".global-layout-page-content-slot");
    const h1 = iframeDoc?.querySelector("h1");
    const shell = document.querySelector(
      '[class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])',
    );
    const inner = document.querySelector('[class*="PuckCanvas-inner"]');

    const htmlClientWidth = htmlEl?.clientWidth ?? 0;
    const slotWidth = slot?.getBoundingClientRect().width ?? 0;

    return {
      previewMode: document.documentElement.getAttribute("data-nexus-puck-preview-mode"),
      shellGutter: shell ? getComputedStyle(shell).scrollbarGutter : "",
      innerOverflowX: inner ? getComputedStyle(inner).overflowX : "",
      iframeHtmlGutter: htmlEl ? getComputedStyle(htmlEl).scrollbarGutter : "",
      iframeHtmlClientWidth: htmlClientWidth,
      contentSlotWidth: slotWidth,
      reservedGutterPx: Math.max(0, Math.round(htmlClientWidth - slotWidth)),
      h1TopInIframe: h1?.getBoundingClientRect().top ?? -1,
      h1ClippedByIframeTop: (h1?.getBoundingClientRect().top ?? 0) < 0,
    };
  });
}

/**
 * Measure interactive preview canvas fill relative to the viewport.
 *
 * @param page - Playwright page on interactive preview.
 */
export async function readInteractiveCanvasHeightSnapshot(
  page: Page,
): Promise<PuckInteractiveCanvasHeightSnapshot> {
  return page.evaluate(() => {
    const viewportHeight = window.innerHeight;
    const header = document.querySelector(
      '.nexus-puck-header-shell, [class*="PuckLayout-header"]',
    );
    const shell = document.querySelector(
      '[class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])',
    );
    const inner = document.querySelector('[class*="PuckCanvas-inner"]');
    const root = document.getElementById("puck-canvas-root");
    const iframe = document.getElementById("preview-frame");

    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const shellRect = shell?.getBoundingClientRect();
    const innerRect = inner?.getBoundingClientRect();
    const rootRect = root?.getBoundingClientRect();
    const iframeRect = iframe?.getBoundingClientRect();

    const shellBottomGapPx = viewportHeight - (shellRect?.bottom ?? viewportHeight);
    const rootInnerBottomGapPx = (innerRect?.bottom ?? 0) - (rootRect?.bottom ?? 0);

    return {
      viewportHeight,
      headerHeight: Math.round(headerHeight),
      shellHeight: Math.round(shellRect?.height ?? 0),
      innerHeight: Math.round(innerRect?.height ?? 0),
      rootHeight: Math.round(rootRect?.height ?? 0),
      iframeHeight: Math.round(iframeRect?.height ?? 0),
      shellBottomGapPx: Math.round(shellBottomGapPx),
      rootInnerBottomGapPx: Math.round(rootInnerBottomGapPx),
      minExpectedShellHeight: Math.round(viewportHeight - headerHeight - 4),
    };
  });
}

/**
 * Select a fixed viewport preset on desktop canvas controls (0=Phone … 3=Full-width).
 *
 * @param page - Playwright page.
 * @param presetIndex - Preset button index in the expanded tray.
 */
export async function tapDesktopViewportPreset(page: Page, presetIndex: number): Promise<void> {
  await dismissBlockingEditorOverlays(page);

  const toggle = page.locator('[class*="ViewportControls-toggleButton_"]').first();
  await toggle.waitFor({ state: "visible" });
  await toggle.click({ force: true });
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

/**
 * Read shrink-to-fit letterbox geometry on desktop with both sidebars open.
 *
 * @param page - Playwright page on a Puck edit URL.
 */
export async function readDesktopLetterboxSnapshot(
  page: Page,
): Promise<PuckDesktopLetterboxSnapshot> {
  return page.evaluate(() => {
    const store = (
      window as Window & {
        __PUCK_INTERNAL_DO_NOT_USE?: {
          appStore?: {
            getState: () => {
              zoomConfig?: { zoom?: number };
              state?: { ui?: { viewports?: { current?: { width?: number | string } } } };
            };
          };
        };
      }
    ).__PUCK_INTERNAL_DO_NOT_USE?.appStore;
    const zoom = store?.getState?.()?.zoomConfig?.zoom ?? 1;
    const viewportWidthRaw = store?.getState?.()?.state?.ui?.viewports?.current?.width;
    const viewportWidth = typeof viewportWidthRaw === "number" ? viewportWidthRaw : 1280;

    const root = document.getElementById("puck-canvas-root");
    const inner = document.querySelector('[class*="PuckCanvas-inner"]') as HTMLElement | null;
    const shell =
      (document.querySelector(
        '.Puck [class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])',
      ) as HTMLElement | null) ?? null;
    const leftSidebar = document.querySelector('.Puck [class*="Sidebar--left"]');
    const rightSidebar = document.querySelector('.Puck [class*="Sidebar--right"]');

    const rootRect = root?.getBoundingClientRect();
    const leftRect = leftSidebar?.getBoundingClientRect();
    const rightRect = rightSidebar?.getBoundingClientRect();

    return {
      viewportWidth,
      zoom,
      rootLayoutWidth: root?.offsetWidth ?? 0,
      rootVisualWidth: rootRect?.width ?? 0,
      innerWidth: inner?.clientWidth ?? 0,
      shellWidth: shell?.clientWidth ?? 0,
      leftSidebarRight: leftRect?.right ?? 0,
      rightSidebarLeft: rightRect?.left ?? window.innerWidth,
      rootOverLeft: (rootRect?.left ?? 0) < (leftRect?.right ?? 0) - 2,
      rootOverRight: (rootRect?.right ?? 0) > (rightRect?.left ?? window.innerWidth) + 2,
      inlineTransform: root?.style.transform ?? "",
    };
  });
}
