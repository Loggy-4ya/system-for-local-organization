/**
 * @fileoverview Short-lived cookie for linking OAuth providers to an existing user.
 *
 * Set on the client before `signIn("google")` from profile settings; read in the
 * Auth.js `signIn` callback to merge Google identity into the signed-in account.
 *
 * Tests: `tests/shared/lib/seedAdminUser.test.ts` — `npm run test:seed-admin-user`
 *
 * @module src/lib/oauthLinkCookie
 */

/** Cookie name used when linking OAuth providers to an existing session user. */
export const OAUTH_LINK_USER_COOKIE = "nexus_oauth_link";

/** Max age for the OAuth link intent cookie (5 minutes). */
const OAUTH_LINK_MAX_AGE_SEC = 300;

/**
 * Build a Set-Cookie header value for OAuth account linking.
 *
 * @param userId - MongoDB user id to link the OAuth profile into.
 * @returns Cookie header fragment for `nexus_oauth_link`.
 */
export function buildOAuthLinkCookie(userId: string): string {
  return `${OAUTH_LINK_USER_COOKIE}=${encodeURIComponent(userId)}; Path=/; Max-Age=${OAUTH_LINK_MAX_AGE_SEC}; SameSite=Lax`;
}

/**
 * Read the OAuth link user id from request cookies.
 *
 * @param cookieHeader - Raw Cookie header string.
 * @returns User id to link, or null when absent.
 */
export function readOAuthLinkUserId(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName !== OAUTH_LINK_USER_COOKIE) continue;

    const rawValue = rawValueParts.join("=");
    if (!rawValue) return null;

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Build a Set-Cookie header that clears the OAuth link intent cookie.
 *
 * @returns Cookie header fragment that expires `nexus_oauth_link`.
 */
export function clearOAuthLinkCookie(): string {
  return `${OAUTH_LINK_USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
