/**
 * @fileoverview Constants for page publisher invite links.
 *
 * @module shared/constants/pagePublisherInvite
 */

/** Invite validity window in milliseconds (7 days). */
export const PAGE_PUBLISHER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Random token byte length before base64url encoding. */
export const PAGE_PUBLISHER_INVITE_TOKEN_BYTES = 24;

/** URL path prefix for invite redemption routes. */
export const PAGE_PUBLISHER_INVITE_PATH_PREFIX = "/pages/join";
