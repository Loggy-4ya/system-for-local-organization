/**
 * @fileoverview Parse and serialise general-rules admin list fields.
 *
 * @module shared/lib/generalRulesListParsing
 *
 * Tests: `npm run test:general-rules-domain`
 * Registry: `.ai/docs/testing.md`
 */

import type { ContentPolicyBlockedWordCategory } from "@shared/constants/contentPolicy";
import type { ContentPolicyBlockedWordEntry } from "@shared/constants/contentPolicy";

const BLOCKED_WORD_CATEGORIES = new Set<ContentPolicyBlockedWordCategory>([
  "profanity",
  "slur",
  "sexual",
  "violence",
  "institution",
  "other",
]);

/**
 * Parse admin textarea lines into blocked-word entries.
 *
 * Supports `term` or `term | category` per line.
 *
 * @param raw - Multiline admin input.
 * @returns Normalised blocked-word rows.
 */
export function parseBlockedWordsTextarea(raw: string): ContentPolicyBlockedWordEntry[] {
  const rows: ContentPolicyBlockedWordEntry[] = [];
  const seen = new Set<string>();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [termPart, categoryPart] = trimmed.split("|").map((part) => part.trim());
    const term = termPart?.trim();
    if (!term) continue;

    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const categoryRaw = categoryPart?.toLowerCase();
    const category =
      categoryRaw && BLOCKED_WORD_CATEGORIES.has(categoryRaw as ContentPolicyBlockedWordCategory)
        ? (categoryRaw as ContentPolicyBlockedWordCategory)
        : undefined;

    rows.push(category ? { term, category } : { term });
  }

  return rows;
}

/**
 * Serialise blocked-word entries for the admin textarea.
 *
 * @param entries - Persisted rows.
 * @returns Multiline text (`term | category` when category is set).
 */
export function serializeBlockedWordsTextarea(entries: readonly ContentPolicyBlockedWordEntry[]): string {
  return entries
    .map((entry) =>
      entry.category ? `${entry.term} | ${entry.category}` : entry.term,
    )
    .join("\n");
}

/**
 * Parse weak-password textarea — one password per line.
 *
 * @param raw - Multiline admin input.
 * @returns Unique lowercase passwords.
 */
export function parseWeakPasswordsTextarea(raw: string): string[] {
  const rows: string[] = [];
  const seen = new Set<string>();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(trimmed);
  }

  return rows;
}

/**
 * Serialise weak passwords for the admin textarea.
 *
 * @param entries - Persisted denylist.
 * @returns One password per line.
 */
export function serializeWeakPasswordsTextarea(entries: readonly string[]): string {
  return entries.join("\n");
}
