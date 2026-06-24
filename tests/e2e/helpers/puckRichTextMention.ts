/**
 * @fileoverview Playwright helpers for Puck Body Text inline mention regressions.
 *
 * Registry: .ai/docs/testing.md
 */

import type { Page } from "@playwright/test";
import { serializeMentionAnchor } from "@shared/lib/nexusRichTextSanitize";

/** Stored HTML fixture with a user mention inline in body copy. */
export function buildInlineUserMentionHtml(options: {
  userId: string;
  label: string;
  href: string;
  prefix?: string;
  suffix?: string;
}): string {
  const mention = serializeMentionAnchor({
    mentionType: "user",
    id: options.userId,
    label: options.label,
    href: options.href,
  });

  const prefix = options.prefix ?? "Hello ";
  const suffix = options.suffix ?? " world";
  return `<p>${prefix}${mention}${suffix}</p>`;
}

/**
 * Walk a Puck tree and patch every {@link NexusText} `text` prop.
 *
 * @param items - Puck `content` array.
 * @param textHtml - Replacement HTML for each Body Text block.
 * @returns Patched tree.
 */
export function patchNexusTextBlocks(items: unknown[], textHtml: string): unknown[] {
  return (items ?? []).map((raw) => {
    const item = raw as {
      type?: string;
      props?: Record<string, unknown> & {
        content?: unknown[];
        items?: Array<{ content?: unknown[] }>;
      };
    };

    const next = {
      ...item,
      props: item.props ? { ...item.props } : {},
    };

    if (item.type === "NexusText") {
      next.props.text = textHtml;
      const existingChapter = item.props?.textContent;
      if (existingChapter && typeof existingChapter === "object") {
        next.props.textContent = { ...existingChapter, text: textHtml };
      } else {
        next.props.textContent = { text: textHtml };
      }
    }

    if (Array.isArray(item.props?.content)) {
      next.props.content = patchNexusTextBlocks(item.props.content, textHtml);
    }

    if (Array.isArray(item.props?.items)) {
      next.props.items = item.props.items.map((cell) => ({
        ...cell,
        content: patchNexusTextBlocks(cell.content ?? [], textHtml),
      }));
    }

    return next;
  });
}

/**
 * Select the first Body Text block from the Outline plugin.
 *
 * @param page - Playwright page on a Puck edit route.
 */
export async function selectFirstBodyTextBlock(page: Page): Promise<void> {
  await page
    .locator('.Puck [class*="NavItem"]')
    .filter({ hasText: /^Outline$/ })
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const names = [...document.querySelectorAll(".nexus-outline-layer__name")];
    const idx = names.findIndex((node) => node.textContent?.trim() === "Body Text");
    const layer = names[idx]?.closest(".nexus-outline-layer");
    layer?.querySelector("button.nexus-outline-layer__select")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  });
  await page.waitForTimeout(800);
}

/**
 * Expand the Body Text "Content" field chapter in the right sidebar.
 *
 * @param page - Playwright page with a Body Text block selected.
 */
export async function expandBodyTextContentChapter(page: Page): Promise<void> {
  await page.evaluate(() => {
    const heads = [
      ...document.querySelectorAll('.Puck [class*="FieldsPlugin"] .nexus-field-chapter__head'),
    ];
    const content = heads.find((head) => head.textContent?.trim().startsWith("Content"));
    if (!content) return;
    if (content.getAttribute("aria-expanded") !== "true") {
      (content as HTMLButtonElement).click();
    }
  });
  await page.waitForTimeout(400);
}

/**
 * Read the sidebar TipTap HTML for the selected Body Text block.
 *
 * @param page - Playwright page.
 * @returns Editor document HTML.
 */
export async function readSidebarBodyTextEditorHtml(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      document.querySelector(".nexus-rich-text-editor--puck .nexus-rich-text-editor__content")
        ?.innerHTML ?? "",
  );
}

/**
 * Read a canvas Body Text render HTML from the Puck preview iframe.
 *
 * @param page - Playwright page.
 * @param index - Zero-based `.nexus-rich-text-view` index.
 * @returns Sanitized read-only HTML from {@link NexusRichTextView}.
 */
export async function readCanvasBodyTextHtml(page: Page, index = 0): Promise<string> {
  const frame = page.frameLocator('iframe[id="preview-frame"], iframe[class*="PuckPreview"]');
  return frame.locator(".nexus-rich-text-view").nth(index).innerHTML();
}

/**
 * Upsert mention fixture HTML on a Puck page through the authenticated API.
 *
 * @param page - Playwright page with an active session.
 * @param pagePath - Stored page path (e.g. `/news`).
 * @param textHtml - HTML to assign to every Body Text block.
 */
export async function seedPuckBodyTextHtml(
  page: Page,
  pagePath: string,
  textHtml: string,
): Promise<void> {
  const response = await page.request.get(`/api/puck?path=${encodeURIComponent(pagePath)}`);
  if (!response.ok()) {
    throw new Error(`Failed to load Puck page ${pagePath} (${response.status()}).`);
  }

  const payload = (await response.json()) as {
    puckData?: { content?: unknown[] };
    title?: string;
    published?: boolean;
    categories?: string[];
    publication?: unknown;
    delegatedEditors?: unknown;
  };

  const puckData = payload.puckData ?? { content: [] };
  puckData.content = patchNexusTextBlocks(puckData.content ?? [], textHtml);

  const save = await page.request.post("/api/puck", {
    data: {
      path: pagePath,
      puckData,
      title: payload.title,
      published: payload.published,
      categories: payload.categories,
      publication: payload.publication,
      delegatedEditors: payload.delegatedEditors,
    },
  });

  if (!save.ok()) {
    throw new Error(`Failed to save Puck page ${pagePath} (${save.status()}).`);
  }
}
