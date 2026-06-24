/**
 * @fileoverview Pure helpers for public member profile URLs at `/users/{login|id}`.
 *
 * Login handles are preferred in links when present; MongoDB ids remain valid for
 * accounts without a credentials login and for legacy mention anchors.
 *
 * Tests: `npm run test:user-profile-path-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/userProfilePathLogic
 */

/** First path segment for member profile routes. */
export const USER_PROFILE_PATH_PREFIX = "users";

/**
 * Whether a route segment looks like a MongoDB ObjectId (24 hex chars).
 *
 * @param value - Raw URL segment or id string.
 * @returns True when the value matches ObjectId shape.
 */
export function looksLikeMongoObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value.trim());
}

/**
 * Normalise a profile URL segment for comparison (decode + lowercase + trim).
 *
 * @param segment - Raw dynamic route param.
 * @returns Normalised segment for canonical matching.
 */
export function normalizeUserProfileSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).trim().toLowerCase();
  } catch {
    return segment.trim().toLowerCase();
  }
}

/**
 * Build the canonical public profile href for a user.
 *
 * Prefers `/users/{login}` when a non-empty login exists; otherwise falls back to id.
 *
 * @param user - Profile owner id and optional login handle.
 * @returns Absolute in-app profile path.
 */
export function buildUserProfileHref(user: {
  id: string;
  login?: string | null;
}): string {
  const login = user.login?.trim().toLowerCase();
  if (login) {
    return `/${USER_PROFILE_PATH_PREFIX}/${encodeURIComponent(login)}`;
  }
  return `/${USER_PROFILE_PATH_PREFIX}/${user.id}`;
}

/**
 * Extract the canonical URL segment from a built profile href.
 *
 * @param href - Path from {@link buildUserProfileHref}.
 * @returns Segment after `/users/` without leading slash.
 */
export function userProfileHrefToSegment(href: string): string {
  const prefix = `/${USER_PROFILE_PATH_PREFIX}/`;
  if (!href.startsWith(prefix)) return "";
  return href.slice(prefix.length);
}

/**
 * Whether the current dynamic segment matches the canonical profile segment.
 *
 * @param segment - Raw route param (`login`, id, or wrong casing).
 * @param canonicalHref - Canonical path from {@link buildUserProfileHref}.
 * @returns True when no redirect is required.
 */
export function isCanonicalUserProfileSegment(
  segment: string,
  canonicalHref: string,
): boolean {
  const expected = userProfileHrefToSegment(canonicalHref);
  if (!expected) return false;
  return normalizeUserProfileSegment(segment) === normalizeUserProfileSegment(expected);
}
