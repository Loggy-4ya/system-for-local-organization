/**
 * @fileoverview Singleton general rules — blocked words, weak passwords, Telegram copy.
 *
 * @module shared/models/GeneralRulesSettings
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import {
  buildDefaultBlockedWordsSeed,
  buildDefaultTelegramMessageTemplates,
  buildDefaultWeakPasswordsSeed,
  DEFAULT_BLOCKED_WORD_USER_MESSAGE,
  DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
  GENERAL_RULES_SETTINGS_ID,
  type TelegramMessageTemplateKey,
} from "@shared/constants/generalRules";
import { buildDefaultTelegramMessageTemplatesByLocale } from "@shared/constants/botMessageDefaults";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import type { ContentPolicyBlockedWordCategory } from "@shared/constants/contentPolicy";
import { DEFAULT_TASK_DELEGATION_LIMITS } from "@shared/constants/taskSettings";
import type { TaskCategoryDefinition } from "@shared/constants/taskCategoryDefaults";

export { GENERAL_RULES_SETTINGS_ID };

/** Persisted blocked-word row in general rules settings. */
export interface IGeneralRulesBlockedWord {
  term: string;
  category?: ContentPolicyBlockedWordCategory;
}

/** Persisted general rules singleton document. */
export interface IGeneralRulesSettings extends Omit<Document, "_id"> {
  /** Singleton key — always {@link GENERAL_RULES_SETTINGS_ID}. */
  _id: string;
  /** Institutional blocklist for user-authored prose. */
  blockedWords: IGeneralRulesBlockedWord[];
  /** Weak password denylist. */
  weakPasswords: string[];
  /** User-facing message when blocked language is detected. */
  blockedWordMessage: string;
  /** User-facing message when a weak password is rejected. */
  weakPasswordMessage: string;
  /** Telegram bot plain-text templates keyed by {@link TelegramMessageTemplateKey}. @deprecated Use {@link telegramMessagesByLocale}. */
  telegramMessages: Record<string, string>;
  /** Telegram bot templates per locale (`en`, `uk`). */
  telegramMessagesByLocale: Record<string, Record<string, string>>;
  /** Per-tier task delegation quotas (`null` = unlimited). */
  taskDelegationLimits: Record<AccessLevelIndex, number | null>;
  /** Institutional task categories — scoring weights and admin filters. */
  taskCategories: TaskCategoryDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

const BlockedWordSchema = new Schema<IGeneralRulesBlockedWord>(
  {
    term: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["profanity", "slur", "sexual", "violence", "institution", "other"],
      required: false,
    },
  },
  { _id: false },
);

const TaskCategorySchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    baseScoreMin: { type: Number, required: true, min: 0, max: 10000 },
    baseScoreMax: { type: Number, required: true, min: 0, max: 10000 },
    defaultQualityPercent: { type: Number, required: true, min: 0, max: 200 },
    defaultTimePercent: { type: Number, required: true, min: 0, max: 200 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const GeneralRulesSettingsSchema = new Schema<IGeneralRulesSettings>(
  {
    _id: {
      type: String,
      default: GENERAL_RULES_SETTINGS_ID,
    },
    blockedWords: {
      type: [BlockedWordSchema],
      default: () => buildDefaultBlockedWordsSeed(),
    },
    weakPasswords: {
      type: [String],
      default: () => buildDefaultWeakPasswordsSeed(),
    },
    blockedWordMessage: {
      type: String,
      default: DEFAULT_BLOCKED_WORD_USER_MESSAGE,
      trim: true,
    },
    weakPasswordMessage: {
      type: String,
      default: DEFAULT_WEAK_PASSWORD_USER_MESSAGE,
      trim: true,
    },
    telegramMessages: {
      type: Schema.Types.Mixed,
      default: () => buildDefaultTelegramMessageTemplates(),
    },
    telegramMessagesByLocale: {
      type: Schema.Types.Mixed,
      default: () => buildDefaultTelegramMessageTemplatesByLocale(),
    },
    taskDelegationLimits: {
      type: Schema.Types.Mixed,
      default: () => ({ ...DEFAULT_TASK_DELEGATION_LIMITS }),
    },
    taskCategories: {
      type: [TaskCategorySchema],
      default: () => [],
    },
  },
  {
    timestamps: true,
    collection: "general_rules_settings",
  },
);

const GeneralRulesSettings: Model<IGeneralRulesSettings> =
  mongoose.models.GeneralRulesSettings ??
  mongoose.model<IGeneralRulesSettings>("GeneralRulesSettings", GeneralRulesSettingsSchema);

export default GeneralRulesSettings;
