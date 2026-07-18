/**
 * @fileoverview Telegram formatting for page go-live notifications.
 *
 * @module shared/lib/telegramPagePublishFormat
 *
 * Tests: `npm run test:page-publish-notification`
 * Registry: `.ai/docs/testing.md`
 */

import { interpolateTelegramMessageTemplate } from "@shared/constants/generalRules";
import type { BotLocale } from "@shared/constants/botLocales";
import { DEFAULT_BOT_LOCALE } from "@shared/constants/botLocales";
import { getEffectiveGeneralRulesSync } from "@shared/lib/effectiveGeneralRulesCache";

/**
 * Format a page go-live notification for Telegram DM delivery.
 *
 * @param title - Notification headline (includes page title).
 * @param body - Supporting summary text.
 * @param pageUrl - Absolute or relative open link.
 * @param locale - Recipient locale for template selection.
 * @returns Telegram-safe plain text.
 */
export function formatTelegramPagePublishedMessage(
  title: string,
  body: string,
  pageUrl: string,
  locale: BotLocale = DEFAULT_BOT_LOCALE,
): string {
  const template =
    getEffectiveGeneralRulesSync().telegramMessagesByLocale[locale].pagePublishedAnnouncement;
  return interpolateTelegramMessageTemplate(template, {
    title: title.trim(),
    body: body.trim(),
    url: pageUrl.trim(),
  });
}
