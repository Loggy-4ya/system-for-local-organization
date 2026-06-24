/**
 * @fileoverview Browser automation — inline `@` mention render + editor round-trip.
 *
 * Registry: .ai/docs/testing.md
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:browser:puck-inline-mention
 */

import { test, expect } from "@playwright/test";
import { loginForPuckEditor } from "../helpers/puckMobileEditor";
import {
  buildInlineUserMentionHtml,
  expandBodyTextContentChapter,
  readSidebarBodyTextEditorHtml,
  seedPuckBodyTextHtml,
  selectFirstBodyTextBlock,
} from "../helpers/puckRichTextMention";

const PUCK_PAGE_PATH = process.env.PUCK_E2E_PAGE_PATH ?? "/news";
const PUCK_EDIT_PATH = process.env.PUCK_E2E_EDIT_PATH ?? `${PUCK_PAGE_PATH}/edit`;

/** Admin user id from the seed account — used for mention href fixtures. */
const MENTION_USER_ID = process.env.PUCK_E2E_MENTION_USER_ID ?? "6a3a19bd1b0ea647861443ae";
const MENTION_LABEL = process.env.PUCK_E2E_MENTION_LABEL ?? "admin";
const MENTION_HREF = process.env.PUCK_E2E_MENTION_HREF ?? "/users/admin";

test.describe("Puck Body Text inline mentions", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 820 });

    try {
      await loginForPuckEditor(page, PUCK_EDIT_PATH);
      await page.locator(".Puck").waitFor({ state: "visible", timeout: 120_000 });
      await page.waitForTimeout(500);
    } catch {
      test.skip(
        true,
        `Puck editor not mounted — publish ${PUCK_PAGE_PATH} and set PUCK_E2E_EDIT_PATH.`,
      );
    }

    if ((await page.locator(".Puck").count()) === 0) {
      test.skip(
        true,
        `Puck editor not mounted — publish ${PUCK_PAGE_PATH} and set PUCK_E2E_EDIT_PATH.`,
      );
    }
  });

  test("renders mention badges inline on canvas and reloads them in the sidebar editor", async ({
    page,
  }) => {
    const fixtureHtml = buildInlineUserMentionHtml({
      userId: MENTION_USER_ID,
      label: MENTION_LABEL,
      href: MENTION_HREF,
    });

    await seedPuckBodyTextHtml(page, PUCK_PAGE_PATH, fixtureHtml);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".Puck").waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForTimeout(2_000);

    const frame = page.frameLocator('iframe[id="preview-frame"], iframe[class*="PuckPreview"]');
    const richBlock = frame.locator(".nexus-rich-text-view").filter({ hasText: "Hello" }).first();
    const canvasHtml = await richBlock.innerHTML();
    expect(canvasHtml).toContain("data-nexus-mention");
    expect(canvasHtml).toContain("nexus-mention");
    expect(canvasHtml).not.toContain("nexus-rich-text__link");
    expect(canvasHtml).not.toMatch(/@admin@admin/);

    const mentionLink = richBlock.locator("a.nexus-mention");
    await expect(mentionLink).toHaveAttribute("href", MENTION_HREF);
    await expect(mentionLink).toHaveText(`@${MENTION_LABEL}`);

    const canvasText = await richBlock.innerText();
    expect(canvasText).toBe(`Hello @${MENTION_LABEL} world`);

    await selectFirstBodyTextBlock(page);
    await expandBodyTextContentChapter(page);

    const sidebarHtml = await readSidebarBodyTextEditorHtml(page);
    expect(sidebarHtml).toMatch(/nexus-mention-node|data-nexus-mention/);
    expect(sidebarHtml).not.toContain("nexus-rich-text__link");
    expect(sidebarHtml).not.toMatch(/@admin@admin/);

    const sidebarText = await page.evaluate(
      () =>
        document.querySelector(".nexus-rich-text-editor--puck .nexus-rich-text-editor__content")
          ?.textContent ?? "",
    );
    expect(sidebarText.replace(/\s+/g, " ").trim()).toBe(`Hello @${MENTION_LABEL} world`);
  });

  test("mention href navigates on the published page", async ({ page, context }) => {
    const fixtureHtml = buildInlineUserMentionHtml({
      userId: MENTION_USER_ID,
      label: MENTION_LABEL,
      href: MENTION_HREF,
    });

    await seedPuckBodyTextHtml(page, PUCK_PAGE_PATH, fixtureHtml);

    const published = await context.newPage();
    await published.goto(PUCK_PAGE_PATH, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await published.waitForTimeout(2_000);

    const mention = published.locator(".nexus-rich-text-view a.nexus-mention").first();
    await expect(mention).toHaveAttribute("href", MENTION_HREF);

    const href = await mention.getAttribute("href");
    expect(href).toBeTruthy();
    await published.goto(href!, { waitUntil: "domcontentloaded", timeout: 120_000 });
    expect(published.url()).toContain("/users/");
  });
});
