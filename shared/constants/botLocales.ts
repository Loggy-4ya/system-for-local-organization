/**
 * @fileoverview Supported locales for Telegram bot and shared notification copy.
 *
 * Kept in `shared/` so workers and web resolve the same locale codes.
 *
 * @module shared/constants/botLocales
 */

/** Supported bot / notification locales — mirrors web `en` and `uk`. */
export const BOT_LOCALES = ["en", "uk"] as const;

/** Bot locale union type. */
export type BotLocale = (typeof BOT_LOCALES)[number];

/** Default bot locale when nothing else matches. */
export const DEFAULT_BOT_LOCALE: BotLocale = "en";
