/**
 * @fileoverview Telegram Mini App page — `/telegram`.
 *
 * Entry point configured in BotFather as the Web App URL.
 *
 * @module src/app/telegram/page
 */

import { TelegramMiniAppEntry } from "@/components/telegram/TelegramMiniAppEntry";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/**
 * Telegram Mini App route.
 *
 * @returns Mini App entry wrapped in the standard content band.
 */
export default function TelegramPage() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ?? null;
  const botConfigured = Boolean(botToken && botUsername);

  return (
    <StaticPageShell
      contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH}
      className="items-center justify-center py-8 md:py-12"
      innerClassName="w-full"
    >
      <TelegramMiniAppEntry botConfigured={botConfigured} botUsername={botUsername} />
    </StaticPageShell>
  );
}
