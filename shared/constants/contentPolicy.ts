/**
 * @fileoverview Central blocklists for user-facing text and password policy.
 *
 * **Seed defaults:** lists in this file seed MongoDB on first load. Admins edit live
 * rules at `/admin/general-rules`; runtime reads the effective cache via
 * {@link module:shared/lib/contentPolicy}. Import scanning helpers from there — do not
 * duplicate terms in routes, validators, or UI.
 *
 * @module shared/constants/contentPolicy
 */

/** Category tag for a blocked term (used in audit metadata and admin tooling). */
export type ContentPolicyBlockedWordCategory =
  | "profanity"
  | "slur"
  | "sexual"
  | "violence"
  | "institution"
  | "other";

/** One blocked term with optional category for reporting. */
export interface ContentPolicyBlockedWordEntry {
  /** Normalised lowercase term or phrase (letters/digits/spaces only). */
  term: string;
  /** Optional grouping for admin review and future locale packs. */
  category?: ContentPolicyBlockedWordCategory;
}

/**
 * Blocked words and phrases for public-facing user content.
 *
 * Matching is case-insensitive with basic leetspeak normalisation (see
 * {@link module:shared/lib/contentPolicy}.normalizeContentPolicyText). Extend this array as institution policy
 * evolves; avoid scattering copies in Zod schemas or API handlers.
 */
export const CONTENT_POLICY_BLOCKED_WORDS: readonly ContentPolicyBlockedWordEntry[] = [
  { term: "fuck", category: "profanity" },
  { term: "shit", category: "profanity" },
  { term: "bitch", category: "profanity" },
  { term: "asshole", category: "profanity" },
  { term: "nigger", category: "slur" },
  { term: "faggot", category: "slur" },
  { term: "retard", category: "slur" },
  { term: "сука", category: "profanity" },
  { term: "блять", category: "profanity" },
  { term: "хуй", category: "profanity" },
  { term: "пізда", category: "profanity" },
] as const;

/**
 * Known weak passwords rejected at signup and password change.
 *
 * Stored lowercase; {@link isWeakPolicyPassword} normalises input before lookup.
 */
export const CONTENT_POLICY_WEAK_PASSWORDS: readonly string[] = [
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "qwerty123",
  "letmein1",
  "welcome1",
  "nexus123",
  "student123",
  "admin123",
] as const;

/** Default user-facing message when blocked language is detected. */
export const CONTENT_POLICY_BLOCKED_WORD_MESSAGE =
  "This text contains language that is not allowed on Nexus.";

/** Default user-facing message when a weak password is detected. */
export const CONTENT_POLICY_WEAK_PASSWORD_MESSAGE =
  "This password is too common. Choose something more unique.";
