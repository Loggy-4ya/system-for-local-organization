/**
 * @fileoverview Normalise Telegram bot usernames for Login Widget attributes.
 *
 * BotFather and `.env` values sometimes include a leading `@`; the widget expects
 * the bare username only.
 *
 * @module shared/lib/telegramBotUsername
 */

/**
 * Strip a leading `@` and surrounding whitespace from a Telegram bot username.
 *
 * @param username - Raw username from env or BotFather.
 * @returns Normalised username without `@`, or empty string when unset.
 */
export function normalizeTelegramBotUsername(username: string | undefined | null): string {
  return (username ?? "").trim().replace(/^@+/, "");
}
