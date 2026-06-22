/**
 * @fileoverview Browser client for Puck page access editor search.
 *
 * Uses `GET /api/users/search` for name, login, group, and email lookup.
 *
 * @module src/components/puck/lib/pageAccessClient
 */

import type { PageAccessEditorCandidate } from "@shared/lib/pageAccessLogic";
import { fetchUserSearch } from "@/lib/userSearchClient";

/**
 * Search users who can be granted optional edit access on the current page.
 *
 * @param query - Partial name, login, group, or email.
 * @returns Matching user rows.
 * @throws When the user search API fails.
 */
export async function searchPageAccessEditorCandidates(
  query: string,
): Promise<PageAccessEditorCandidate[]> {
  const users = await fetchUserSearch(query);
  return users.map((user) => ({
    userId: user.userId,
    displayName: user.displayName,
    subtitle: user.subtitle ?? null,
    avatar: user.avatar ?? null,
  }));
}

/**
 * Search users and surface API failures for sidebar error messaging.
 *
 * @param query - Partial name, login, group, or email.
 * @returns Candidate rows or an error string.
 */
export async function searchPageAccessEditorCandidatesWithStatus(
  query: string,
): Promise<{ users: PageAccessEditorCandidate[]; error: string | null }> {
  try {
    const users = await searchPageAccessEditorCandidates(query);
    return { users, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not search users. Sign in and try again.";
    return { users: [], error: message };
  }
}
