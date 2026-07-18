/**
 * @fileoverview Resolve the active locale for Telegram bot replies and outbound DMs.
 *
 * Priority: linked user `preferredLocale` → Telegram `language_code` → default `en`.
 *
 * @module shared/lib/resolveBotLocale
 */

import {
  BOT_LOCALES,
  DEFAULT_BOT_LOCALE,
  type BotLocale,
} from "@shared/constants/botLocales";

/**
 * Normalize an arbitrary language tag to a supported bot locale.
 *
 * @param languageCode - Telegram `language_code` or browser locale tag.
 * @returns Supported locale or `null` when no match.
 */
export function normalizeBotLocale(languageCode: string | null | undefined): BotLocale | null {
  if (!languageCode) return null;

  const normalized = languageCode.trim().toLowerCase().replace("_", "-");
  if (!normalized) return null;

  if (normalized === "uk" || normalized.startsWith("uk-")) {
    return "uk";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return null;
}

/**
 * Resolve bot locale from user preference and Telegram language metadata.
 *
 * @param options - Optional user preference and Telegram language code.
 * @returns Resolved locale — always one of {@link BOT_LOCALES}.
 */
export function resolveBotLocale(options?: {
  preferredLocale?: string | null;
  telegramLanguageCode?: string | null;
}): BotLocale {
  const preferred = normalizeBotLocale(options?.preferredLocale);
  if (preferred) {
    return preferred;
  }

  const telegram = normalizeBotLocale(options?.telegramLanguageCode);
  if (telegram) {
    return telegram;
  }

  return DEFAULT_BOT_LOCALE;
}

/**
 * Type guard for persisted locale strings.
 *
 * @param value - Candidate locale code.
 * @returns True when value is a supported bot locale.
 */
export function isBotLocale(value: string): value is BotLocale {
  return (BOT_LOCALES as readonly string[]).includes(value);
}
