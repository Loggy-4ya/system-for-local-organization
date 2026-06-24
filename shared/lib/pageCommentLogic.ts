/**
 * @fileoverview Pure helpers for page comment body normalization.
 *
 * Tests: `npm run test:page-comment-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pageCommentLogic
 */

import type { ContentPolicyBlockedWordEntry } from "@shared/constants/contentPolicy";
import { getBlockedWordErrorInStoredText } from "@shared/lib/contentPolicy";
import {
  looksLikeEditorHtml,
  sanitizeNexusEditorHtml,
} from "@shared/lib/nexusRichTextSanitize";

/** Maximum stored comment length (matches Mongoose schema). */
export const MAX_PAGE_COMMENT_LENGTH = 5000;

/**
 * Extract visible plain text from a comment body (HTML or legacy plain string).
 *
 * @param raw - Stored or draft comment body.
 * @returns Collapsed plain text for policy scans and empty checks.
 */
export function extractPageCommentPlainText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (looksLikeEditorHtml(trimmed)) {
    return trimmed
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return trimmed.replace(/\s+/g, " ").trim();
}

/**
 * Normalize a comment body for MongoDB storage.
 *
 * Rich text from {@link NexusRichTextEditor} is sanitized and stored as HTML.
 * Legacy plain-text comments remain plain strings.
 *
 * @param raw - User-submitted comment body.
 * @returns Sanitized HTML or trimmed plain text capped at {@link MAX_PAGE_COMMENT_LENGTH}.
 */
export function normalizePageCommentBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (looksLikeEditorHtml(trimmed)) {
    return sanitizeNexusEditorHtml(trimmed);
  }

  return extractPageCommentPlainText(trimmed).slice(0, MAX_PAGE_COMMENT_LENGTH);
}

/**
 * Whether a normalized comment body is non-empty.
 *
 * @param body - Normalized comment text or HTML.
 * @returns True when the body has visible characters.
 */
export function isNonEmptyPageCommentBody(body: string): boolean {
  return extractPageCommentPlainText(body).length > 0;
}

/** Optional content-policy override for comment validation (client fetches effective rules). */
export interface PageCommentPolicyOptions {
  /** Live or seed blocklist entries. */
  blockedWords?: readonly ContentPolicyBlockedWordEntry[];
  /** User-facing rejection message from general rules. */
  blockedWordMessage?: string;
}

/**
 * Validate a raw comment before post — empty guard, length cap, and institutional blocklist.
 *
 * @param raw - User-submitted comment body.
 * @param policy - Optional effective rules from {@link GeneralRulesDomain}.
 * @returns `null` when acceptable; otherwise a user-facing error string.
 */
export function getPageCommentValidationError(
  raw: string,
  policy?: PageCommentPolicyOptions,
): string | null {
  const body = normalizePageCommentBody(raw);
  if (!isNonEmptyPageCommentBody(body)) {
    return "Comment cannot be empty.";
  }

  if (body.length > MAX_PAGE_COMMENT_LENGTH) {
    return `Comment must be ${MAX_PAGE_COMMENT_LENGTH} characters or fewer.`;
  }

  const plainText = extractPageCommentPlainText(body);
  if (plainText.length > MAX_PAGE_COMMENT_LENGTH) {
    return `Comment must be ${MAX_PAGE_COMMENT_LENGTH} characters or fewer.`;
  }

  return getBlockedWordErrorInStoredText(body, {
    blockedWords: policy?.blockedWords,
    message: policy?.blockedWordMessage,
  });
}
