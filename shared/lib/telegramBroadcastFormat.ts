/**
 * @fileoverview Telegram broadcast formatting using general-rules templates.
 *
 * @module shared/lib/telegramBroadcastFormat
 *
 * Tests: `npm run test:general-rules-domain`
 * Registry: `.ai/docs/testing.md`
 */

import { interpolateTelegramMessageTemplate } from "@shared/constants/generalRules";
import type { BotLocale } from "@shared/constants/botLocales";
import { DEFAULT_BOT_LOCALE } from "@shared/constants/botLocales";
import { getEffectiveGeneralRulesSync } from "@shared/lib/effectiveGeneralRulesCache";

/**
 * Format an institution broadcast for Telegram DM delivery.
 *
 * @param title - Optional headline.
 * @param body - Message body.
 * @param locale - Recipient locale for template selection.
 * @returns Telegram-safe plain text.
 */
export function formatTelegramBroadcastMessage(
  title: string | null,
  body: string,
  locale: BotLocale = DEFAULT_BOT_LOCALE,
): string {
  const trimmedBody = body.trim();
  const trimmedTitle = title?.trim() ?? "";

  if (trimmedTitle) {
    const template =
      getEffectiveGeneralRulesSync().telegramMessagesByLocale[locale].broadcastAnnouncementPrefix;
    return interpolateTelegramMessageTemplate(template, {
      title: trimmedTitle,
      body: trimmedBody,
    });
  }

  return locale === "uk" ? `📢 ${trimmedBody}` : `📢 ${trimmedBody}`;
}
