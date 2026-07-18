/**
 * @fileoverview Hard-coded Telegram bot strings not stored in General Rules templates.
 *
 * @module shared/lib/telegramBotInlineCopy
 */

import type { BotLocale } from "@shared/constants/botLocales";

/** Inline bot copy keys outside the admin template editor. */
export type TelegramBotInlineCopyKey = "sharePhonePrivateChatOnly";

const COPY: Record<TelegramBotInlineCopyKey, Record<BotLocale, string>> = {
  sharePhonePrivateChatOnly: {
    en: "Share your phone in a private chat with the bot.",
    uk: "Надішліть номер телефону в приватному чаті з ботом.",
  },
};

/**
 * Resolve a small set of fixed bot strings by locale.
 *
 * @param key - Inline copy key.
 * @param locale - Target locale.
 * @returns Localized plain text.
 */
export function telegramBotInlineCopy(
  key: TelegramBotInlineCopyKey,
  locale: BotLocale,
): string {
  return COPY[key][locale];
}
