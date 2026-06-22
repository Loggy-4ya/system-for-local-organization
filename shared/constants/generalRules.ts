/**
 * @fileoverview Seed defaults for institutional general rules (content + Telegram copy).
 *
 * Persisted overrides live in MongoDB {@link GeneralRulesSettings}; constants here
 * seed first deploy and document template keys for the admin editor.
 *
 * @module shared/constants/generalRules
 */

import {
  CONTENT_POLICY_BLOCKED_WORD_MESSAGE,
  CONTENT_POLICY_BLOCKED_WORDS,
  CONTENT_POLICY_WEAK_PASSWORD_MESSAGE,
  CONTENT_POLICY_WEAK_PASSWORDS,
  type ContentPolicyBlockedWordEntry,
} from "@shared/constants/contentPolicy";

/** Singleton MongoDB document id for general rules. */
export const GENERAL_RULES_SETTINGS_ID = "nexus_general_rules";

/** Known Telegram bot message template keys editable in admin. */
export type TelegramMessageTemplateKey =
  | "startWelcome"
  | "startOpenButtonLabel"
  | "startSharePhonePrompt"
  | "contactShareButtonLabel"
  | "contactPhoneSaved"
  | "contactPhoneRejected"
  | "broadcastAnnouncementPrefix";

/** Metadata for one Telegram template field in the admin UI. */
export interface TelegramMessageTemplateDefinition {
  /** Stable key stored in MongoDB. */
  key: TelegramMessageTemplateKey;
  /** Admin form label. */
  label: string;
  /** Helper text describing when the bot sends this copy. */
  description: string;
  /** Default plain-text body when no override is saved. */
  defaultText: string;
}

/** Registry of editable Telegram bot message templates. */
export const TELEGRAM_MESSAGE_TEMPLATE_DEFS: readonly TelegramMessageTemplateDefinition[] = [
  {
    key: "startWelcome",
    label: "Start command welcome",
    description: "Plain-text reply when a user sends /start to the Nexus bot.",
    defaultText: "Welcome to Nexus. Tap below to open the app.",
  },
  {
    key: "startOpenButtonLabel",
    label: "Mini App open button",
    description: "Label on the inline keyboard button that opens the Telegram Mini App.",
    defaultText: "Open Nexus",
  },
  {
    key: "startSharePhonePrompt",
    label: "Share phone prompt",
    description:
      "Follow-up DM after /start asking the user to share their phone for profile pre-fill.",
    defaultText:
      "Share your phone number so Nexus can pre-fill your profile. Tap the button below — only your own contact is accepted.",
  },
  {
    key: "contactShareButtonLabel",
    label: "Share phone button",
    description: "Reply keyboard label with Telegram request_contact.",
    defaultText: "Share phone number",
  },
  {
    key: "contactPhoneSaved",
    label: "Phone saved confirmation",
    description: "Sent after a valid shared contact is stored on the user or harvest cache.",
    defaultText: "Thanks — your phone number is saved. Open Nexus to finish your profile.",
  },
  {
    key: "contactPhoneRejected",
    label: "Invalid contact rejection",
    description: "Sent when the shared contact is not the sender's own card or phone is invalid.",
    defaultText: "Please share your own phone contact using the button below.",
  },
  {
    key: "broadcastAnnouncementPrefix",
    label: "Broadcast announcement prefix",
    description:
      "Prepended to institution broadcast DMs. Use {title} and {body} placeholders when both are present.",
    defaultText: "📢 {title}\n\n{body}",
  },
] as const;

/** Default Telegram template map keyed by {@link TelegramMessageTemplateKey}. */
export function buildDefaultTelegramMessageTemplates(): Record<TelegramMessageTemplateKey, string> {
  return Object.fromEntries(
    TELEGRAM_MESSAGE_TEMPLATE_DEFS.map((def) => [def.key, def.defaultText]),
  ) as Record<TelegramMessageTemplateKey, string>;
}

/** Seed blocked-word list copied into MongoDB on first load. */
export function buildDefaultBlockedWordsSeed(): ContentPolicyBlockedWordEntry[] {
  return CONTENT_POLICY_BLOCKED_WORDS.map((entry) => ({ ...entry }));
}

/** Seed weak-password denylist copied into MongoDB on first load. */
export function buildDefaultWeakPasswordsSeed(): string[] {
  return [...CONTENT_POLICY_WEAK_PASSWORDS];
}

/** Default user-facing blocked-language message. */
export const DEFAULT_BLOCKED_WORD_USER_MESSAGE = CONTENT_POLICY_BLOCKED_WORD_MESSAGE;

/** Default user-facing weak-password message. */
export const DEFAULT_WEAK_PASSWORD_USER_MESSAGE = CONTENT_POLICY_WEAK_PASSWORD_MESSAGE;

/**
 * Resolve one Telegram template string with optional placeholders.
 *
 * @param template - Raw template from settings.
 * @param placeholders - Key/value replacements (e.g. `{title}` → headline).
 * @returns Interpolated plain text.
 */
export function interpolateTelegramMessageTemplate(
  template: string,
  placeholders: Record<string, string>,
): string {
  let output = template;
  for (const [key, value] of Object.entries(placeholders)) {
    output = output.split(`{${key}}`).join(value);
  }
  return output.trim();
}
