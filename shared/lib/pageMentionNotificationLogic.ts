/**
 * @fileoverview Pure helpers for notifying users @mentioned in Puck page content on go-live.
 *
 * Tests: `npm run test:page-mention-notification`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pageMentionNotificationLogic
 */

import { looksLikeEditorHtml } from "@shared/lib/nexusRichTextSanitize";
import type { PagePublicationSlice } from "@shared/lib/pagePublicationLogic";
import { wasPagePubliclyVisibleBefore } from "@shared/lib/pagePublishNotificationLogic";

/** Prop keys that store TipTap HTML in Puck blocks. */
const RICH_TEXT_KEYS = new Set(["text", "content"]);

/** Regex matching opening Nexus mention anchor tags in stored HTML. */
const NEXUS_MENTION_ANCHOR_RE = /<a\b[^>]*\bdata-nexus-mention\b[^>]*>/gi;

/**
 * Read a single HTML attribute value from an anchor tag fragment.
 *
 * @param tag - Opening anchor tag string.
 * @param name - Attribute name.
 * @returns Trimmed value or empty string.
 */
function readHtmlAttribute(tag: string, name: string): string {
  const re = new RegExp(
    `\\b${name}\\s*=\\s*(["'])([^"']*)\\1|\\b${name}\\s*=\\s*([^\\s>]+)`,
    "i",
  );
  const match = re.exec(tag);
  return (match?.[2] || match?.[3] || "").trim();
}

/**
 * Extract MongoDB user ids from user mention anchors in rich text HTML.
 *
 * @param html - Stored TipTap HTML fragment.
 * @returns Deduped user ids in document order.
 */
export function extractUserMentionIdsFromHtml(html: string): string[] {
  if (!html?.trim() || !looksLikeEditorHtml(html)) return [];

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(NEXUS_MENTION_ANCHOR_RE)) {
    const tag = match[0];
    if (readHtmlAttribute(tag, "data-mention-type") !== "user") continue;

    const id = readHtmlAttribute(tag, "data-id");
    if (!id || seen.has(id)) continue;

    seen.add(id);
    ids.push(id);
  }

  return ids;
}

/**
 * Deep-walk Puck JSON and collect user mention ids from rich text props.
 *
 * @param value - Puck data subtree.
 * @param collector - Mutable dedupe set.
 */
function collectUserMentionIdsFromPuckNode(value: unknown, collector: Set<string>): void {
  if (value == null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectUserMentionIdsFromPuckNode(item, collector);
    }
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (typeof nested === "string") {
      if (!RICH_TEXT_KEYS.has(key) && !looksLikeEditorHtml(nested)) continue;
      for (const id of extractUserMentionIdsFromHtml(nested)) {
        collector.add(id);
      }
    } else {
      collectUserMentionIdsFromPuckNode(nested, collector);
    }
  }
}

/**
 * Collect all user mention ids referenced anywhere in a Puck page document.
 *
 * @param puckData - Root `puckData` object from a page save.
 * @returns Deduped user ids.
 */
export function collectUserMentionIdsFromPuckData(puckData: unknown): string[] {
  const collector = new Set<string>();
  collectUserMentionIdsFromPuckNode(puckData, collector);
  return [...collector];
}

/**
 * Whether @mention notifications should fire for this go-live transition.
 *
 * Fires only on the first public go-live — republishing an already-live page does not re-notify.
 *
 * @param priorPublication - Prior `published` / `publishAt` fields.
 * @param now - Reference instant.
 * @returns True when mention fan-out should run.
 */
export function shouldDispatchPageMentionNotifications(
  priorPublication: PagePublicationSlice,
  now: Date = new Date(),
): boolean {
  return !wasPagePubliclyVisibleBefore(priorPublication, now);
}

/**
 * Resolve inbox recipients for page mention notifications.
 *
 * Drops the page author and duplicate ids while preserving first-seen order.
 *
 * @param mentionedUserIds - Raw ids parsed from page content.
 * @param authorUserId - Page author Mongo id, if known.
 * @returns Recipient ids excluding the author.
 */
export function resolvePageMentionNotificationRecipients(
  mentionedUserIds: readonly string[],
  authorUserId: string | null | undefined,
): string[] {
  const author = authorUserId?.trim() ?? "";
  const seen = new Set<string>();
  const recipients: string[] = [];

  for (const rawId of mentionedUserIds) {
    const id = rawId.trim();
    if (!id || id === author || seen.has(id)) continue;
    seen.add(id);
    recipients.push(id);
  }

  return recipients;
}

/**
 * Build inbox/Telegram copy when a user is @mentioned on a newly published page.
 *
 * @param pageTitle - Published page title.
 * @param authorName - Optional page author display name.
 * @returns Headline and supporting body text.
 */
export function buildPageMentionNotificationCopy(
  pageTitle: string,
  authorName: string | null | undefined,
): { title: string; body: string } {
  const trimmedTitle = pageTitle.trim() || "New page";
  const trimmedAuthor = authorName?.trim();

  return {
    title: `You were mentioned on: ${trimmedTitle}`,
    body: trimmedAuthor
      ? `${trimmedAuthor} mentioned you on a newly published page.`
      : "You were mentioned on a newly published page.",
  };
}

/**
 * Build a plain-text Telegram DM for a page mention notification.
 *
 * @param title - Inbox headline.
 * @param body - Supporting copy.
 * @param pageUrl - Absolute or relative open link.
 * @returns Telegram-safe plain text.
 */
export function buildPageMentionTelegramMessage(
  title: string,
  body: string,
  pageUrl: string,
): string {
  return `${title.trim()}\n\n${body.trim()}\n\nOpen: ${pageUrl.trim()}`;
}
