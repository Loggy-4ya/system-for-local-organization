/**
 * @fileoverview Pure helpers for page publisher invite links.
 *
 * Invite links let collaborators join a page as delegated editors without manual
 * user search. Tokens are stored hashed on the Page document.
 *
 * Tests: `tests/shared/lib/pagePublisherInviteLogic.test.ts` — `npm run test:page-publisher-invite-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pagePublisherInviteLogic
 */

import { createHash, randomBytes } from "node:crypto";
import {
  PAGE_PUBLISHER_INVITE_PATH_PREFIX,
  PAGE_PUBLISHER_INVITE_TOKEN_BYTES,
  PAGE_PUBLISHER_INVITE_TTL_MS,
} from "@shared/constants/pagePublisherInvite";
import {
  canAddPageAccessEditor,
  type PageAccessEditorEntry,
} from "@shared/lib/pageAccessLogic";

/** Stored invite metadata on a Page document. */
export interface PagePublisherInviteRecord {
  /** SHA-256 hex digest of the opaque invite token. */
  tokenHash: string;
  /** UTC expiry for the invite link. */
  expiresAt: Date;
  /** User id that generated the link. */
  createdBy: string;
}

/** Result of validating an invite token against stored metadata. */
export type PagePublisherInviteValidation =
  | { ok: true }
  | { ok: false; reason: "missing" | "expired" | "invalid" };

/**
 * Generate a new opaque invite token.
 *
 * @returns URL-safe base64 token string.
 */
export function generatePagePublisherInviteToken(): string {
  return randomBytes(PAGE_PUBLISHER_INVITE_TOKEN_BYTES).toString("base64url");
}

/**
 * Hash an invite token for MongoDB storage.
 *
 * @param token - Plain invite token from the URL.
 * @returns SHA-256 hex digest.
 */
export function hashPagePublisherInviteToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Build the public invite redemption path for a token.
 *
 * @param token - Plain invite token.
 * @returns Absolute path such as `/pages/join/abc…`.
 */
export function buildPagePublisherInvitePath(token: string): string {
  const trimmed = token.trim();
  return `${PAGE_PUBLISHER_INVITE_PATH_PREFIX}/${encodeURIComponent(trimmed)}`;
}

/**
 * Build a full invite URL on the public site origin.
 *
 * @param origin - Public site origin without trailing slash.
 * @param token - Plain invite token.
 * @returns Absolute invite URL.
 */
export function buildPagePublisherInviteUrl(origin: string, token: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${buildPagePublisherInvitePath(token)}`;
}

/**
 * Compute invite expiry from the current time.
 *
 * @param nowMs - Optional clock override for tests.
 * @returns Expiry date.
 */
export function computePagePublisherInviteExpiry(nowMs = Date.now()): Date {
  return new Date(nowMs + PAGE_PUBLISHER_INVITE_TTL_MS);
}

/**
 * Whether an invite record is still valid at the given time.
 *
 * @param invite - Stored invite metadata or null.
 * @param nowMs - Optional clock override for tests.
 * @returns True when the invite has not expired.
 */
export function isPagePublisherInviteActive(
  invite: Pick<PagePublisherInviteRecord, "expiresAt"> | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!invite?.expiresAt) return false;
  const expiresAt = invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > nowMs;
}

/**
 * Validate a presented token against stored invite metadata.
 *
 * @param token - Plain token from the invite URL.
 * @param invite - Stored invite metadata or null.
 * @param nowMs - Optional clock override for tests.
 * @returns Validation result.
 */
export function validatePagePublisherInviteToken(
  token: string,
  invite: PagePublisherInviteRecord | null | undefined,
  nowMs = Date.now(),
): PagePublisherInviteValidation {
  const trimmed = token.trim();
  if (!trimmed || !invite?.tokenHash) {
    return { ok: false, reason: "missing" };
  }

  if (!isPagePublisherInviteActive(invite, nowMs)) {
    return { ok: false, reason: "expired" };
  }

  const digest = hashPagePublisherInviteToken(trimmed);
  if (digest !== invite.tokenHash) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true };
}

/**
 * Whether a user may redeem an invite for the given page roster.
 *
 * @param userId - Authenticated redeemer id.
 * @param authorUserId - Page author id.
 * @param delegatedEditors - Current delegated editor rows.
 * @returns True when redemption should append the user.
 */
export function canRedeemPagePublisherInvite(
  userId: string,
  authorUserId: string | null | undefined,
  delegatedEditors: readonly PageAccessEditorEntry[],
): boolean {
  const trimmed = userId.trim();
  if (!trimmed) return false;
  if (authorUserId?.trim() === trimmed) return false;
  if (delegatedEditors.some((entry) => entry.userId === trimmed)) return false;
  return canAddPageAccessEditor(delegatedEditors, trimmed, authorUserId);
}

/**
 * Whether the user already has edit access without redeeming.
 *
 * @param userId - Authenticated user id.
 * @param authorUserId - Page author id.
 * @param delegatedEditorUserIds - Stored delegate ids.
 * @returns True when the user is already on the publisher roster.
 */
export function hasPagePublisherAccess(
  userId: string,
  authorUserId: string | null | undefined,
  delegatedEditorUserIds: readonly string[],
): boolean {
  const trimmed = userId.trim();
  if (!trimmed) return false;
  if (authorUserId?.trim() === trimmed) return true;
  return delegatedEditorUserIds.some((id) => id === trimmed);
}
