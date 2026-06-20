/**
 * @fileoverview Delivery channel identifiers for system-wide broadcasts.
 *
 * New channels (email, push, Discord, etc.) register here and gain a dispatcher
 * branch in {@link BroadcastDomain}.
 *
 * @module shared/constants/broadcastChannels
 */

/** Supported broadcast delivery channels. */
export const BROADCAST_CHANNELS = {
  /** In-app toast surfaced on the web dashboard after sign-in. */
  web_toast: "web_toast",
  /** Direct message via the Nexus Telegram bot. */
  telegram_dm: "telegram_dm",
} as const;

/** Union of registered broadcast channel slugs. */
export type BroadcastChannel = (typeof BROADCAST_CHANNELS)[keyof typeof BROADCAST_CHANNELS];

/** All channel slugs — used for validation and admin UI. */
export const ALL_BROADCAST_CHANNELS: BroadcastChannel[] = Object.values(BROADCAST_CHANNELS);

/** Human-readable labels for admin broadcast UI. */
export const BROADCAST_CHANNEL_LABELS: Record<BroadcastChannel, string> = {
  web_toast: "Web toast (in-app)",
  telegram_dm: "Telegram direct message",
};

/**
 * Validate a channel slug.
 *
 * @param value - Candidate channel string.
 * @returns True when registered.
 */
export function isBroadcastChannel(value: string): value is BroadcastChannel {
  return (ALL_BROADCAST_CHANNELS as string[]).includes(value);
}
