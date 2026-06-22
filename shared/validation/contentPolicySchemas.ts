/**
 * @fileoverview Zod helpers for institutional content-policy (blocked words).
 *
 * @module shared/validation/contentPolicySchemas
 *
 * Tests: `npm run test:validation`, `npm run test:content-policy`
 * Registry: `.ai/docs/testing.md`
 */

import { z } from "zod";
import { CONTENT_POLICY_BLOCKED_WORD_MESSAGE } from "@shared/constants/contentPolicy";
import {
  getBlockedWordError,
  getBlockedWordErrorInRichText,
  getBlockedWordErrorInStoredText,
} from "@shared/lib/contentPolicy";

/**
 * Whether optional plain text passes the blocklist (empty/null allowed).
 *
 * @param value - Candidate string.
 * @returns True when clean or empty.
 */
export function passesContentPolicyPlainText(value: string | null | undefined): boolean {
  if (value == null || value.trim() === "") return true;
  return !getBlockedWordError(value);
}

/**
 * Zod refine predicate for required plain-text fields.
 *
 * @param value - Candidate string.
 * @returns True when no blocked terms are present.
 */
export function refineContentPolicyPlainText(value: string): boolean {
  return !getBlockedWordError(value);
}

/** Shared Zod message for blocked plain text (static fallback for `.refine` configs). */
export const contentPolicyPlainTextMessage = CONTENT_POLICY_BLOCKED_WORD_MESSAGE;

/**
 * Field kinds that must **never** run the profanity blocklist.
 *
 * Numeric catalog values (group numbers), phones, credentials, and structured
 * handles are validated by format rules only — not language policy.
 */
export type ContentPolicyFieldKind =
  | "plain-text"
  | "numeric"
  | "tel"
  | "email"
  | "password"
  | "url"
  | "login";

/** Kinds that skip blocked-word scanning entirely. */
const CONTENT_POLICY_SKIP_KINDS = new Set<ContentPolicyFieldKind>([
  "numeric",
  "tel",
  "email",
  "password",
  "url",
  "login",
]);

/**
 * Whether plain-text content policy should be skipped for this value.
 *
 * Numeric-only strings (e.g. group `42`) are excluded even when bound to a
 * text input — profanity rules apply to prose, not digits.
 *
 * @param value - Raw field value.
 * @returns True when the blocklist must not run.
 */
export function shouldSkipContentPolicyPlainText(value: string | null | undefined): boolean {
  if (value == null || value.trim() === "") return true;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return true;
  return false;
}

/**
 * Live or Zod validation error for a plain-text field, respecting field kind.
 *
 * @param value - Current input value.
 * @param kind - Field kind (`plain-text` runs the blocklist).
 * @returns User-facing error or null.
 */
export function getContentPolicyFieldError(
  value: string,
  kind: ContentPolicyFieldKind = "plain-text",
): string | null {
  if (CONTENT_POLICY_SKIP_KINDS.has(kind)) return null;
  if (shouldSkipContentPolicyPlainText(value)) return null;
  return getBlockedWordError(value);
}

/**
 * Add a blocked-word issue to a Zod refinement context.
 *
 * @param ctx - Active refinement context.
 * @param value - Candidate plain text (skipped when empty).
 * @param path - Field path for the issue.
 */
export function addContentPolicyPlainTextIssue(
  ctx: z.RefinementCtx,
  value: string | null | undefined,
  path: (string | number)[],
): void {
  if (shouldSkipContentPolicyPlainText(value)) return;
  const message = getBlockedWordError(value!);
  if (message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  }
}

/**
 * Add a blocked-word issue for plain or HTML stored text.
 *
 * @param ctx - Active refinement context.
 * @param value - Candidate string (skipped when empty).
 * @param path - Field path for the issue.
 */
export function addContentPolicyStoredTextIssue(
  ctx: z.RefinementCtx,
  value: string | null | undefined,
  path: (string | number)[],
): void {
  if (!value?.trim()) return;
  const message = getBlockedWordErrorInStoredText(value);
  if (message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  }
}

/**
 * Add a blocked-word issue for TipTap HTML.
 *
 * @param ctx - Active refinement context.
 * @param html - Editor HTML (skipped when empty).
 * @param path - Field path for the issue.
 */
export function addContentPolicyRichTextIssue(
  ctx: z.RefinementCtx,
  html: string | null | undefined,
  path: (string | number)[],
): void {
  if (!html?.trim()) return;
  const message = getBlockedWordErrorInRichText(html);
  if (message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  }
}

/**
 * Chainable Zod refinement config for plain-text fields after `.trim()`.
 */
export const contentPolicyPlainTextRefine = {
  /** Refine predicate — use with `.refine(contentPolicyPlainTextRefine.check, …)`. */
  check: refineContentPolicyPlainText,
  /** User-facing message. */
  message: contentPolicyPlainTextMessage,
} as const;
