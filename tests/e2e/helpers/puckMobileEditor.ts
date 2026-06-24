/**
 * @fileoverview Playwright helpers for compact Puck editor browser automation.
 *
 * Registry: .ai/docs/testing.md
 */

import type { Page } from "@playwright/test";

/** Bottom-rail plugin tabs on compact editor chrome. */
export type PuckMobilePanelTab = "Blocks" | "Outline" | "Fields";

/** Layout snapshot for the slide-up plugin sidebar. */
export interface PuckMobileSidebarSnapshot {
  display: string;
  visibility: string;
  heightPx: number;
  panelHeightVar: string;
  leftSideBarVisible: boolean;
  narrowEditorAttr: boolean;
}

/** DOM markers expected when a tab's panel body is reachable. */
export interface PuckMobilePanelTabSnapshot extends PuckMobileSidebarSnapshot {
  tab: PuckMobilePanelTab;
  visibleTabHeightPx: number;
  hasBlocksPlugin: boolean;
  hasOutlinePlugin: boolean;
  hasFieldsPlugin: boolean;
  outlineTextLength: number;
}

/** Grid backdrop snapshot for narrow editor scrollport regressions. */
export interface PuckMobileGridBackdropSnapshot {
  gridHeight: number;
  shellHeight: number;
  sidebarHeight: number | null;
  hasBackdropAttr: boolean;
  parentIsLayoutInner: boolean;
  parentIsFullScreen: boolean;
}

/**
 * Read scrollport grid backdrop geometry on narrow editor routes.
 *
 * @param page - Playwright page on a Puck edit URL.
 */
export async function readMobileGridBackdropSnapshot(
  page: Page,
): Promise<PuckMobileGridBackdropSnapshot> {
  return page.evaluate(() => {
    const shell = document.querySelector('[class*="PuckCanvas--fullScreen"]');
    const grid = document.getElementById("nexus-editor-scrollport-grid");
    const sidebar = document.querySelector('.Puck [class*="Sidebar--left"]');
    const parent = grid?.parentElement ?? null;

    return {
      gridHeight: grid?.getBoundingClientRect().height ?? 0,
      shellHeight: shell?.clientHeight ?? 0,
      sidebarHeight: sidebar?.getBoundingClientRect().height ?? null,
      hasBackdropAttr: grid?.hasAttribute("data-nexus-scrollport-grid-backdrop") ?? false,
      parentIsLayoutInner: parent?.className.includes("PuckLayout-inner") ?? false,
      parentIsFullScreen: parent?.className.includes("fullScreen") ?? false,
    };
  });
}

/** Geometry snapshot for compact editor chrome (nav/canvas/panel placement). */
export interface PuckMobileLayoutGeometry {
  viewportHeight: number;
  puckHeight: number;
  layoutInnerHeight: number;
  headerBottom: number;
  navTop: number;
  navBottom: number;
  canvasTop: number;
  canvasBottom: number;
  canvasHeight: number;
  sidebarTop: number | null;
  sidebarBottom: number | null;
  sidebarHeight: number | null;
  gridTemplateRows: string;
  navGridArea: string;
  canvasGridArea: string;
}

/** Default Puck editor URL path (override with `PUCK_E2E_EDIT_PATH`). */
export const DEFAULT_PUCK_E2E_EDIT_PATH =
  process.env.PUCK_E2E_EDIT_PATH ?? "/test1/edit";

/** Admin seed credentials for browser automation (override via env). */
const PUCK_E2E_LOGIN = process.env.PUCK_E2E_LOGIN ?? "admin";
const PUCK_E2E_PASSWORD = process.env.PUCK_E2E_PASSWORD ?? "your_secure_password_here";

/**
 * Sign in with seeded admin credentials when the editor route requires auth.
 *
 * @param page - Playwright page.
 * @param callbackPath - Post-login destination (typically an `/…/edit` path).
 */
export async function loginForPuckEditor(
  page: Page,
  callbackPath = DEFAULT_PUCK_E2E_EDIT_PATH,
): Promise<void> {
  const callback = resolvePuckEditorPath(callbackPath);
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callback)}`, {
    waitUntil: "domcontentloaded",
  });

  const loginInput = page.locator("#login-handle, input[name='login']").first();
  const passwordInput = page.locator("#login-password, input[name='password']").first();
  await loginInput.waitFor({ state: "visible", timeout: 30_000 });
  await loginInput.fill(PUCK_E2E_LOGIN);
  await passwordInput.fill(PUCK_E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`**${callback}**`, { timeout: 120_000 });
  await page.locator(".Puck").waitFor({ state: "visible", timeout: 120_000 });
}

/**
 * Expand the mobile viewport preset pill and tap a preset by index (0=Phone, 1=Tablet, 2=Desktop, 3=Full-width).
 *
 * @param page - Playwright page.
 * @param presetIndex - Zero-based index in the expanded viewport tray.
 */
export async function tapMobileViewportPreset(page: Page, presetIndex: number): Promise<void> {
  const toggle = page.locator('[class*="ViewportControls-toggleButton_"]').first();
  await toggle.waitFor({ state: "visible" });
  await toggle.tap().catch(async () => toggle.click());
  await page.waitForTimeout(400);

  const buttons = page.locator(
    '[class*="ViewportControls--fullScreen"][class*="isExpanded"] [class*="ViewportButton"]',
  );
  await buttons.nth(presetIndex).tap().catch(async () => buttons.nth(presetIndex).click());
  await page.waitForTimeout(800);
}

/**
 * Resolve the editor URL for browser automation.
 *
 * @param editPath - Absolute path such as `/news/edit`.
 * @returns Path passed to Playwright `page.goto`.
 */
export function resolvePuckEditorPath(editPath = DEFAULT_PUCK_E2E_EDIT_PATH): string {
  return editPath.startsWith("/") ? editPath : `/${editPath}`;
}

/**
 * Open a Puck CMS page in editor mode and wait for the shell to mount.
 *
 * @param page - Playwright page.
 * @param editPath - Editor route (default from env).
 */
export async function gotoPuckEditor(
  page: Page,
  editPath = DEFAULT_PUCK_E2E_EDIT_PATH,
): Promise<void> {
  await page.goto(resolvePuckEditorPath(editPath), { waitUntil: "domcontentloaded" });
  await page.locator(".Puck").waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(500);
}

/**
 * Tap a bottom-rail plugin tab (Blocks / Outline / Fields).
 *
 * @param page - Playwright page.
 * @param tab - Tab label as shown in the nav rail.
 */
export async function tapMobilePanelTab(page: Page, tab: PuckMobilePanelTab): Promise<void> {
  const navItem = page.locator(".Puck li").filter({ hasText: tab }).first();
  await navItem.waitFor({ state: "visible" });
  await navItem.tap().catch(async () => navItem.click());
  await page.waitForTimeout(600);
}

/**
 * Read compact sidebar layout flags from the live DOM.
 *
 * @param page - Playwright page.
 * @returns Sidebar visibility and height snapshot.
 */
export async function readMobileSidebarSnapshot(page: Page): Promise<PuckMobileSidebarSnapshot> {
  return page.evaluate(() => {
    const html = document.documentElement;
    const sidebar = document.querySelector('.Puck [class*="Sidebar--left"]');
    const layout = document.querySelector('[class*="PuckLayout-inner"]');
    const cs = sidebar ? getComputedStyle(sidebar) : null;

    return {
      display: cs?.display ?? "",
      visibility: cs?.visibility ?? "",
      heightPx: sidebar?.getBoundingClientRect().height ?? 0,
      panelHeightVar: layout
        ? getComputedStyle(layout).getPropertyValue("--nexus-mobile-panel-height").trim()
        : "",
      leftSideBarVisible:
        document.querySelector('[class*="PuckLayout--leftSideBarVisible"]') !== null,
      narrowEditorAttr: html.hasAttribute("data-nexus-narrow-editor"),
    };
  });
}

/**
 * Open a tab and capture sidebar + plugin content markers.
 *
 * @param page - Playwright page.
 * @param tab - Bottom-rail tab to activate.
 * @returns Combined layout and content snapshot.
 */
export async function openTabAndSnapshot(
  page: Page,
  tab: PuckMobilePanelTab,
): Promise<PuckMobilePanelTabSnapshot> {
  await tapMobilePanelTab(page, tab);

  const snapshot = await page.evaluate((tabName) => {
    const html = document.documentElement;
    const sidebar = document.querySelector('.Puck [class*="Sidebar--left"]');
    const visibleTab = document.querySelector('.Puck [class*="PuckPluginTab--visible"]');
    const outline = document.querySelector(".nexus-outline-plugin");
    const layout = document.querySelector('[class*="PuckLayout-inner"]');
    const sidebarCs = sidebar ? getComputedStyle(sidebar) : null;

    return {
      tab: tabName as PuckMobilePanelTab,
      display: sidebarCs?.display ?? "",
      visibility: sidebarCs?.visibility ?? "",
      heightPx: sidebar?.getBoundingClientRect().height ?? 0,
      visibleTabHeightPx: visibleTab?.getBoundingClientRect().height ?? 0,
      panelHeightVar: layout
        ? getComputedStyle(layout).getPropertyValue("--nexus-mobile-panel-height").trim()
        : "",
      leftSideBarVisible:
        document.querySelector('[class*="PuckLayout--leftSideBarVisible"]') !== null,
      narrowEditorAttr: html.hasAttribute("data-nexus-narrow-editor"),
      hasBlocksPlugin: document.querySelector('.Puck [class*="BlocksPlugin"]') !== null,
      hasOutlinePlugin: outline !== null,
      hasFieldsPlugin: document.querySelector('.Puck [class*="FieldsPlugin"]') !== null,
      outlineTextLength: outline?.textContent?.trim().length ?? 0,
    };
  }, tab);

  return snapshot;
}

/**
 * Capture compact editor layout geometry for nav/canvas/panel placement regressions.
 *
 * @param page - Playwright page.
 * @returns Measured positions and grid metadata.
 */
export async function readMobileLayoutGeometry(page: Page): Promise<PuckMobileLayoutGeometry> {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const puck = document.querySelector(".Puck");
    const layoutInner = document.querySelector('[class*="PuckLayout-inner"]');
    const header = document.querySelector('[class*="PuckLayout-header"]');
    const nav = document.querySelector('[class*="PuckLayout-nav"]');
    const canvas = document.querySelector('[class*="PuckCanvas--fullScreen"]');
    const sidebar = document.querySelector('.Puck [class*="Sidebar--left"]');

    const hr = header?.getBoundingClientRect();
    const nr = nav?.getBoundingClientRect();
    const cr = canvas?.getBoundingClientRect();
    const sr = sidebar?.getBoundingClientRect();
    const layoutCs = layoutInner ? getComputedStyle(layoutInner) : null;

    return {
      viewportHeight: vh,
      puckHeight: puck?.getBoundingClientRect().height ?? 0,
      layoutInnerHeight: layoutInner?.getBoundingClientRect().height ?? 0,
      headerBottom: hr?.bottom ?? 0,
      navTop: nr?.top ?? 0,
      navBottom: nr?.bottom ?? 0,
      canvasTop: cr?.top ?? 0,
      canvasBottom: cr?.bottom ?? 0,
      canvasHeight: cr?.height ?? 0,
      sidebarTop: sr?.top ?? null,
      sidebarBottom: sr?.bottom ?? null,
      sidebarHeight: sr?.height ?? null,
      gridTemplateRows: layoutCs?.gridTemplateRows ?? "",
      navGridArea: nav ? getComputedStyle(nav).gridArea : "",
      canvasGridArea: canvas ? getComputedStyle(canvas).gridArea : "",
    };
  });
}
