/**
 * @fileoverview Server-only Telegram bot locale resolution with MongoDB lookup.
 *
 * Kept separate from {@link resolveBotLocale} so client components can import
 * pure locale helpers without pulling Mongoose into the browser bundle.
 *
 * @module shared/lib/resolveTelegramBotLocaleForUser
 */

import User from "@shared/models/User";
import type { BotLocale } from "@shared/constants/botLocales";
import { resolveBotLocale } from "@shared/lib/resolveBotLocale";

/**
 * Resolve bot locale for an inbound Telegram update or outbound DM.
 *
 * Loads `preferredLocale` from MongoDB when only `telegramUserId` is known.
 *
 * @param options - Telegram user id, optional cached preference, and client language code.
 * @returns Resolved locale for template selection.
 */
export async function resolveTelegramBotLocaleForUser(options: {
  telegramUserId?: number | null;
  preferredLocale?: string | null;
  languageCode?: string | null;
}): Promise<BotLocale> {
  if (options.preferredLocale != null) {
    return resolveBotLocale({
      preferredLocale: options.preferredLocale,
      telegramLanguageCode: options.languageCode,
    });
  }

  if (options.telegramUserId != null) {
    const user = await User.findOne({ telegramId: options.telegramUserId })
      .select("preferredLocale")
      .lean();
    return resolveBotLocale({
      preferredLocale: user?.preferredLocale ?? null,
      telegramLanguageCode: options.languageCode,
    });
  }

  return resolveBotLocale({ telegramLanguageCode: options.languageCode });
}
