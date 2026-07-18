/**
 * @fileoverview Consolidated general rules domain — content policy + Telegram templates.
 *
 * @module shared/domains/GeneralRulesDomain
 *
 * Tests: `npm run test:general-rules-domain`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import {
  buildDefaultBlockedWordsSeed,
  buildDefaultTelegramMessageTemplates,
  buildDefaultWeakPasswordsSeed,
  DEFAULT_BLOCKED_WORD_USER_MESSAGE,
  DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
  type TelegramMessageTemplateKey,
} from "@shared/constants/generalRules";
import {
  buildDefaultTelegramMessageTemplatesByLocale,
  normalizeTelegramMessagesByLocale,
} from "@shared/constants/botMessageDefaults";
import type { BotLocale } from "@shared/constants/botLocales";
import { DEFAULT_BOT_LOCALE } from "@shared/constants/botLocales";
import { isBotLocale } from "@shared/lib/resolveBotLocale";
import type { ContentPolicyBlockedWordEntry } from "@shared/constants/contentPolicy";
import {
  normalizeTaskDelegationLimits,
  serializeTaskDelegationLimits,
} from "@shared/lib/taskDelegationLimitsLogic";
import { normalizeTaskCategories } from "@shared/lib/taskCategoriesSettingsLogic";
import type { TaskCategoryDefinition } from "@shared/constants/taskCategoryDefaults";
import {
  buildEffectiveGeneralRulesSnapshot,
  getEffectiveGeneralRulesSync,
  invalidateEffectiveGeneralRulesCache,
  setEffectiveGeneralRulesCache,
  type EffectiveGeneralRules,
} from "@shared/lib/effectiveGeneralRulesCache";
import GeneralRulesSettings, {
  GENERAL_RULES_SETTINGS_ID,
  type IGeneralRulesSettings,
} from "@shared/models/GeneralRulesSettings";

/** Public DTO for admin UI and APIs. */
export interface GeneralRulesPublicConfig {
  blockedWords: ContentPolicyBlockedWordEntry[];
  weakPasswords: string[];
  blockedWordMessage: string;
  weakPasswordMessage: string;
  /** @deprecated Use {@link telegramMessagesByLocale}. */
  telegramMessages: Record<TelegramMessageTemplateKey, string>;
  /** Telegram bot templates per locale. */
  telegramMessagesByLocale: Record<BotLocale, Record<TelegramMessageTemplateKey, string>>;
  taskDelegationLimits: Record<string, number | null>;
  taskCategories: TaskCategoryDefinition[];
}

/** Partial update payload from admin POST. */
export interface GeneralRulesUpdateInput {
  blockedWords?: ContentPolicyBlockedWordEntry[];
  weakPasswords?: string[];
  blockedWordMessage?: string;
  weakPasswordMessage?: string;
  /** @deprecated Merged into {@link telegramMessagesByLocale}.en */
  telegramMessages?: Partial<Record<TelegramMessageTemplateKey, string>>;
  telegramMessagesByLocale?: Partial<
    Record<BotLocale, Partial<Record<TelegramMessageTemplateKey, string>>>
  >;
  taskDelegationLimits?: Record<string, number | null>;
  taskCategories?: TaskCategoryDefinition[];
}

/**
 * Convert a Mongoose document to the public config DTO.
 *
 * @param doc - General rules settings document.
 * @returns Serializable config for admin UI.
 */
export function generalRulesToPublicConfig(doc: IGeneralRulesSettings): GeneralRulesPublicConfig {
  const telegramMessagesByLocale = normalizeTelegramMessagesByLocale(
    doc.telegramMessages,
    doc.telegramMessagesByLocale as Partial<Record<BotLocale, Record<string, string>>> | null,
  );

  return {
    blockedWords: (doc.blockedWords ?? [])
      .map((entry) => ({
        term: String(entry.term ?? "").trim(),
        category: entry.category,
      }))
      .filter((entry) => entry.term.length > 0),
    weakPasswords: (doc.weakPasswords ?? [])
      .map((entry) => String(entry).trim())
      .filter(Boolean),
    blockedWordMessage: doc.blockedWordMessage?.trim() || DEFAULT_BLOCKED_WORD_USER_MESSAGE,
    weakPasswordMessage: doc.weakPasswordMessage?.trim() || DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
    telegramMessages: telegramMessagesByLocale[DEFAULT_BOT_LOCALE],
    telegramMessagesByLocale,
    taskDelegationLimits: serializeTaskDelegationLimits(
      normalizeTaskDelegationLimits(doc.taskDelegationLimits as Record<string, number | null>),
    ),
    taskCategories: normalizeTaskCategories(doc.taskCategories as TaskCategoryDefinition[]),
  };
}

/**
 * Compile and cache effective rules from a public config snapshot.
 *
 * @param config - Public general rules config.
 * @returns Effective rules for sync scanners.
 */
export function publishEffectiveGeneralRules(config: GeneralRulesPublicConfig): EffectiveGeneralRules {
  const effective = buildEffectiveGeneralRulesSnapshot({
    blockedWords: config.blockedWords,
    weakPasswords: config.weakPasswords,
    blockedWordMessage: config.blockedWordMessage,
    weakPasswordMessage: config.weakPasswordMessage,
    telegramMessagesByLocale: config.telegramMessagesByLocale,
  });
  setEffectiveGeneralRulesCache(effective);
  return effective;
}

/**
 * Load singleton general rules, seeding defaults on first access.
 *
 * @returns Mongoose general rules document.
 */
export async function loadGeneralRulesOrSeed(): Promise<IGeneralRulesSettings> {
  await connectDB();

  let doc = await GeneralRulesSettings.findById(GENERAL_RULES_SETTINGS_ID);
  if (!doc) {
    doc = await GeneralRulesSettings.create({
      _id: GENERAL_RULES_SETTINGS_ID,
      blockedWords: buildDefaultBlockedWordsSeed(),
      weakPasswords: buildDefaultWeakPasswordsSeed(),
      blockedWordMessage: DEFAULT_BLOCKED_WORD_USER_MESSAGE,
      weakPasswordMessage: DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
      telegramMessages: buildDefaultTelegramMessageTemplates(),
      telegramMessagesByLocale: buildDefaultTelegramMessageTemplatesByLocale(),
    });
  } else if (!doc.telegramMessagesByLocale || Object.keys(doc.telegramMessagesByLocale).length === 0) {
    doc.telegramMessagesByLocale = normalizeTelegramMessagesByLocale(
      doc.telegramMessages,
      null,
    );
    await doc.save();
  }

  publishEffectiveGeneralRules(generalRulesToPublicConfig(doc));
  return doc;
}

/**
 * Ensure effective rules are loaded from MongoDB (respects in-process TTL cache).
 */
export async function ensureGeneralRulesLoaded(): Promise<EffectiveGeneralRules> {
  await loadGeneralRulesOrSeed();
  return getEffectiveGeneralRulesSync();
}

/**
 * Resolve one Telegram template after rules are loaded.
 *
 * @param key - Template key.
 * @param locale - Target locale (`en` or `uk`).
 * @returns Template text for the locale.
 */
export async function getTelegramMessageTemplate(
  key: TelegramMessageTemplateKey,
  locale: BotLocale = DEFAULT_BOT_LOCALE,
): Promise<string> {
  await ensureGeneralRulesLoaded();
  const resolvedLocale = isBotLocale(locale) ? locale : DEFAULT_BOT_LOCALE;
  return getEffectiveGeneralRulesSync().telegramMessagesByLocale[resolvedLocale][key];
}

/**
 * Validate and persist general rules updates from the admin editor.
 *
 * @param input - Partial update payload.
 * @returns Updated document.
 */
export async function updateGeneralRules(
  input: GeneralRulesUpdateInput,
): Promise<IGeneralRulesSettings> {
  await connectDB();
  const doc = await loadGeneralRulesOrSeed();

  if (input.blockedWords !== undefined) {
    doc.blockedWords = input.blockedWords.map((entry) => ({
      term: entry.term.trim(),
      category: entry.category,
    }));
  }

  if (input.weakPasswords !== undefined) {
    doc.weakPasswords = input.weakPasswords.map((entry) => entry.trim()).filter(Boolean);
  }

  if (input.blockedWordMessage !== undefined) {
    doc.blockedWordMessage = input.blockedWordMessage.trim() || DEFAULT_BLOCKED_WORD_USER_MESSAGE;
  }

  if (input.weakPasswordMessage !== undefined) {
    doc.weakPasswordMessage = input.weakPasswordMessage.trim() || DEFAULT_WEAK_PASSWORD_USER_MESSAGE;
  }

  const currentByLocale = normalizeTelegramMessagesByLocale(
    doc.telegramMessages,
    doc.telegramMessagesByLocale as Partial<Record<BotLocale, Record<string, string>>> | null,
  );

  if (input.telegramMessages !== undefined) {
    currentByLocale.en = {
      ...currentByLocale.en,
      ...Object.fromEntries(
        Object.entries(input.telegramMessages).filter(
          ([, value]) => typeof value === "string" && value.trim().length > 0,
        ),
      ),
    } as Record<TelegramMessageTemplateKey, string>;
  }

  if (input.telegramMessagesByLocale !== undefined) {
    for (const [localeKey, partial] of Object.entries(input.telegramMessagesByLocale)) {
      if (!isBotLocale(localeKey) || !partial) continue;
      currentByLocale[localeKey] = {
        ...currentByLocale[localeKey],
        ...Object.fromEntries(
          Object.entries(partial).filter(
            ([, value]) => typeof value === "string" && value.trim().length > 0,
          ),
        ),
      } as Record<TelegramMessageTemplateKey, string>;
    }
  }

  doc.telegramMessagesByLocale = currentByLocale;
  doc.telegramMessages = currentByLocale.en;

  if (input.taskDelegationLimits !== undefined) {
    doc.taskDelegationLimits = normalizeTaskDelegationLimits(input.taskDelegationLimits);
  }

  if (input.taskCategories !== undefined) {
    doc.taskCategories = normalizeTaskCategories(input.taskCategories);
  }

  await doc.save();
  invalidateEffectiveGeneralRulesCache();
  publishEffectiveGeneralRules(generalRulesToPublicConfig(doc));
  return doc;
}

/** Consolidated domain export. */
export const GeneralRulesDomain = {
  loadOrSeed: loadGeneralRulesOrSeed,
  ensureLoaded: ensureGeneralRulesLoaded,
  update: updateGeneralRules,
  toPublicConfig: generalRulesToPublicConfig,
  getTelegramMessageTemplate,
};

export default GeneralRulesDomain;
