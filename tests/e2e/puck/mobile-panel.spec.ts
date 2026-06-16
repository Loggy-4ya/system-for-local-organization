/**
 * @fileoverview Browser automation — compact Puck mobile plugin panel regressions.
 *
 * Covers known issues:
 * - Empty white panel void (sidebar forced `display: none` on narrow viewports)
 * - Zero-height panel row after open
 * - Missing Blocks / Outline / Fields bodies when a bottom-rail tab is active
 *
 * Registry: .ai/docs/testing.md — "Agent quickstart — Playwright browser automation"
 * Run: see testing.md (install browser → start app → PLAYWRIGHT_BASE_URL=… npm run test:browser:puck-mobile-panel)
 */

import { test, expect } from "@playwright/test";
import {
  DEFAULT_PUCK_E2E_EDIT_PATH,
  gotoPuckEditor,
  openTabAndSnapshot,
  readMobileGridBackdropSnapshot,
  readMobileLayoutGeometry,
  tapMobilePanelTab,
  tapMobileViewportPreset,
} from "../helpers/puckMobileEditor";

/** Compact panel minimum height from sidebarLayoutLimits (px). */
const PANEL_MIN_HEIGHT_PX = 160;

test.describe("Puck mobile plugin panel", () => {
  test.beforeEach(async ({ page }) => {
    await gotoPuckEditor(page);
  });

  test("sets narrow-editor html attribute on mobile viewport", async ({ page }) => {
    const narrow = await page.evaluate(() =>
      document.documentElement.hasAttribute("data-nexus-narrow-editor"),
    );
    expect(narrow).toBe(true);
  });

  test("fills viewport height with bottom nav docked — panel closed", async ({ page }) => {
    const layout = await readMobileLayoutGeometry(page);

    expect(layout.puckHeight).toBeGreaterThanOrEqual(layout.viewportHeight * 0.95);
    expect(layout.layoutInnerHeight).toBeGreaterThanOrEqual(layout.viewportHeight * 0.95);
    expect(layout.navGridArea).toBe("sidenav");
    expect(layout.canvasGridArea).toBe("editor");
    expect(layout.canvasHeight).toBeGreaterThan(layout.viewportHeight * 0.45);
    expect(layout.navBottom).toBeGreaterThanOrEqual(layout.viewportHeight - 80);
    expect(layout.navTop).toBeGreaterThan(layout.headerBottom + 80);
  });

  test("keeps full canvas height when Outline overlay panel is open", async ({ page }) => {
    const closed = await readMobileLayoutGeometry(page);
    await tapMobilePanelTab(page, "Outline");
    const open = await readMobileLayoutGeometry(page);

    expect(open.puckHeight).toBeGreaterThanOrEqual(open.viewportHeight * 0.95);
    expect(open.canvasHeight).toBeGreaterThan(120);
    expect(open.sidebarHeight ?? 0).toBeGreaterThanOrEqual(PANEL_MIN_HEIGHT_PX);
    expect(open.navBottom).toBeGreaterThanOrEqual(open.viewportHeight - 80);
    expect(open.canvasHeight).toBeGreaterThanOrEqual(closed.canvasHeight - 4);
    expect((open.sidebarTop ?? 0)).toBeLessThan(open.canvasBottom);
    expect((open.sidebarBottom ?? 0)).toBeLessThanOrEqual(open.navTop + 12);
  });

  test("grid and canvas stay fixed while overlay panel opens", async ({ page }) => {
    const closed = await readMobileGridBackdropSnapshot(page);

    expect(closed.hasBackdropAttr).toBe(true);
    expect(closed.parentIsLayoutInner).toBe(true);
    expect(closed.parentIsFullScreen).toBe(false);
    expect(closed.gridHeight).toBeGreaterThan(200);
    expect(closed.shellHeight).toBeGreaterThan(200);

    await page.locator('.Puck li').filter({ hasText: 'Outline' }).first().click();

    const duringSamples: PuckMobileGridBackdropSnapshot[] = [];
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(50);
      duringSamples.push(await readMobileGridBackdropSnapshot(page));
    }

    for (const sample of duringSamples) {
      expect(sample.gridHeight).toBeGreaterThanOrEqual(closed.gridHeight - 4);
      expect(sample.shellHeight).toBeGreaterThanOrEqual(closed.shellHeight - 4);
    }

    await page.waitForTimeout(500);

    const open = await readMobileGridBackdropSnapshot(page);

    expect(open.gridHeight).toBeGreaterThanOrEqual(closed.gridHeight - 4);
    expect(open.shellHeight).toBeGreaterThanOrEqual(closed.shellHeight - 4);
    expect(open.sidebarHeight ?? 0).toBeGreaterThanOrEqual(PANEL_MIN_HEIGHT_PX);
  });

  test("opens panel with non-zero height when Outline tab is tapped", async ({ page }) => {
    const snapshot = await openTabAndSnapshot(page, "Outline");

    expect(snapshot.leftSideBarVisible).toBe(true);
    expect(snapshot.panelHeightVar).not.toBe("0px");
    expect(snapshot.heightPx).toBeGreaterThanOrEqual(PANEL_MIN_HEIGHT_PX);
  });

  test("shows sidebar as flex/visible — regression for empty white panel void", async ({
    page,
  }) => {
    const snapshot = await openTabAndSnapshot(page, "Outline");

    expect(snapshot.display).toBe("flex");
    expect(snapshot.visibility).toBe("visible");
    expect(snapshot.heightPx).toBeGreaterThan(0);
    expect(snapshot.visibleTabHeightPx).toBeGreaterThan(0);
  });

  test("renders outline tree content in the visible plugin tab", async ({ page }) => {
    const snapshot = await openTabAndSnapshot(page, "Outline");

    expect(snapshot.hasOutlinePlugin).toBe(true);
    expect(snapshot.outlineTextLength).toBeGreaterThan(0);
  });

  test("renders Fields plugin inputs when Fields tab is active", async ({ page }) => {
    await tapMobilePanelTab(page, "Fields");

    const fieldsVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('.Puck [class*="Sidebar--left"]');
      const fields = document.querySelector(
        '.Puck [class*="PuckPluginTab--visible"] [class*="FieldsPlugin"]',
      );
      if (!sidebar || !fields) return { ok: false, display: "", height: 0 };

      const sidebarCs = getComputedStyle(sidebar);
      return {
        ok: true,
        display: sidebarCs.display,
        visibility: sidebarCs.visibility,
        height: sidebar.getBoundingClientRect().height,
        fieldsHeight: fields.getBoundingClientRect().height,
        hasInput:
          fields.querySelector("input, textarea, select, button, [role='switch']") !== null,
      };
    });

    expect(fieldsVisible.ok).toBe(true);
    expect(fieldsVisible.display).toBe("flex");
    expect(fieldsVisible.visibility).toBe("visible");
    expect(fieldsVisible.height).toBeGreaterThanOrEqual(PANEL_MIN_HEIGHT_PX);
    expect(fieldsVisible.fieldsHeight).toBeGreaterThan(0);
    expect(fieldsVisible.hasInput).toBe(true);
  });

  test("renders Blocks component list when Blocks tab is active", async ({ page }) => {
    await tapMobilePanelTab(page, "Blocks");

    const blocksVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('.Puck [class*="Sidebar--left"]');
      const list =
        document.querySelector(".Puck [class*='PuckPluginTab--visible'] .nexus-blocks-plugin") ??
        document.querySelector('.Puck [class*="PuckPluginTab--visible"] [class*="BlocksPlugin"]');
      if (!sidebar || !list) return { ok: false };

      return {
        ok: true,
        display: getComputedStyle(sidebar).display,
        listHeight: list.getBoundingClientRect().height,
      };
    });

    expect(blocksVisible.ok).toBe(true);
    expect(blocksVisible.display).toBe("flex");
    expect(blocksVisible.listHeight).toBeGreaterThan(0);
  });

  test("keeps bottom nav tappable while panel is open", async ({ page }) => {
    await tapMobilePanelTab(page, "Outline");

    const navLink = page.locator('.Puck [class*="NavItem-link"]').filter({ hasText: "Fields" });
    await expect(navLink).toBeVisible();
    await navLink.tap().catch(async () => navLink.click());

    const activeTab = await page.evaluate(() =>
      document.querySelector('.Puck [class*="PuckPluginTab--visible"] [class*="FieldsPlugin"]') !==
      null,
    );
    expect(activeTab).toBe(true);
  });

  test("does not use broken .Puck:not(leftSideBarVisible) hide selector in CSS", async ({
    page,
  }) => {
    /** Guard the CSS regression that hid the sidebar even when the panel was open. */
    const cssBrokenSelectorPresent = await page.evaluate(async () => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (
              rule instanceof CSSStyleRule &&
              rule.selectorText.includes('.Puck:not([class*="PuckLayout--leftSideBarVisible"])')
            ) {
              return true;
            }
          }
        } catch {
          /* cross-origin stylesheets */
        }
      }
      return false;
    });

    expect(cssBrokenSelectorPresent).toBe(false);
  });

  test("desktop viewport preset fills the mobile canvas width", async ({ page }) => {
    await tapMobileViewportPreset(page, 2);

    const snapshot = await page.evaluate(() => {
      const inner = document.querySelector('[class*="PuckCanvas-inner"]');
      const root = document.getElementById("puck-canvas-root");
      const puck = document.querySelector(".Puck");
      const innerWidth = inner?.clientWidth ?? 0;
      const rootRect = root?.getBoundingClientRect();

      return {
        viewportWidth: (
          window as Window & {
            __PUCK_INTERNAL_DO_NOT_USE?: {
              appStore?: { getState: () => { state: { ui: { viewports: { current: { width: unknown } } } } } };
            };
          }
        ).__PUCK_INTERNAL_DO_NOT_USE?.appStore?.getState()?.state?.ui?.viewports?.current?.width,
        fullWidthAttr: puck?.hasAttribute("data-nexus-viewport-full-width") ?? false,
        innerWidth,
        rootVisualWidth: rootRect?.width ?? 0,
      };
    });

    expect(snapshot.viewportWidth).toBe(1280);
    expect(snapshot.fullWidthAttr).toBe(false);
    expect(snapshot.innerWidth).toBeGreaterThan(0);
    expect(snapshot.rootVisualWidth / snapshot.innerWidth).toBeGreaterThan(0.85);
  });

  test("mounts scrollport grid on layout-inner backdrop on phone viewport preset", async ({
    page,
  }) => {
    await tapMobileViewportPreset(page, 0);

    const snapshot = await readMobileGridBackdropSnapshot(page);

    expect(snapshot.shellHeight).toBeGreaterThan(0);
    expect(snapshot.gridHeight).toBeGreaterThan(0);
    expect(snapshot.gridHeight / snapshot.shellHeight).toBeGreaterThan(0.95);
    expect(snapshot.hasBackdropAttr).toBe(true);
    expect(snapshot.parentIsLayoutInner).toBe(true);
    expect(snapshot.parentIsFullScreen).toBe(false);
  });
});

test.describe("Puck mobile plugin panel — config", () => {
  test("documents default editor path env override", () => {
    expect(DEFAULT_PUCK_E2E_EDIT_PATH).toMatch(/\/edit$/);
  });
});
