/**
 * @fileoverview Telegram Bot API webhook dispatch for Project Nexus.
 *
 * Handles inbound bot updates (`/start`, `/link`, task commands in DM and linked groups).
 * Group auto-creation extends via {@link TelegramWorkspaceDomain} + MTProto worker.
 *
 * @module shared/domains/TelegramBotDomain
 */

import { normalizeTelegramUserId } from "@shared/lib/telegramContactHarvestLogic";
import {
  isTelegramBotCommandMessage,
  isTelegramReportWizardControlCommand,
  parseTelegramBotCommand,
  shouldCancelTelegramBotSessionForCommand,
} from "@shared/lib/telegramBotCommandLogic";
import {
  interpolateTelegramMessageTemplate,
} from "@shared/constants/generalRules";
import type { BotLocale } from "@shared/constants/botLocales";
import { resolveTelegramBotLocaleForUser } from "@shared/lib/resolveTelegramBotLocaleForUser";
import { telegramBotInlineCopy } from "@shared/lib/telegramBotInlineCopy";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import {
  TelegramBotTaskDomain,
  type TelegramInboundMediaFile,
} from "@shared/domains/TelegramBotTaskDomain";
import { TelegramBotUserDomain } from "@shared/domains/TelegramBotUserDomain";
import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";

/** Bot commands that require a registered, profile-complete Nexus user. */
const TELEGRAM_BOT_TASK_COMMANDS = new Set([
  "/tasks",
  "/task_report",
  "/see_report",
  "/completed",
]);

/** Minimal Telegram Bot API user shape on inbound messages. */
export interface TelegramBotUser {
  /** Numeric Telegram user id. */
  id: number;
  /** First name from Telegram profile. */
  first_name: string;
  /** Optional @username without at-sign. */
  username?: string;
  /** Telegram client language tag (e.g. `uk`, `en`). */
  language_code?: string;
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

/** Telegram shared contact on inbound messages. */
export interface TelegramBotContact {
  /** Phone number in E.164-style formatting. */
  phone_number?: string;
  /** Optional vCard when Telegram omits `phone_number`. */
  vcard?: string;
  /** Telegram user id when the contact is a registered Telegram user. */
  user_id?: number | string;
  /** Contact given name. */
  first_name?: string;
}

/** Telegram photo size entry. */
export interface TelegramBotPhotoSize {
  /** Bot API file id. */
  file_id: string;
  /** MIME type when present. */
  mime_type?: string;
}

/** Telegram video attachment. */
export interface TelegramBotVideo {
  /** Bot API file id. */
  file_id: string;
  /** MIME type when present. */
  mime_type?: string;
  /** Original filename when present. */
  file_name?: string;
}

/** Telegram document attachment. */
export interface TelegramBotDocument {
  /** Bot API file id. */
  file_id: string;
  /** MIME type when present. */
  mime_type?: string;
  /** Original filename when present. */
  file_name?: string;
}

/** Telegram Bot API message update payload. */
export interface TelegramBotMessage {
  /** Chat reference. */
  chat: TelegramBotChat;
  /** Sender profile. */
  from?: TelegramBotUser;
  /** Message text body. */
  text?: string;
  /** Shared contact card when the user taps request_contact. */
  contact?: TelegramBotContact;
  /** Photo sizes — largest is typically last. */
  photo?: TelegramBotPhotoSize[];
  /** Video attachment. */
  video?: TelegramBotVideo;
  /** Generic document attachment. */
  document?: TelegramBotDocument;
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
    if (!message?.chat?.id || !message.from?.id) return false;

    if (message.contact) {
      await TelegramBotDomain.handleContactMessage(botToken, message);
      return true;
    }

    const chatId = message.chat.id;
    const chatType = message.chat.type ?? "private";
    const telegramUserId = message.from.id;
    const text = message.text?.trim();

    if (text && isTelegramBotCommandMessage(text)) {
      const parsed = parseTelegramBotCommand(text);
      if (!parsed) return false;

      if (parsed.name === "/cancel") {
        const reply = await TelegramBotTaskDomain.handleCancelCommand(chatId, telegramUserId);
        await TelegramBotDomain.replyText(botToken, chatId, reply);
        return true;
      }

      if (isTelegramReportWizardControlCommand(parsed.name)) {
        const registrationOk = await TelegramBotDomain.ensureBotUserReadyForWork(
          botToken,
          chatId,
          telegramUserId,
          message.from?.language_code,
        );
        if (!registrationOk) return true;

        const reply = await TelegramBotTaskDomain.handleWizardControlCommand(
          chatId,
          telegramUserId,
          parsed.name as "/done" | "/skip",
        );
        if (reply) {
          await TelegramBotDomain.replyText(botToken, chatId, reply);
          return true;
        }
      }

      let sessionDiscarded = false;
      if (shouldCancelTelegramBotSessionForCommand(parsed.name)) {
        sessionDiscarded = await TelegramBotTaskDomain.cancelSessionIfAny(
          chatId,
          telegramUserId,
        );
      }

      if (parsed.name === "/start") {
        if (sessionDiscarded) {
          const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
          await TelegramBotDomain.replyText(
            botToken,
            chatId,
            settings.taskReportSessionInterruptedTemplate,
          );
        }
        await TelegramBotDomain.handleStartCommand(botToken, message);
        return true;
      }

      if (parsed.name === "/phone") {
        if (sessionDiscarded) {
          const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
          await TelegramBotDomain.replyText(
            botToken,
            chatId,
            settings.taskReportSessionInterruptedTemplate,
          );
        }
        await TelegramBotDomain.handlePhoneCommand(botToken, message);
        return true;
      }

      if (parsed.name === "/link") {
        if (sessionDiscarded) {
          const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
          await TelegramBotDomain.replyText(
            botToken,
            chatId,
            settings.taskReportSessionInterruptedTemplate,
          );
        }
        await TelegramBotDomain.handleLinkCommand(botToken, message);
        return true;
      }

      const settings = sessionDiscarded
        ? await TelegramWorkspaceDomain.loadOrSeedSettings()
        : null;

      if (TELEGRAM_BOT_TASK_COMMANDS.has(parsed.name)) {
        const registrationOk = await TelegramBotDomain.ensureBotUserReadyForWork(
          botToken,
          chatId,
          telegramUserId,
          message.from?.language_code,
        );
        if (!registrationOk) {
          if (sessionDiscarded && settings) {
            await TelegramBotDomain.replyText(
              botToken,
              chatId,
              settings.taskReportSessionInterruptedTemplate,
            );
          }
          return true;
        }
      }

      const reply = await TelegramBotDomain.dispatchCommand(
        botToken,
        message,
        parsed.name,
        parsed.arg,
      );
      if (reply == null) return false;

      const prefix =
        sessionDiscarded && settings
          ? `${settings.taskReportSessionInterruptedTemplate}\n\n`
          : "";
      await TelegramBotDomain.replyText(botToken, chatId, `${prefix}${reply}`);
      return true;
    }

    const mediaFile = extractTelegramInboundMedia(message);
    if (text || mediaFile) {
      const registrationOk = await TelegramBotDomain.ensureBotUserReadyForWork(
        botToken,
        chatId,
        telegramUserId,
        message.from?.language_code,
      );
      if (!registrationOk) return true;

      const reply = await TelegramBotTaskDomain.handleSessionPayload(
        chatId,
        telegramUserId,
        {
          text,
          mediaFile: mediaFile ?? undefined,
        },
        (file, taskId) => TelegramBotTaskDomain.uploadTelegramMediaFile(botToken, file, taskId),
      );
      if (reply) {
        await TelegramBotDomain.replyText(botToken, chatId, reply);
        return true;
      }
    }

    return false;
  },

  /**
   * Route a parsed slash command to the appropriate handler.
   *
   * @param botToken - BotFather token.
   * @param message - Inbound message.
   * @param commandName - Normalised command name.
   * @param arg - Optional argument string.
   * @returns Reply text or null when unhandled.
   */
  async dispatchCommand(
    botToken: string,
    message: TelegramBotMessage,
    commandName: string,
    arg?: string,
  ): Promise<string | null> {
    void botToken;
    const chatId = message.chat.id;
    const chatType = message.chat.type ?? "private";
    const telegramUserId = message.from?.id;
    if (!telegramUserId) return "Could not identify the sender.";

    if (commandName === "/tasks") {
      return TelegramBotTaskDomain.buildTasksMessage(chatId, chatType, telegramUserId);
    }

    if (commandName === "/task_report") {
      const result = await TelegramBotTaskDomain.handleTaskReportCommand(
        chatId,
        chatType,
        telegramUserId,
        arg,
      );
      return result.text;
    }

    if (commandName === "/completed") {
      return TelegramBotTaskDomain.handleCompletedCommand(
        chatId,
        chatType,
        telegramUserId,
        arg,
      );
    }

    if (commandName === "/see_report") {
      return TelegramBotTaskDomain.handleSeeReportCommand(
        chatId,
        chatType,
        telegramUserId,
        arg,
      );
    }

    return null;
  },

  /**
   * Send a plain-text reply to a chat.
   *
   * @param botToken - BotFather token.
   * @param chatId - Target chat id.
   * @param text - Message body.
   */
  async replyText(botToken: string, chatId: number, text: string): Promise<void> {
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chatId,
      text,
    });
  },

  /**
   * Verify the sender is a registered Nexus user with a complete profile.
   *
   * When not ready, sends a Mini App prompt to register or finish onboarding.
   *
   * @param botToken - BotFather token.
   * @param chatId - Telegram chat id.
   * @param telegramUserId - Sender Telegram id.
   * @returns True when bot task commands may proceed.
   */
  async ensureBotUserReadyForWork(
    botToken: string,
    chatId: number,
    telegramUserId: number,
    languageCode?: string | null,
  ): Promise<boolean> {
    const resolution = await TelegramBotUserDomain.resolve(telegramUserId);
    if (resolution.kind === "ready") return true;

    await GeneralRulesDomain.ensureLoaded();
    const locale = await resolveTelegramBotLocaleForUser({
      telegramUserId,
      languageCode,
    });
    const buttonLabel = await GeneralRulesDomain.getTelegramMessageTemplate(
      "startOpenButtonLabel",
      locale,
    );

    const templateKey =
      resolution.kind === "unknown" ? "botRegisterPrompt" : "botFinishRegistrationPrompt";
    const template = await GeneralRulesDomain.getTelegramMessageTemplate(templateKey, locale);
    const promptText = interpolateTelegramMessageTemplate(template, {
      missingFields: resolution.missingFieldLabels ?? "",
    });

    await TelegramBotDomain.sendMiniAppOpenButton(botToken, chatId, promptText, buttonLabel);
    return false;
  },

  /**
   * Reply with plain text and an inline Mini App open button.
   *
   * @param botToken - BotFather token.
   * @param chatId - Target chat id.
   * @param text - Message body.
   * @param buttonLabel - Inline keyboard label.
   */
  async sendMiniAppOpenButton(
    botToken: string,
    chatId: number,
    text: string,
    buttonLabel: string,
  ): Promise<void> {
    const miniAppUrl = resolveTelegramMiniAppUrl();
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chatId,
      text,
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
   * Reply to `/start` with Mini App open button.
   *
   * @param botToken - BotFather token.
   * @param message - Inbound message.
   */
  async handleStartCommand(botToken: string, message: TelegramBotMessage): Promise<void> {
    await GeneralRulesDomain.ensureLoaded();
    const senderId = message.from?.id;
    const locale = await resolveTelegramBotLocaleForUser({
      telegramUserId: senderId,
      languageCode: message.from?.language_code,
    });
    const welcomeText = await GeneralRulesDomain.getTelegramMessageTemplate("startWelcome", locale);
    const buttonLabel = await GeneralRulesDomain.getTelegramMessageTemplate(
      "startOpenButtonLabel",
      locale,
    );

    let followUp: string | null = null;
    if (senderId != null) {
      const resolution = await TelegramBotUserDomain.resolve(senderId);
      if (resolution.kind === "unknown") {
        followUp = await GeneralRulesDomain.getTelegramMessageTemplate("botRegisterPrompt", locale);
      } else if (resolution.kind === "incomplete") {
        const template = await GeneralRulesDomain.getTelegramMessageTemplate(
          "botFinishRegistrationPrompt",
          locale,
        );
        followUp = interpolateTelegramMessageTemplate(template, {
          missingFields: resolution.missingFieldLabels ?? "",
        });
      }
    }

    const miniAppUrl = resolveTelegramMiniAppUrl();
    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: message.chat.id,
      text: followUp ? `${welcomeText}\n\n${followUp}` : welcomeText,
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

    if ((message.chat.type ?? "private") === "private") {
      await TelegramBotDomain.sendSharePhonePrompt(botToken, message.chat.id, {
        telegramUserId: senderId,
        languageCode: message.from?.language_code,
        locale,
      });
    }
  },

  /**
   * Re-send the share-phone reply keyboard (`/phone`).
   *
   * @param botToken - BotFather token.
   * @param message - Inbound private chat message.
   */
  async handlePhoneCommand(botToken: string, message: TelegramBotMessage): Promise<void> {
    const chatType = message.chat.type ?? "private";
    const locale = await resolveTelegramBotLocaleForUser({
      telegramUserId: message.from?.id,
      languageCode: message.from?.language_code,
    });
    if (chatType !== "private") {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: message.chat.id,
        text: telegramBotInlineCopy("sharePhonePrivateChatOnly", locale),
      });
      return;
    }

    await TelegramBotDomain.sendSharePhonePrompt(botToken, message.chat.id, {
      telegramUserId: message.from?.id,
      languageCode: message.from?.language_code,
      locale,
    });
  },

  /**
   * Persist a shared contact phone number and confirm to the user.
   *
   * @param botToken - BotFather token.
   * @param message - Inbound message carrying `contact`.
   */
  async handleContactMessage(botToken: string, message: TelegramBotMessage): Promise<void> {
    const chatType = message.chat.type ?? "private";
    if (chatType !== "private") {
      return;
    }

    if (!message.contact) {
      return;
    }

    const senderId = normalizeTelegramUserId(message.from?.id ?? message.contact.user_id);
    if (senderId == null) {
      return;
    }

    await GeneralRulesDomain.ensureLoaded();
    const locale = await resolveTelegramBotLocaleForUser({
      telegramUserId: senderId,
      languageCode: message.from?.language_code,
    });
    const savedText = await GeneralRulesDomain.getTelegramMessageTemplate("contactPhoneSaved", locale);
    const rejectedText = await GeneralRulesDomain.getTelegramMessageTemplate(
      "contactPhoneRejected",
      locale,
    );

    const result = await AuthDomain.absorbTelegramSharedContact(
      senderId,
      message.contact,
    );

    if (result.saved) {
      await callTelegramBotApi(botToken, "sendMessage", {
        chat_id: message.chat.id,
        text: savedText,
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: message.chat.id,
      text: rejectedText,
    });
    await TelegramBotDomain.sendSharePhonePrompt(botToken, message.chat.id, {
      telegramUserId: senderId,
      languageCode: message.from?.language_code,
      locale,
    });
  },

  /**
   * Ask the user to share their phone via Telegram `request_contact` keyboard.
   *
   * @param botToken - BotFather token.
   * @param chatId - Private chat id.
   * @param options - Optional sender metadata for locale resolution.
   */
  async sendSharePhonePrompt(
    botToken: string,
    chatId: number,
    options?: {
      telegramUserId?: number;
      languageCode?: string | null;
      locale?: BotLocale;
    },
  ): Promise<void> {
    await GeneralRulesDomain.ensureLoaded();
    const locale =
      options?.locale ??
      (await resolveTelegramBotLocaleForUser({
        telegramUserId: options?.telegramUserId,
        languageCode: options?.languageCode,
      }));
    const promptText = await GeneralRulesDomain.getTelegramMessageTemplate(
      "startSharePhonePrompt",
      locale,
    );
    const buttonLabel = await GeneralRulesDomain.getTelegramMessageTemplate(
      "contactShareButtonLabel",
      locale,
    );

    await callTelegramBotApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: promptText,
      reply_markup: {
        keyboard: [[{ text: buttonLabel, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
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
      if (messageText === "LINKER_NOT_REGISTERED" && message.from?.id) {
        await TelegramBotDomain.ensureBotUserReadyForWork(
          botToken,
          chat.id,
          message.from.id,
          message.from.language_code,
        );
        return;
      }

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
};

/**
 * Extract the largest photo/video/document attachment from a Telegram message.
 *
 * @param message - Inbound Bot API message.
 * @returns Parsed media file or null.
 */
function extractTelegramInboundMedia(message: TelegramBotMessage): TelegramInboundMediaFile | null {
  if (message.video) {
    return {
      fileId: message.video.file_id,
      fileName: message.video.file_name,
      mimeType: message.video.mime_type,
      kind: "video",
    };
  }

  if (message.photo && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1];
    return {
      fileId: largest.file_id,
      mimeType: largest.mime_type ?? "image/jpeg",
      kind: "image",
    };
  }

  if (message.document) {
    const mime = message.document.mime_type ?? "";
    if (mime.startsWith("image/")) {
      return {
        fileId: message.document.file_id,
        fileName: message.document.file_name,
        mimeType: mime,
        kind: "image",
      };
    }
    if (mime.startsWith("video/")) {
      return {
        fileId: message.document.file_id,
        fileName: message.document.file_name,
        mimeType: mime,
        kind: "video",
      };
    }
  }

  return null;
}

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
