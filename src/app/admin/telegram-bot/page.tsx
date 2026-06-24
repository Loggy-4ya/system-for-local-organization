/**
 * @fileoverview Admin page for institutional Telegram bot message templates.
 *
 * @module src/app/admin/telegram-bot/page
 */

import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { TelegramBotMessagesEditorShell } from "@/components/admin/TelegramBotMessagesEditorShell";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/**
 * Telegram bot templates admin page — `/admin/telegram-bot`.
 *
 * @returns Server-rendered Telegram bot message editor.
 */
export default async function TelegramBotAdminPage() {
  await requireLegacyAdminPage("/admin/telegram-bot");

  const doc = await GeneralRulesDomain.loadOrSeed();
  const config = GeneralRulesDomain.toPublicConfig(doc);

  return <TelegramBotMessagesEditorShell initialConfig={config} />;
}
