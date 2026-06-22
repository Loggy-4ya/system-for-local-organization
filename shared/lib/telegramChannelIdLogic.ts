/**
 * @fileoverview Pure helpers converting Telegram Bot API chat ids and MTProto channel ids.
 *
 * @module shared/lib/telegramChannelIdLogic
 *
 * Tests: `npm run test:telegram-channel-id-logic`
 * Registry: `.ai/docs/testing.md`
 */

/**
 * Convert a GramJS channel id to Bot API supergroup chat id (`-100…`).
 *
 * @param channelId - Raw channel id from MTProto.
 * @returns Negative Bot API chat id.
 */
export function gramJsChannelIdToBotChatId(channelId: bigint | number): number {
  const id = typeof channelId === "bigint" ? channelId : BigInt(channelId);
  return Number(`-100${id.toString()}`);
}

/**
 * Convert a Bot API supergroup chat id to a GramJS channel id.
 *
 * @param chatId - Negative Bot API supergroup id.
 * @returns MTProto channel id.
 * @throws When the chat id is not a supergroup id.
 */
export function botChatIdToGramJsChannelId(chatId: number): bigint {
  const raw = String(chatId);
  if (raw.startsWith("-100")) {
    return BigInt(raw.slice(4));
  }
  if (raw.startsWith("-")) {
    return BigInt(raw.slice(1));
  }
  throw new Error("INVALID_SUPERGROUP_CHAT_ID");
}

/**
 * Extract the invite hash from a Telegram `t.me/+…` or `joinchat` URL.
 *
 * @param inviteLink - Public or private invite link.
 * @returns Invite hash or null when not parseable.
 */
export function extractTelegramInviteHash(inviteLink: string): string | null {
  const trimmed = inviteLink.trim();
  const plusMatch = trimmed.match(/t\.me\/\+([A-Za-z0-9_-]+)/i);
  if (plusMatch?.[1]) return plusMatch[1];
  const joinMatch = trimmed.match(/joinchat\/([A-Za-z0-9_-]+)/i);
  if (joinMatch?.[1]) return joinMatch[1];
  return null;
}
