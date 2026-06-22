/**
 * @fileoverview Browser automation — empty grid settings selection regressions.
 *
 * Registry: .ai/docs/testing.md
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:browser:puck-grid-settings
 */

import { test, expect, type Page } from "@playwright/test";
import { loginForPuckEditor } from "../helpers/puckMobileEditor";

/** Expand the Layout category inside the Nexus blocks drawer. */
async function expandLayoutBlocksCategory(page: Page): Promise<void> {
  const layoutHead = page
    .locator(".nexus-blocks-drawer .nexus-field-chapter__head")
    .filter({ hasText: /^Layout$/i })
    .first();

  await layoutHead.waitFor({ state: "attached", timeout: 10_000 });
  await layoutHead.evaluate((element) => {
    const button = element as HTMLButtonElement;
    if (button.getAttribute("aria-expanded") !== "true") {
      button.click();
    }
  });
  await page.waitForTimeout(300);
}

/** Drag Grid Layout from the Blocks drawer onto the page root drop zone. */
async function insertGridBlock(page: Page): Promise<void> {
  await page.locator(".Puck [class*='NavItem']").filter({ hasText: /^Blocks$/ }).first().click();
  await page.waitForTimeout(500);
  await expandLayoutBlocksCategory(page);

  const gridRow = page
    .locator(".nexus-blocks-drawer .nexus-plugin-panel-row")
    .filter({ hasText: "Grid Layout" })
    .first();
  await gridRow.waitFor({ state: "visible", timeout: 10_000 });

  const frame = page.frameLocator('iframe[id="preview-frame"], iframe[class*="PuckPreview"]');
  const rootDropzone = frame.locator('[data-puck-dropzone]').first();
  await rootDropzone.waitFor({ state: "visible", timeout: 10_000 });
  await gridRow.dragTo(rootDropzone);
  await page.waitForTimeout(1200);
}

/** Read whether the right Fields sidebar shows grid block settings. */
async function readGridSettingsVisible(page: Page): Promise<{
  selectedLabel: string;
  hasGridCellsField: boolean;
}> {
  return page.evaluate(() => {
    const fieldsHeader = document.querySelector('.Puck [class*="FieldsPlugin-header"]');
    const selectedLabel = fieldsHeader?.textContent?.trim() ?? "";
    const hasGridCellsField = Boolean(
      document.querySelector('.Puck [class*="FieldsPlugin"]')?.textContent?.includes("Grid Cells"),
    );
    return { selectedLabel, hasGridCellsField };
  });
}

test.describe("Puck grid settings selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 820 });

    try {
      await loginForPuckEditor(page);
      await page.locator(".Puck").waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(500);
    } catch {
      test.skip(
        true,
        "Puck editor not mounted — publish a page and set PUCK_E2E_EDIT_PATH=/your-slug/edit.",
      );
    }

    if ((await page.locator(".Puck").count()) === 0) {
      test.skip(
        true,
        "Puck editor not mounted — publish a page and set PUCK_E2E_EDIT_PATH=/your-slug/edit.",
      );
    }

    const frame = page.frameLocator('iframe[id="preview-frame"], iframe[class*="PuckPreview"]');
    if ((await frame.locator(".nexus-grid-host--edit").count()) === 0) {
      await insertGridBlock(page);
    }
  });

  test("settings gear selects grid block in the sidebar", async ({ page }) => {
    const frame = page.frameLocator('iframe[id="preview-frame"], iframe[class*="PuckPreview"]');
    const gridHost = frame.locator(".nexus-grid-host--edit").first();
    await expect(gridHost).toBeVisible({ timeout: 10_000 });

    const settingsButton = gridHost.locator(".nexus-grid__edit-select").first();
    await settingsButton.click({ force: true });
    await page.waitForTimeout(500);

    const state = await readGridSettingsVisible(page);
    expect(state.hasGridCellsField || /grid/i.test(state.selectedLabel)).toBe(true);
  });

  test("clicking empty grid cell selects grid block", async ({ page }) => {
    const frame = page.frameLocator('iframe[id="preview-frame"], iframe[class*="PuckPreview"]');
    const gridHost = frame.locator(".nexus-grid-host--edit").first();
    await expect(gridHost).toBeVisible({ timeout: 10_000 });

    const selected = await frame.locator(".nexus-grid-host--edit").first().evaluate((host) => {
      const dropzone = host.querySelector(
        '[data-puck-dropzone]:not([class*="DropZone--hasChildren"])',
      );
      if (!(dropzone instanceof HTMLElement)) {
        return false;
      }

      dropzone.click();
      return true;
    });
    expect(selected).toBe(true);
    await page.waitForTimeout(500);

    const state = await readGridSettingsVisible(page);
    expect(state.hasGridCellsField || /grid/i.test(state.selectedLabel)).toBe(true);
  });
});
