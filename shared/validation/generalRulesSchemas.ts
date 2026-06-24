/**
 * @fileoverview Zod validation for general rules admin API payloads.
 *
 * @module shared/validation/generalRulesSchemas
 */

import { z } from "zod";
import { DEFAULT_ACCESS_LEVELS } from "@shared/constants/accessControl";
import { MAX_TASK_CATEGORIES } from "@shared/constants/taskCategoryDefaults";
import {
  TASK_COEFFICIENT_PERCENT_MAX,
  TASK_COEFFICIENT_PERCENT_MIN,
} from "@shared/constants/taskSettings";

const blockedWordCategorySchema = z.enum([
  "profanity",
  "slur",
  "sexual",
  "violence",
  "institution",
  "other",
]);

const blockedWordEntrySchema = z.object({
  term: z.string().trim().min(1, "Blocked term cannot be empty.").max(120),
  category: blockedWordCategorySchema.optional(),
});

const telegramMessagesSchema = z
  .object({
    startWelcome: z.string().trim().min(1).max(2000).optional(),
    startOpenButtonLabel: z.string().trim().min(1).max(120).optional(),
    startSharePhonePrompt: z.string().trim().min(1).max(2000).optional(),
    contactShareButtonLabel: z.string().trim().min(1).max(120).optional(),
    contactPhoneSaved: z.string().trim().min(1).max(2000).optional(),
    contactPhoneRejected: z.string().trim().min(1).max(2000).optional(),
    broadcastAnnouncementPrefix: z.string().trim().min(1).max(2000).optional(),
    pagePublishedAnnouncement: z.string().trim().min(1).max(2000).optional(),
  })
  .optional();

const accessLevelKeySchema = z.enum(
  DEFAULT_ACCESS_LEVELS.map((level) => String(level.index)) as [string, ...string[]],
);

/** Per-tier delegation quota (`null` = unlimited). */
export const taskDelegationLimitsSchema = z.record(
  accessLevelKeySchema,
  z.number().int().min(0).max(100).nullable(),
);

const taskCategorySchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().trim().min(1).max(80),
  baseScoreMin: z.number().int().min(0).max(10000),
  baseScoreMax: z.number().int().min(0).max(10000),
  defaultQualityPercent: z
    .number()
    .min(TASK_COEFFICIENT_PERCENT_MIN)
    .max(TASK_COEFFICIENT_PERCENT_MAX),
  defaultTimePercent: z
    .number()
    .min(TASK_COEFFICIENT_PERCENT_MIN)
    .max(TASK_COEFFICIENT_PERCENT_MAX),
  enabled: z.boolean().optional().default(true),
});

/**
 * Schema for POST /api/admin/general-rules.
 */
export const generalRulesUpdateSchema = z.object({
  blockedWords: z.array(blockedWordEntrySchema).max(500).optional(),
  weakPasswords: z
    .array(z.string().trim().min(1).max(128))
    .max(200)
    .optional(),
  blockedWordMessage: z.string().trim().min(1).max(240).optional(),
  weakPasswordMessage: z.string().trim().min(1).max(240).optional(),
  telegramMessages: telegramMessagesSchema,
  taskDelegationLimits: taskDelegationLimitsSchema.optional(),
  taskCategories: z.array(taskCategorySchema).max(MAX_TASK_CATEGORIES).optional(),
});

export type GeneralRulesUpdatePayload = z.infer<typeof generalRulesUpdateSchema>;
