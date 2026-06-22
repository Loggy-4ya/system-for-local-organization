/**
 * @fileoverview Resolve contact channels for profile "Message" actions.
 *
 * Peers see public social links; PII (Telegram username, email) is included only
 * when the viewer may see contact fields per {@link canViewerSeeProfilePii}.
 *
 * @module shared/lib/profileContactLogic
 */

import type { IUserSocialLink } from "@shared/models/userTypes";

/** Supported outbound contact channel kinds on profile hero actions. */
export type ProfileContactChannelKind = "telegram" | "email";

/** One actionable contact channel for the profile hero. */
export interface ProfileContactChannel {
  /** Channel kind — drives icon and default label. */
  kind: ProfileContactChannelKind;
  /** Button label shown in the profile hero. */
  label: string;
  /** External href opened in a new tab (`mailto:` or `https://t.me/…`). */
  href: string;
}

/** Resolved contact options for profile hero actions. */
export interface ProfileContactOptions {
  /** Actionable channels in display priority order. */
  channels: ProfileContactChannel[];
  /** True when at least one channel is available. */
  hasAny: boolean;
}

/**
 * Normalize a Telegram username or URL into an `https://t.me/…` DM link.
 *
 * @param value - Raw username (`@name`) or Telegram URL.
 * @returns Normalized DM URL or null when not parseable.
 */
export function buildTelegramDirectMessageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("https://t.me/") || lower.startsWith("http://t.me/")) {
    try {
      const url = new URL(trimmed);
      const segment = url.pathname.replace(/^\//, "").split("/")[0];
      if (!segment || segment.startsWith("+") || segment === "joinchat") return trimmed;
      return `https://t.me/${segment}`;
    } catch {
      return null;
    }
  }

  const username = trimmed.replace(/^@/, "");
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) return null;
  return `https://t.me/${username}`;
}

/**
 * Extract a Telegram DM URL from a user-authored social link when applicable.
 *
 * @param link - Social link row from the profile owner.
 * @returns Telegram DM URL or null.
 */
function telegramUrlFromSocialLink(link: IUserSocialLink): string | null {
  const platform = link.platform.trim().toLowerCase();
  if (platform === "telegram") {
    return buildTelegramDirectMessageUrl(link.url) ?? buildTelegramDirectMessageUrl(link.label ?? "");
  }
  if (/t\.me/i.test(link.url)) {
    return buildTelegramDirectMessageUrl(link.url);
  }
  return null;
}

/**
 * Resolve contact channels for the profile hero "Message" menu.
 *
 * @param input - Profile owner contact fields visible to the current viewer.
 * @returns Ordered contact channels (Telegram preferred, then email).
 */
export function resolveProfileContactOptions(input: {
  username: string | null;
  email: string | null;
  socialLinks: IUserSocialLink[];
}): ProfileContactOptions {
  const channels: ProfileContactChannel[] = [];
  const seen = new Set<string>();

  const pushChannel = (channel: ProfileContactChannel) => {
    if (seen.has(channel.href)) return;
    seen.add(channel.href);
    channels.push(channel);
  };

  if (input.username) {
    const href = buildTelegramDirectMessageUrl(input.username);
    if (href) {
      pushChannel({
        kind: "telegram",
        label: "Message on Telegram",
        href,
      });
    }
  }

  for (const link of input.socialLinks) {
    const href = telegramUrlFromSocialLink(link);
    if (href) {
      pushChannel({
        kind: "telegram",
        label: link.label?.trim() ? `Telegram · ${link.label.trim()}` : "Message on Telegram",
        href,
      });
    }
  }

  if (input.email?.trim()) {
    pushChannel({
      kind: "email",
      label: "Send email",
      href: `mailto:${input.email.trim()}`,
    });
  }

  return { channels, hasAny: channels.length > 0 };
}
