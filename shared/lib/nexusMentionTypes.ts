/**
 * @fileoverview Shared mention and internal-link types for the Nexus rich text editor.
 *
 * @module shared/lib/nexusMentionTypes
 */

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
 * Build the canonical profile path for a mentioned user.
 *
 * @param userId - MongoDB user id string.
 * @returns Internal profile URL (public user profile route planned).
 */
export function buildUserMentionHref(userId: string): string {
  return `/users/${userId}`;
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
 * @param result - Domain search payload.
 * @returns Ordered rows for the `@` popup.
 */
export function flattenMentionSearchResult(
  result: NexusMentionSearchResult,
): NexusMentionSuggestionRow[] {
  return [
    ...result.users.map((item) => ({ ...item, section: "users" as const })),
    ...result.pages.map((item) => ({ ...item, section: "pages" as const })),
  ];
}
