/**
 * @fileoverview Pure helpers for parsing Telegram bot commands.
 *
 * @module shared/lib/telegramBotCommandLogic
 *
 * Tests: `npm run test:telegram-bot-command-logic`
 * Registry: `.ai/docs/testing.md`
 */

/** Parsed slash command from a Telegram text message. */
export interface ParsedTelegramBotCommand {
  /** Normalised command name including leading slash, e.g. `/tasks`. */
  name: string;
  /** Remaining argument text after the command token. */
  arg?: string;
}

/**
 * Whether a message body starts with a Telegram bot command token.
 *
 * @param text - Raw message text.
 * @returns True when the first token looks like `/command`.
 */
export function isTelegramBotCommandMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return false;
  const token = trimmed.split(/\s+/)[0] ?? "";
  return /^\/[a-z0-9_]+(?:@[a-z0-9_]+)?$/i.test(token);
}

/**
 * Parse a Telegram text message into command name and optional argument.
 *
 * Strips the `@BotUsername` suffix Telegram appends in groups.
 *
 * @param text - Raw message text.
 * @returns Parsed command or null when the body is not a command.
 */
export function parseTelegramBotCommand(text: string): ParsedTelegramBotCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.split(/\s+/);
  const rawToken = parts[0]?.toLowerCase();
  if (!rawToken) return null;

  const commandName = rawToken.split("@")[0];
  if (!commandName.startsWith("/")) return null;

  const arg = parts.slice(1).join(" ").trim();
  return {
    name: commandName,
    arg: arg || undefined,
  };
}

/**
 * Commands that advance an in-progress report wizard instead of cancelling it.
 *
 * @param commandName - Normalised command including `/`.
 * @returns True for wizard control commands.
 */
export function isTelegramReportWizardControlCommand(commandName: string): boolean {
  return commandName === "/done" || commandName === "/skip";
}

/**
 * Whether a command should cancel an active bot wizard before running.
 *
 * @param commandName - Normalised command including `/`.
 * @returns True when an existing draft must be discarded first.
 */
export function shouldCancelTelegramBotSessionForCommand(commandName: string): boolean {
  if (commandName === "/cancel") return false;
  if (isTelegramReportWizardControlCommand(commandName)) return false;
  return true;
}
