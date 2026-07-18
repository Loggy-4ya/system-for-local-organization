/**
 * @fileoverview Default Telegram bot template text per locale.
 *
 * Code defaults seed MongoDB and backfill missing admin overrides.
 * Ukrainian strings mirror {@link TELEGRAM_MESSAGE_TEMPLATE_DEFS} semantics.
 *
 * @module shared/constants/botMessageDefaults
 */

import {
  buildDefaultTelegramMessageTemplates,
  TELEGRAM_MESSAGE_TEMPLATE_DEFS,
  type TelegramMessageTemplateKey,
} from "@shared/constants/generalRules";
import { BOT_LOCALES, type BotLocale } from "@shared/constants/botLocales";

/** Ukrainian default bodies keyed by template id. */
const UK_TELEGRAM_DEFAULTS: Record<TelegramMessageTemplateKey, string> = {
  startWelcome: "Ласкаво просимо до Nexus. Натисніть нижче, щоб відкрити застосунок.",
  startOpenButtonLabel: "Відкрити Nexus",
  startSharePhonePrompt:
    "Надішліть номер телефону, щоб Nexus міг попередньо заповнити профіль. Натисніть кнопку нижче — приймається лише ваш власний контакт.",
  contactShareButtonLabel: "Надіслати номер телефону",
  contactPhoneSaved:
    "Дякуємо — номер збережено. Відкрийте Nexus, щоб завершити профіль.",
  contactPhoneRejected: "Будь ласка, надішліть свій власний контакт через кнопку нижче.",
  broadcastAnnouncementPrefix: "📢 {title}\n\n{body}",
  pagePublishedAnnouncement: "📰 {title}\n\n{body}\n\nВідкрити: {url}",
  botRegisterPrompt:
    "Ваш Telegram ще не пов’язаний з обліковим записом Nexus. Відкрийте Nexus, щоб зареєструватися та продовжити.",
  botFinishRegistrationPrompt:
    "Завершіть профіль Nexus перед використанням команд бота. Ще потрібно: {missingFields}. Відкрийте Nexus, щоб продовжити.",
};

/**
 * Build full default template maps for every supported bot locale.
 *
 * @returns Locale-keyed template maps seeded from code constants.
 */
export function buildDefaultTelegramMessageTemplatesByLocale(): Record<
  BotLocale,
  Record<TelegramMessageTemplateKey, string>
> {
  return {
    en: buildDefaultTelegramMessageTemplates(),
    uk: { ...UK_TELEGRAM_DEFAULTS },
  };
}

/**
 * Merge persisted overrides onto code defaults for one locale.
 *
 * @param locale - Target locale.
 * @param stored - Raw override map from MongoDB.
 * @returns Complete template map for the locale.
 */
export function normalizeTelegramMessagesForLocale(
  locale: BotLocale,
  stored: Record<string, string> | undefined | null,
): Record<TelegramMessageTemplateKey, string> {
  const defaults = buildDefaultTelegramMessageTemplatesByLocale()[locale];
  const output = { ...defaults };

  for (const def of TELEGRAM_MESSAGE_TEMPLATE_DEFS) {
    const candidate = stored?.[def.key];
    if (typeof candidate === "string" && candidate.trim()) {
      output[def.key] = candidate.trim();
    }
  }

  return output;
}

/**
 * Merge legacy flat `telegramMessages` and per-locale maps into a full by-locale snapshot.
 *
 * @param legacyFlat - Deprecated single-locale map (treated as English overrides).
 * @param byLocale - Per-locale override maps from MongoDB.
 * @returns Normalized maps for every {@link BOT_LOCALES} entry.
 */
export function normalizeTelegramMessagesByLocale(
  legacyFlat: Record<string, string> | undefined | null,
  byLocale: Partial<Record<BotLocale, Record<string, string>>> | undefined | null,
): Record<BotLocale, Record<TelegramMessageTemplateKey, string>> {
  const output = {} as Record<BotLocale, Record<TelegramMessageTemplateKey, string>>;

  for (const locale of BOT_LOCALES) {
    const stored =
      locale === "en" && byLocale?.en == null && legacyFlat
        ? legacyFlat
        : byLocale?.[locale];
    output[locale] = normalizeTelegramMessagesForLocale(locale, stored ?? null);
  }

  return output;
}
