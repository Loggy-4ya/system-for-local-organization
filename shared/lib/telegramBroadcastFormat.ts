/**
 * @fileoverview Telegram broadcast formatting using general-rules templates.
 *
 * @module shared/lib/telegramBroadcastFormat
 *
 * Tests: `npm run test:general-rules-domain`
 * Registry: `.ai/docs/testing.md`
 */

import { interpolateTelegramMessageTemplate } from "@shared/constants/generalRules";
import { getEffectiveGeneralRulesSync } from "@shared/lib/effectiveGeneralRulesCache";

/**
 * Format an institution broadcast for Telegram DM delivery.
 *
 * Uses the `broadcastAnnouncementPrefix` template from general rules when a
 * title is present; otherwise sends a simple announcement line.
 *
 * @param title - Optional headline.
 * @param body - Message body.
 * @returns Telegram-safe plain text.
 */
export function formatTelegramBroadcastMessage(title: string | null, body: string): string {
  const trimmedBody = body.trim();
  const trimmedTitle = title?.trim() ?? "";

  if (trimmedTitle) {
    const template =
      getEffectiveGeneralRulesSync().telegramMessages.broadcastAnnouncementPrefix;
    return interpolateTelegramMessageTemplate(template, {
      title: trimmedTitle,
      body: trimmedBody,
    });
  }

  return `📢 ${trimmedBody}`;
}
