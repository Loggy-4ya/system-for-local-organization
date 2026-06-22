/**
 * @fileoverview Pure content-policy checks — blocked words and weak passwords.
 *
 * Lists live in {@link module:shared/constants/contentPolicy}; this module
 * implements normalisation, scanning, and validation helpers consumed by Zod
 * refinements, API routes, and future admin policy editors.
 *
 * @module shared/lib/contentPolicy
 *
 * Tests: `npm run test:content-policy`
 * Registry: `.ai/docs/testing.md`
 */

import {
  type ContentPolicyBlockedWordCategory,
  type ContentPolicyBlockedWordEntry,
} from "@shared/constants/contentPolicy";
import { getEffectiveGeneralRulesSync } from "@shared/lib/effectiveGeneralRulesCache";

/** One blocked-term hit inside scanned text. */
export interface ContentPolicyBlockedWordMatch {
  /** Matched term from the blocklist (normalised). */
  term: string;
  /** Optional category copied from the blocklist entry. */
  category?: ContentPolicyBlockedWordCategory;
  /** Character index in the **normalised** scan string where the match starts. */
  index: number;
}

/** Aggregate scan result for a single input string. */
export interface ContentPolicyScanResult {
  /** Original input (unchanged). */
  input: string;
  /** Normalised form used for matching. */
  normalized: string;
  /** All blocklist hits, earliest first. */
  matches: ContentPolicyBlockedWordMatch[];
  /** Whether any blocked term was found. */
  hasBlockedWord: boolean;
}

/** Options for {@link scanContentPolicyText}. */
export interface ContentPolicyScanOptions {
  /** Override default blocklist (tests or future DB-backed policy). */
  blockedWords?: readonly ContentPolicyBlockedWordEntry[];
}

const LEETSPEAK_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "(": "c",
  "<": "c",
  "3": "e",
  "6": "g",
  "#": "h",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "7": "t",
  "+": "t",
};

/** Compiled weak-password lookup (lowercase) from effective rules cache. */
function getWeakPasswordSet(): ReadonlySet<string> {
  return getEffectiveGeneralRulesSync().weakPasswordSet;
}

/** Pre-normalised blocklist entries from effective rules cache. */
function getNormalizedBlockedTerms(): readonly {
  term: string;
  category?: ContentPolicyBlockedWordCategory;
}[] {
  return getEffectiveGeneralRulesSync().normalizedBlockedTerms;
}

/** Resolve blocked-word entries for scans (optional override or effective rules). */
function resolveBlockedWordEntries(
  options: ContentPolicyScanOptions,
): readonly { term: string; category?: ContentPolicyBlockedWordCategory }[] {
  if (options.blockedWords) {
    return options.blockedWords
      .map((entry) => ({
        term: normalizeContentPolicyText(entry.term),
        category: entry.category,
      }))
      .filter((entry) => entry.term.length > 0);
  }
  return getNormalizedBlockedTerms();
}

/**
 * Normalise user text for blocklist comparison.
 *
 * Steps: Unicode NFKC, lowercase, leetspeak substitution, strip combining
 * marks, collapse non-alphanumeric runs to single spaces, trim.
 *
 * @param value - Raw user string.
 * @returns Normalised scan string.
 */
export function normalizeContentPolicyText(value: string): string {
  let text = value.normalize("NFKC").toLowerCase();

  text = text
    .split("")
    .map((char) => LEETSPEAK_MAP[char] ?? char)
    .join("");

  text = text.normalize("NFKD").replace(/\p{M}/gu, "");
  text = text.replace(/[^\p{L}\p{N}\s]+/gu, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Build a word-boundary-safe RegExp for one blocklist term.
 *
 * @param term - Normalised term (may contain spaces for phrases).
 * @returns Case-insensitive pattern matching whole words/phrases.
 */
function blockedTermPattern(term: string): RegExp {
  const escaped = term
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");

  return new RegExp(`(?:^|[\\s\\p{P}\\p{S}])${escaped}(?:$|[\\s\\p{P}\\p{S}])`, "iu");
}

/**
 * Scan text for blocked words using the central blocklist.
 *
 * @param value - Raw user string.
 * @param options - Optional blocklist override.
 * @returns Scan result with all matches.
 */
export function scanContentPolicyText(
  value: string,
  options: ContentPolicyScanOptions = {},
): ContentPolicyScanResult {
  const normalized = normalizeContentPolicyText(value);
  const entries = resolveBlockedWordEntries(options);

  const matches: ContentPolicyBlockedWordMatch[] = [];

  if (!normalized) {
    return { input: value, normalized, matches, hasBlockedWord: false };
  }

  for (const entry of entries) {
    const pattern = blockedTermPattern(entry.term);
    const probe = ` ${normalized} `;
    const match = pattern.exec(probe);
    if (match) {
      matches.push({
        term: entry.term,
        category: entry.category,
        index: Math.max(0, match.index - 1),
      });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  return {
    input: value,
    normalized,
    matches,
    hasBlockedWord: matches.length > 0,
  };
}

/**
 * Whether {@link value} contains any blocked word.
 *
 * @param value - Raw user string.
 * @param options - Optional blocklist override.
 * @returns True when a blocklist term matches.
 */
export function containsBlockedWord(
  value: string,
  options?: ContentPolicyScanOptions,
): boolean {
  return scanContentPolicyText(value, options).hasBlockedWord;
}

/**
 * First user-facing blocked-word error, or null when clean.
 *
 * @param value - Raw user string.
 * @param options - Optional blocklist override and custom message.
 * @returns Error message or null.
 */
export function getBlockedWordError(
  value: string,
  options: ContentPolicyScanOptions & { message?: string } = {},
): string | null {
  const { message = getEffectiveGeneralRulesSync().blockedWordMessage, ...scanOptions } = options;
  return containsBlockedWord(value, scanOptions) ? message : null;
}

/**
 * Whether {@link password} is on the institutional weak-password denylist.
 *
 * @param password - Plain-text password candidate.
 * @returns True when the normalised password is blocked.
 */
export function isWeakPolicyPassword(password: string): boolean {
  const normalized = password.trim().toLowerCase();
  if (!normalized) return false;
  return getWeakPasswordSet().has(normalized);
}

/**
 * User-facing weak-password error, or null when acceptable for denylist rules.
 *
 * Does not replace full strength scoring in {@link module:shared/lib/passwordStrength}.
 *
 * @param password - Plain-text password candidate.
 * @param message - Optional override message.
 * @returns Error message or null.
 */
export function getWeakPolicyPasswordError(
  password: string,
  message: string = getEffectiveGeneralRulesSync().weakPasswordMessage,
): string | null {
  return isWeakPolicyPassword(password) ? message : null;
}

/**
 * Replace blocked terms with a mask character (default `*` per matched character).
 *
 * @param value - Raw user string.
 * @param maskChar - Replacement character (default `*`).
 * @param options - Optional blocklist override.
 * @returns Masked copy when hits exist; otherwise the original string.
 */
export function maskBlockedWords(
  value: string,
  maskChar = "*",
  options: ContentPolicyScanOptions = {},
): string {
  const scan = scanContentPolicyText(value, options);
  if (!scan.matches.length) return value;

  const entries = options.blockedWords ?? getEffectiveGeneralRulesSync().blockedWords;
  let output = value;

  for (const entry of entries) {
    const rawTerm = entry.term.trim();
    if (!rawTerm) continue;

    const parts = rawTerm.split(/\s+/).map((part) =>
      part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const pattern = parts.join("\\s+");
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "giu");

    output = output.replace(regex, (match) => maskChar.repeat(match.length));
  }

  return output;
}

/**
 * Strip HTML tags and decode common entities to plain text for policy scanning.
 *
 * @param html - Raw or sanitized HTML string.
 * @returns Collapsed plain text suitable for {@link scanContentPolicyText}.
 */
export function extractPlainTextFromHtml(html: string): string {
  if (!html?.trim()) return "";

  let text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/h[1-6]>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Blocked-word check for TipTap / rich HTML values.
 *
 * @param html - Stored editor HTML.
 * @param options - Optional blocklist override.
 * @returns True when plain text extracted from HTML contains a blocked term.
 */
export function containsBlockedWordInRichText(
  html: string,
  options?: ContentPolicyScanOptions,
): boolean {
  const plain = extractPlainTextFromHtml(html);
  if (!plain) return false;
  return containsBlockedWord(plain, options);
}

/**
 * Validation error for rich HTML, or null when clean.
 *
 * @param html - Stored editor HTML.
 * @param options - Optional blocklist override and custom message.
 * @returns Error message or null.
 */
export function getBlockedWordErrorInRichText(
  html: string,
  options: ContentPolicyScanOptions & { message?: string } = {},
): string | null {
  const plain = extractPlainTextFromHtml(html);
  if (!plain) return null;
  return getBlockedWordError(plain, options);
}

/**
 * Blocked-word check for plain text or stored HTML (auto-detects markup).
 *
 * @param value - Plain string or editor HTML.
 * @param options - Optional blocklist override.
 * @returns True when a blocked term is present.
 */
export function containsBlockedWordInStoredText(
  value: string,
  options?: ContentPolicyScanOptions,
): boolean {
  if (!value.trim()) return false;
  if (/<[a-z][\s\S]*>/i.test(value)) {
    return containsBlockedWordInRichText(value, options);
  }
  return containsBlockedWord(value, options);
}

/**
 * Validation error for plain or HTML stored text.
 *
 * @param value - Plain string or editor HTML.
 * @param options - Optional blocklist override and custom message.
 * @returns Error message or null.
 */
export function getBlockedWordErrorInStoredText(
  value: string,
  options: ContentPolicyScanOptions & { message?: string } = {},
): string | null {
  if (!value.trim()) return null;
  if (/<[a-z][\s\S]*>/i.test(value)) {
    return getBlockedWordErrorInRichText(value, options);
  }
  return getBlockedWordError(value, options);
}
