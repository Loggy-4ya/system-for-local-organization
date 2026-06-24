/**
 * @fileoverview Telegram formatting for page go-live notifications.
 *
 * @module shared/lib/telegramPagePublishFormat
 *
 * Tests: `npm run test:page-publish-notification`
 * Registry: `.ai/docs/testing.md`
 */

import { interpolateTelegramMessageTemplate } from "@shared/constants/generalRules";
import { getEffectiveGeneralRulesSync } from "@shared/lib/effectiveGeneralRulesCache";

/**
 * Format a page go-live notification for Telegram DM delivery.
 *
 * Uses the `pagePublishedAnnouncement` template from general rules.
 *
 * @param title - Notification headline (includes page title).
 * @param body - Supporting summary text.
 * @param pageUrl - Absolute or relative open link.
 * @returns Telegram-safe plain text.
 */
export function formatTelegramPagePublishedMessage(
  title: string,
  body: string,
  pageUrl: string,
): string {
  const template = getEffectiveGeneralRulesSync().telegramMessages.pagePublishedAnnouncement;
  return interpolateTelegramMessageTemplate(template, {
    title: title.trim(),
    body: body.trim(),
    url: pageUrl.trim(),
  });
}
