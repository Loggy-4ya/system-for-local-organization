/**
 * @fileoverview Browser client for the mention search API.
 *
 * @module src/lib/nexusEditor/mentionQueryClient
 */

import {
  flattenMentionSearchResult,
  type NexusMentionItem,
  type NexusMentionSearchResult,
  type NexusMentionSuggestionRow,
} from "@shared/lib/nexusMentionTypes";

/** Default mention search endpoint. */
export const MENTION_SEARCH_API_PATH = "/api/mentions/search";

/**
 * Fetch mention suggestions from the Nexus API.
 *
 * @param query - Partial label typed after `@`.
 * @param signal - Optional abort signal for in-flight cancellation.
 * @returns Grouped users and pages.
 */
export async function fetchMentionSearch(
  query: string,
  signal?: AbortSignal,
): Promise<NexusMentionSearchResult> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${MENTION_SEARCH_API_PATH}?${params.toString()}`, {
    method: "GET",
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Mention search failed (${response.status}).`);
  }

  const payload = (await response.json()) as NexusMentionSearchResult;
  return {
    users: payload.users ?? [],
    pages: payload.pages ?? [],
  };
}

/**
 * Default mention search used by {@link NexusRichTextEditor}.
 *
 * @param query - Partial label typed after `@`.
 * @returns Flattened suggestion rows for the `@` popup.
 */
export async function defaultSearchMentions(
  query: string,
): Promise<NexusMentionSuggestionRow[]> {
  const result = await fetchMentionSearch(query);
  return flattenMentionSearchResult(result);
}

/**
 * Type alias for injectable mention search handlers.
 */
export type NexusMentionSearchFn = (
  query: string,
) => Promise<NexusMentionItem[] | NexusMentionSuggestionRow[]>;
