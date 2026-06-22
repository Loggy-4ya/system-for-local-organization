/**
 * @fileoverview Telegram Bot API webhook dispatch for Project Nexus.
 *
 * Handles inbound bot updates (`/start`, `/link`, `/status`, `/task_done` for project workspaces).
 * Group auto-creation extends via {@link TelegramWorkspaceDomain} + MTProto worker.
 *
 * @module shared/domains/TelegramBotDomain
 */

import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { TelegramGroupCommandDomain } from "@shared/domains/TelegramGroupCommandDomain";
import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";

/** Minimal Telegram Bot API user shape on inbound messages. */
export interface TelegramBotUser {
  /** Numeric Telegram user id. */
  id: number;
  /** First name from Telegram profile. */
  first_name: string;
  /** Optional @username without at-sign. */
  username?: string;
}

/** Telegram chat reference on inbound messages. */
export interface TelegramBotChat {
  /** Chat id — negative for groups/supergroups. */
  id: number;
  /** Chat type. */
  type?: string;
  /** Chat title for groups. */
  title?: string;
}

/** Telegram Bot API message update payload. */
export interface TelegramBotMessage {
  /** Chat reference. */
  chat: TelegramBotChat;
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
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chatId,
      text,
    });
  },

  /**
   * Send a plain-text message to a group or supergroup.
   *
   * @param botToken - BotFather token.
   * @param chatId - Group chat id.
   * @param text - Message body.
   */
  async sendGroupMessage(botToken: string, chatId: number, text: string): Promise<void> {
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: undefined,
    });
  },

  /**
   * Leave a group chat.
   *
   * @param botToken - BotFather token.
   * @param chatId - Group chat id.
   */
  async leaveChat(botToken: string, chatId: number): Promise<void> {
    await callTelegramBotApi(botToken, "leaveChat", { chat_id: chatId });
  },

  /**
   * Fetch chat metadata from Telegram.
   *
   * @param botToken - BotFather token.
   * @param chatId - Chat id.
   * @returns Chat object from Bot API.
   */
  async getChat(
    botToken: string,
    chatId: number,
  ): Promise<{ title?: string; invite_link?: string; is_forum?: boolean }> {
    const data = await callTelegramBotApi<{
      result?: { title?: string; invite_link?: string; is_forum?: boolean };
    }>(
      botToken,
      "getChat",
      { chat_id: chatId },
    );
    return data.result ?? {};
  },

  /**
   * Create a forum topic branch in a supergroup with topics enabled.
   *
   * @param botToken - BotFather token.
   * @param chatId - Forum supergroup chat id.
   * @param name - Topic title (max 128 chars).
   * @returns Telegram `message_thread_id` for the new topic.
   */
  async createForumTopic(botToken: string, chatId: number, name: string): Promise<number> {
    const data = await callTelegramBotApi<{
      result?: { message_thread_id?: number };
    }>(botToken, "createForumTopic", {
      chat_id: chatId,
      name: name.slice(0, 128),
    });
    const topicId = data.result?.message_thread_id;
    if (topicId == null) {
      throw new Error("createForumTopic returned no message_thread_id.");
    }
    return topicId;
  },

  /**
   * Post a plain-text message inside a forum topic thread.
   *
   * @param botToken - BotFather token.
   * @param chatId - Forum supergroup chat id.
   * @param messageThreadId - Topic thread id from {@link createForumTopic}.
   * @param text - Message body.
   */
  async sendGroupTopicMessage(
    botToken: string,
    chatId: number,
    messageThreadId: number,
    text: string,
  ): Promise<void> {
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chatId,
      message_thread_id: messageThreadId,
      text,
    });
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
    if (command === "/start") {
      await TelegramBotDomain.handleStartCommand(botToken, message);
      return true;
    }

    if (command === "/link") {
      await TelegramBotDomain.handleLinkCommand(botToken, message);
      return true;
    }

    if (command === "/status") {
      await TelegramBotDomain.handleStatusCommand(botToken, message);
      return true;
    }

    if (command === "/task_done") {
      await TelegramBotDomain.handleTaskDoneCommand(botToken, message);
      return true;
    }

    return false;
  },

  /**
   * Reply to `/start` with Mini App open button.
   *
   * @param botToken - BotFather token.
   * @param message - Inbound message.
   */
  async handleStartCommand(botToken: string, message: TelegramBotMessage): Promise<void> {
    await GeneralRulesDomain.ensureLoaded();
    const welcomeText = await GeneralRulesDomain.getTelegramMessageTemplate("startWelcome");
    const buttonLabel = await GeneralRulesDomain.getTelegramMessageTemplate("startOpenButtonLabel");
    const miniAppUrl = resolveTelegramMiniAppUrl();
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: message.chat.id,
      text: welcomeText,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: buttonLabel,
              web_app: { url: miniAppUrl },
            },
          ],
        ],
      },
    });
  },

  /**
   * Bind a group chat to a Nexus project via `/link <token>`.
   *
   * @param botToken - BotFather token.
   * @param message - Inbound group message.
   */
  async handleLinkCommand(botToken: string, message: TelegramBotMessage): Promise<void> {
    const chat = message.chat;
    const chatType = chat.type ?? "private";
    if (chatType !== "group" && chatType !== "supergroup") {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: "Run /link inside the project Telegram group, not in a private chat.",
      });
      return;
    }

    const parts = message.text?.trim().split(/\s+/) ?? [];
    const token = parts[1]?.trim();
    if (!token) {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: "Usage: /link <project-token> — copy the token from Nexus project settings.",
      });
      return;
    }

    if (!message.from?.id) {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: "Could not identify the sender.",
      });
      return;
    }

    try {
      const chatMeta = await TelegramBotDomain.getChat(botToken, chat.id);
      const groupId = await TelegramWorkspaceDomain.linkChatByToken(
        token,
        chat.id,
        chatMeta.title ?? chat.title ?? "Project group",
        message.from.id,
        chatMeta.invite_link ?? null,
      );

      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: `Linked to Nexus project. Open task parts in the web app or Mini App.`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open Nexus",
                web_app: { url: resolveTelegramMiniAppUrl() },
              },
            ],
          ],
        },
      });

      void groupId;
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Link failed.";
      const friendly =
        messageText === "LINK_TOKEN_NOT_FOUND"
          ? "Unknown link token. Copy the current token from Nexus project settings."
          : messageText === "LINKER_NOT_REGISTERED"
            ? "Link your Telegram account in Nexus profile settings first."
            : messageText === "FORBIDDEN"
              ? "Only the project author or a task dispatcher may link this group."
              : "Could not link this group. Check the token and try again.";
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: friendly,
      });
    }
  },

  /**
   * Reply with open project parts in a linked group (`/status`).
   *
   * @param botToken - BotFather token.
   * @param message - Inbound group message.
   */
  async handleStatusCommand(botToken: string, message: TelegramBotMessage): Promise<void> {
    const chat = message.chat;
    const chatType = chat.type ?? "private";
    if (chatType !== "group" && chatType !== "supergroup") {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: "/status works inside a linked project group.",
      });
      return;
    }

    const text = await TelegramGroupCommandDomain.buildStatusMessage(chat.id);
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chat.id,
      text: text ?? "This group is not linked to an active Nexus project.",
    });
  },

  /**
   * Performer submits a part via `/task_done [index|id]` in a linked group.
   *
   * @param botToken - BotFather token.
   * @param message - Inbound group message.
   */
  async handleTaskDoneCommand(botToken: string, message: TelegramBotMessage): Promise<void> {
    const chat = message.chat;
    const chatType = chat.type ?? "private";
    if (chatType !== "group" && chatType !== "supergroup") {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: "/task_done works inside a linked project group.",
      });
      return;
    }

    if (!message.from?.id) {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: chat.id,
        text: "Could not identify the sender.",
      });
      return;
    }

    const parts = message.text?.trim().split(/\s+/) ?? [];
    const arg = parts.slice(1).join(" ").trim() || undefined;
    const reply = await TelegramGroupCommandDomain.handleTaskDone(
      chat.id,
      message.from.id,
      arg,
    );

    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chat.id,
      text: reply,
    });
  },
};

/**
 * Call a Telegram Bot API method.
 *
 * @param botToken - BotFather token.
 * @param method - API method name.
 * @param body - JSON body.
 * @returns Parsed JSON response.
 */
async function callTelegramBotApi<T = unknown>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };

  if (!res.ok || json.ok === false) {
    throw new Error(
      `Telegram ${method} failed (${res.status}): ${json.description ?? "unknown error"}`,
    );
  }

  return json as T;
}

export default TelegramBotDomain;
