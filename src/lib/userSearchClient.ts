/**
 * @fileoverview Browser client for institution user search autocomplete.
 *
 * @module src/lib/userSearchClient
 */

import type { UserSearchCandidate } from "@shared/lib/userSearchLogic";

/**
 * Search users by name, login, group, specialty, or email (when the server allows).
 *
 * @param query - Partial search string.
 * @param signal - Optional abort signal for debounced inputs.
 * @returns Matching user rows.
 * @throws When the API returns a non-OK status.
 */
export async function fetchUserSearch(
  query: string,
  signal?: AbortSignal,
): Promise<UserSearchCandidate[]> {
  const params = new URLSearchParams({ limit: "12" });
  if (query.trim()) params.set("q", query.trim());

  const res = await fetch(`/api/users/search?${params.toString()}`, { signal });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : "User search failed.");
  }

  const data = (await res.json()) as { users: UserSearchCandidate[] };
  return data.users ?? [];
}

/**
 * Search users and return an error string instead of throwing.
 *
 * @param query - Partial search string.
 * @returns Users and optional error message.
 */
export async function fetchUserSearchWithStatus(
  query: string,
): Promise<{ users: UserSearchCandidate[]; error: string | null }> {
  try {
    const users = await fetchUserSearch(query);
    return { users, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not search users.";
    return { users: [], error: message };
  }
}
