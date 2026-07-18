/**
 * @fileoverview In-process cache of merged general rules for sync content-policy scans.
 *
 * @module shared/lib/effectiveGeneralRulesCache
 *
 * Tests: `npm run test:general-rules-domain`
 * Registry: `.ai/docs/testing.md`
 */

import {
  CONTENT_POLICY_BLOCKED_WORD_MESSAGE,
  CONTENT_POLICY_WEAK_PASSWORD_MESSAGE,
  type ContentPolicyBlockedWordEntry,
} from "@shared/constants/contentPolicy";
import {
  buildDefaultBlockedWordsSeed,
  buildDefaultTelegramMessageTemplates,
  buildDefaultWeakPasswordsSeed,
  DEFAULT_BLOCKED_WORD_USER_MESSAGE,
  DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
  type TelegramMessageTemplateKey,
} from "@shared/constants/generalRules";
import {
  buildDefaultTelegramMessageTemplatesByLocale,
  normalizeTelegramMessagesByLocale,
} from "@shared/constants/botMessageDefaults";
import type { BotLocale } from "@shared/constants/botLocales";
import { DEFAULT_BOT_LOCALE } from "@shared/constants/botLocales";
import { normalizeContentPolicyText } from "@shared/lib/contentPolicy";

/** Effective rules snapshot used by sync scanners and Telegram outbound copy. */
export interface EffectiveGeneralRules {
  /** Blocklist entries (raw + pre-normalised terms). */
  blockedWords: readonly ContentPolicyBlockedWordEntry[];
  /** Pre-normalised blocked terms for fast scanning. */
  normalizedBlockedTerms: readonly {
    term: string;
    category?: ContentPolicyBlockedWordEntry["category"];
  }[];
  /** Weak password denylist (lowercase). */
  weakPasswords: readonly string[];
  /** Compiled weak-password lookup set. */
  weakPasswordSet: ReadonlySet<string>;
  /** User-facing blocked-language message. */
  blockedWordMessage: string;
  /** User-facing weak-password message. */
  weakPasswordMessage: string;
  /** Telegram templates per locale. */
  telegramMessagesByLocale: Record<BotLocale, Record<TelegramMessageTemplateKey, string>>;
  /** @deprecated English-only alias — use {@link telegramMessagesByLocale}.en */
  telegramMessages: Record<TelegramMessageTemplateKey, string>;
}

const CACHE_TTL_MS = 60_000;

let cachedRules: EffectiveGeneralRules | null = null;
let cacheExpiresAt = 0;

/**
 * Build effective rules purely from code constants (cold-start fallback).
 *
 * @returns Constant-backed rules snapshot.
 */
export function buildEffectiveGeneralRulesFromConstants(): EffectiveGeneralRules {
  const telegramMessagesByLocale = buildDefaultTelegramMessageTemplatesByLocale();
  return buildEffectiveGeneralRulesSnapshot({
    blockedWords: buildDefaultBlockedWordsSeed(),
    weakPasswords: buildDefaultWeakPasswordsSeed(),
    blockedWordMessage: DEFAULT_BLOCKED_WORD_USER_MESSAGE,
    weakPasswordMessage: DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
    telegramMessagesByLocale,
  });
}

/**
 * Compile a rules snapshot from raw persisted values.
 *
 * @param input - Raw lists and messages.
 * @returns Effective rules for scanners and bot copy.
 */
export function buildEffectiveGeneralRulesSnapshot(input: {
  blockedWords: readonly ContentPolicyBlockedWordEntry[];
  weakPasswords: readonly string[];
  blockedWordMessage: string;
  weakPasswordMessage: string;
  telegramMessagesByLocale: Record<BotLocale, Record<TelegramMessageTemplateKey, string>>;
}): EffectiveGeneralRules {
  const blockedWords = input.blockedWords
    .map((entry) => ({
      term: entry.term.trim(),
      category: entry.category,
    }))
    .filter((entry) => entry.term.length > 0);

  const normalizedBlockedTerms = blockedWords
    .map((entry) => ({
      term: normalizeContentPolicyText(entry.term),
      category: entry.category,
    }))
    .filter((entry) => entry.term.length > 0);

  const weakPasswords = input.weakPasswords
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return {
    blockedWords,
    normalizedBlockedTerms,
    weakPasswords,
    weakPasswordSet: new Set(weakPasswords),
    blockedWordMessage: input.blockedWordMessage.trim() || CONTENT_POLICY_BLOCKED_WORD_MESSAGE,
    weakPasswordMessage:
      input.weakPasswordMessage.trim() || CONTENT_POLICY_WEAK_PASSWORD_MESSAGE,
    telegramMessagesByLocale: {
      en: { ...input.telegramMessagesByLocale.en },
      uk: { ...input.telegramMessagesByLocale.uk },
    },
    telegramMessages: { ...input.telegramMessagesByLocale[DEFAULT_BOT_LOCALE] },
  };
}

/**
 * Return cached effective rules or constant fallback when cache is cold/expired.
 *
 * @returns Rules snapshot safe for synchronous scans.
 */
export function getEffectiveGeneralRulesSync(): EffectiveGeneralRules {
  if (cachedRules && Date.now() < cacheExpiresAt) {
    return cachedRules;
  }
  return buildEffectiveGeneralRulesFromConstants();
}

/**
 * Store effective rules in the in-process cache.
 *
 * @param rules - Compiled snapshot from {@link GeneralRulesDomain}.
 */
export function setEffectiveGeneralRulesCache(rules: EffectiveGeneralRules): void {
  cachedRules = rules;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}

/** Drop cached rules — call after admin saves new settings. */
export function invalidateEffectiveGeneralRulesCache(): void {
  cachedRules = null;
  cacheExpiresAt = 0;
}
