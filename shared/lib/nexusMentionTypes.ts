/**
 * @fileoverview Shared mention and internal-link types for the Nexus rich text editor.
 *
 * Tests: `npm run test:nexus-mention-types`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/nexusMentionTypes
 */

import { buildUserProfileHref } from "@shared/lib/userProfilePathLogic";

/** Discriminant for inline mention nodes stored in TipTap HTML. */
export type NexusMentionType = "user" | "page";

/**
 * A selectable mention target returned by search providers and inserted into the editor.
 */
export interface NexusMentionItem {
  /** Mention kind — drives badge styling and link resolution. */
  mentionType: NexusMentionType;
  /** Stable entity id (MongoDB `_id` string). */
  id: string;
  /** Human-readable label shown inside the badge. */
  label: string;
  /** Navigation target when the mention is rendered as a link. */
  href: string;
  /** Optional secondary line in the suggestion popup. */
  subtitle?: string | null;
  /** Optional avatar URL for user rows in the suggestion popup. */
  avatar?: string | null;
}

/** Grouped mention search response from {@link MentionDomain.search}. */
export interface NexusMentionSearchResult {
  /** Matching users for `@` autocomplete. */
  users: NexusMentionItem[];
  /** Matching published pages for `@` autocomplete. */
  pages: NexusMentionItem[];
}

/** Flattened mention list with section metadata for the suggestion UI. */
export interface NexusMentionSuggestionRow extends NexusMentionItem {
  /** Section heading key for grouped rendering. */
  section: "users" | "pages";
}

/**
 * Strip leading `@` characters from mention labels.
 *
 * Stored HTML and legacy anchors may include `@` in `data-label` or text content;
 * badge renderers add their own `@` prefix.
 *
 * @param label - Raw mention label.
 * @returns Normalised label without leading `@`.
 */
export function normalizeMentionLabel(label: string): string {
  return label.trim().replace(/^@+/, "");
}

/**
 * Build a stable dedupe key for a mention row.
 *
 * Prefers Mongo id, then profile/page href, so legacy duplicates with different
 * ids but the same login handle collapse to one picker row.
 *
 * @param item - Mention suggestion row.
 * @returns Stable dedupe key.
 */
export function mentionItemDedupeKey(
  item: Pick<NexusMentionItem, "mentionType" | "id" | "href">,
): string {
  const id = item.id?.trim();
  if (id) {
    return `${item.mentionType}:id:${id}`;
  }

  const href = item.href?.trim();
  if (href) {
    return `${item.mentionType}:href:${href.toLowerCase()}`;
  }

  return `${item.mentionType}:unknown`;
}

/**
 * Remove duplicate mention rows while preserving first-seen order.
 *
 * @param items - Raw mention rows from search providers.
 * @returns Deduped rows safe for the `@` popup.
 */
export function dedupeNexusMentionItems<T extends NexusMentionItem>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const rows: T[] = [];

  for (const item of items) {
    const primaryKey = mentionItemDedupeKey(item);
    if (seen.has(primaryKey)) continue;

    if (item.mentionType === "user") {
      const profileMatch = /^\/users\/([^/?#]+)/i.exec(item.href?.trim() ?? "");
      const loginKey = profileMatch?.[1]?.toLowerCase();
      if (loginKey && seen.has(`user:login:${loginKey}`)) continue;
      if (loginKey) seen.add(`user:login:${loginKey}`);
    }

    seen.add(primaryKey);
    rows.push(item);
  }

  return rows;
}

/**
 * Build the canonical profile path for a mentioned user.
 *
 * Prefers `/users/{login}` when a login handle is supplied.
 *
 * @param userId - MongoDB user id string.
 * @param login - Optional institution login handle.
 * @returns Internal profile URL.
 */
export function buildUserMentionHref(userId: string, login?: string | null): string {
  return buildUserProfileHref({ id: userId, login });
}

/**
 * Build the canonical path for a mentioned Puck page.
 *
 * @param pagePath - Stored page path (e.g. `/news`).
 * @returns Same path, normalised with a leading slash.
 */
export function buildPageMentionHref(pagePath: string): string {
  const trimmed = pagePath.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Flatten grouped search results into suggestion rows (users first, then pages).
 *
 * Deduplicates by `mentionType` + `id` so repeated API rows or merged sources
 * cannot render duplicate picker entries.
 *
 * @param result - Domain search payload.
 * @returns Ordered rows for the `@` popup.
 */
export function flattenMentionSearchResult(
  result: NexusMentionSearchResult,
): NexusMentionSuggestionRow[] {
  return dedupeNexusMentionItems([
    ...result.users.map((item) => ({ ...item, section: "users" as const })),
    ...result.pages.map((item) => ({ ...item, section: "pages" as const })),
  ]);
}
