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
  TELEGRAM_MESSAGE_TEMPLATE_DEFS,
  type TelegramMessageTemplateKey,
} from "@shared/constants/generalRules";
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
  /** Institutional blocklist. */
  blockedWords: ContentPolicyBlockedWordEntry[];
  /** Weak password denylist. */
  weakPasswords: string[];
  /** User-facing blocked-language message. */
  blockedWordMessage: string;
  /** User-facing weak-password message. */
  weakPasswordMessage: string;
  /** Telegram bot templates keyed by template id. */
  telegramMessages: Record<TelegramMessageTemplateKey, string>;
  /** Per-tier task delegation quotas (`null` = unlimited). */
  taskDelegationLimits: Record<string, number | null>;
  /** Institutional task categories for scoring and filters. */
  taskCategories: TaskCategoryDefinition[];
}

/** Partial update payload from admin POST. */
export interface GeneralRulesUpdateInput {
  blockedWords?: ContentPolicyBlockedWordEntry[];
  weakPasswords?: string[];
  blockedWordMessage?: string;
  weakPasswordMessage?: string;
  telegramMessages?: Partial<Record<TelegramMessageTemplateKey, string>>;
  /** Partial delegation limit overrides keyed by access level index string. */
  taskDelegationLimits?: Record<string, number | null>;
  /** Task category catalog overrides. */
  taskCategories?: TaskCategoryDefinition[];
}

/**
 * Merge persisted Telegram templates with code defaults for missing keys.
 *
 * @param stored - Raw map from MongoDB.
 * @returns Complete template map.
 */
function normalizeTelegramMessages(
  stored: Record<string, string> | undefined | null,
): Record<TelegramMessageTemplateKey, string> {
  const defaults = buildDefaultTelegramMessageTemplates();
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
 * Convert a Mongoose document to the public config DTO.
 *
 * @param doc - General rules settings document.
 * @returns Serializable config for admin UI.
 */
export function generalRulesToPublicConfig(doc: IGeneralRulesSettings): GeneralRulesPublicConfig {
  return {
    blockedWords: (doc.blockedWords ?? []).map((entry) => ({
      term: String(entry.term ?? "").trim(),
      category: entry.category,
    })).filter((entry) => entry.term.length > 0),
    weakPasswords: (doc.weakPasswords ?? [])
      .map((entry) => String(entry).trim())
      .filter(Boolean),
    blockedWordMessage: doc.blockedWordMessage?.trim() || DEFAULT_BLOCKED_WORD_USER_MESSAGE,
    weakPasswordMessage: doc.weakPasswordMessage?.trim() || DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
    telegramMessages: normalizeTelegramMessages(doc.telegramMessages),
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
    telegramMessages: config.telegramMessages,
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
    });
  }

  publishEffectiveGeneralRules(generalRulesToPublicConfig(doc));
  return doc;
}

/**
 * Ensure effective rules are loaded from MongoDB (respects in-process TTL cache).
 *
 * Call at the start of API handlers that run synchronous content-policy scans.
 */
export async function ensureGeneralRulesLoaded(): Promise<EffectiveGeneralRules> {
  await loadGeneralRulesOrSeed();
  return getEffectiveGeneralRulesSync();
}

/**
 * Resolve one Telegram template after rules are loaded.
 *
 * @param key - Template key.
 * @returns Template text.
 */
export async function getTelegramMessageTemplate(key: TelegramMessageTemplateKey): Promise<string> {
  await ensureGeneralRulesLoaded();
  return getEffectiveGeneralRulesSync().telegramMessages[key];
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

  if (input.telegramMessages !== undefined) {
    doc.telegramMessages = {
      ...normalizeTelegramMessages(doc.telegramMessages),
      ...Object.fromEntries(
        Object.entries(input.telegramMessages).filter(
          ([, value]) => typeof value === "string" && value.trim().length > 0,
        ),
      ),
    };
  }

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
