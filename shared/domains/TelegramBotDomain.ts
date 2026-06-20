/**
 * @fileoverview Telegram Bot API webhook dispatch for Project Nexus.
 *
 * Handles inbound bot updates (currently `/start` with Mini App open button).
 * Future group commands and workspace automation extend this domain.
 *
 * @module shared/domains/TelegramBotDomain
 */

/** Minimal Telegram Bot API user shape on inbound messages. */
export interface TelegramBotUser {
  /** Numeric Telegram user id. */
  id: number;
  /** First name from Telegram profile. */
  first_name: string;
  /** Optional @username without at-sign. */
  username?: string;
}

/** Telegram Bot API message update payload. */
export interface TelegramBotMessage {
  /** Chat id for replies. */
  chat: { id: number };
  /** Sender profile. */
  from?: TelegramBotUser;
  /** Message text body. */
  text?: string;
}

/** Telegram Bot API update envelope. */
export interface TelegramBotUpdate {
  /** Update id. */
  update_id: number;
  /** Optional inbound message. */
  message?: TelegramBotMessage;
}

/**
 * Resolve the public Mini App URL from environment.
 *
 * @returns Absolute HTTPS/HTTP URL to `/telegram`.
 * @throws When `NEXTAUTH_URL` is missing.
 */
export function resolveTelegramMiniAppUrl(): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXTAUTH_URL is required for Telegram Mini App links.");
  }
  return `${base}/telegram`;
}

/**
 * Telegram bot webhook and outbound messaging domain.
 */
export const TelegramBotDomain = {
  /**
   * Send a plain-text direct message to a Telegram user chat.
   *
   * @param botToken - BotFather token.
   * @param chatId - Telegram user/chat id (private DM uses numeric user id).
   * @param text - Message body (plain text).
   */
  async sendDirectMessage(botToken: string, chatId: number, text: string): Promise<void> {
    await sendTelegramMessage(botToken, chatId, { text });
  },

  /**
   * Dispatch a Telegram Bot API update.
   *
   * @param update - Parsed webhook JSON body.
   * @param botToken - BotFather token.
   * @returns Whether the update was handled.
   */
  async handleUpdate(update: TelegramBotUpdate, botToken: string): Promise<boolean> {
    const message = update.message;
    if (!message?.text || !message.chat?.id) return false;

    const command = message.text.trim().split(/\s+/)[0]?.toLowerCase();
    if (command !== "/start") return false;

    const miniAppUrl = resolveTelegramMiniAppUrl();
    await sendTelegramMessage(botToken, message.chat.id, {
      text: "Welcome to Nexus. Tap below to open the app.",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open Nexus",
              web_app: { url: miniAppUrl },
            },
          ],
        ],
      },
    });

    return true;
  },
};

/**
 * Send a message via the Telegram Bot API.
 *
 * @param botToken - BotFather token.
 * @param chatId - Target chat id.
 * @param body - Message payload.
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  body: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      ...body,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed (${res.status}): ${detail}`);
  }
}

export default TelegramBotDomain;
