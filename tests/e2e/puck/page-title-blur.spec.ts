/**
 * @fileoverview Browser automation — page title blur commit regressions.
 *
 * Registry: .ai/docs/testing.md
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:browser:puck-page-title
 */

import { test, expect, type Page } from "@playwright/test";
import { loginForPuckEditor } from "../helpers/puckMobileEditor";

/** Open the Fields sidebar and ensure Page Details is reachable. */
async function openPageDetailsFields(page: Page): Promise<void> {
  const fieldsTab = page.locator(".Puck [class*='NavItem']").filter({ hasText: /^Fields$/ }).first();
  await fieldsTab.click();
  await page.waitForTimeout(400);

  const pageTitleLabel = page.locator(".Puck").getByText("Page Title", { exact: true }).first();
  await pageTitleLabel.waitFor({ state: "visible", timeout: 10_000 });
}

/** Read the live header title badge text. */
async function readHeaderTitle(page: Page): Promise<string> {
  return page.locator(".nexus-page-header-label__title").first().innerText();
}

/** Read the Page Title sidebar input value. */
async function readPageTitleInput(page: Page): Promise<string> {
  const input = page
    .locator(".Puck .nexus-field-category")
    .filter({ has: page.getByText("Page Title", { exact: true }) })
    .locator("input.nexus-puck-input")
    .first();
  return input.inputValue();
}

test.describe("Puck page title blur commit", () => {
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
  });

  test("keeps the edited title in the sidebar and header after blur", async ({ page }) => {
    await openPageDetailsFields(page);

    const titleInput = page
      .locator(".Puck .nexus-field-category")
      .filter({ has: page.getByText("Page Title", { exact: true }) })
      .locator("input.nexus-puck-input")
      .first();

    const nextTitle = `E2E Title ${Date.now()}`;
    await titleInput.click();
    await titleInput.fill(nextTitle);
    await expect(titleInput).toHaveValue(nextTitle);
    await expect(page.locator(".nexus-page-header-label__title").first()).toHaveText(nextTitle);

    await titleInput.blur();
    await page.waitForTimeout(300);

    await expect(titleInput).toHaveValue(nextTitle);
    await expect(page.locator(".nexus-page-header-label__title").first()).toHaveText(nextTitle);
    expect(await readHeaderTitle(page)).toBe(nextTitle);
    expect(await readPageTitleInput(page)).toBe(nextTitle);
  });

  test("commits the final keystroke when blur happens immediately after typing", async ({ page }) => {
    await openPageDetailsFields(page);

    const titleInput = page
      .locator(".Puck .nexus-field-category")
      .filter({ has: page.getByText("Page Title", { exact: true }) })
      .locator("input.nexus-puck-input")
      .first();

    const suffix = `Z${Date.now()}`;
    await titleInput.click();
    await titleInput.pressSequentially(suffix, { delay: 0 });
    await titleInput.blur();
    await page.waitForTimeout(300);

    const committed = await readPageTitleInput(page);
    expect(committed.endsWith(suffix)).toBe(true);
    expect(await readHeaderTitle(page)).toBe(committed);
  });
});
