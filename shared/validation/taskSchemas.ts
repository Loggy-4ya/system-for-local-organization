/**
 * @fileoverview Zod validation schemas for task CRUD and performer actions.
 *
 * @module shared/validation/taskSchemas
 */

import { z } from "zod";
import {
  MAX_TASK_REMINDER_SCHEDULED_DATES,
  TASK_ASSIGNMENT_NOTIFY_TARGETS,
  TASK_COEFFICIENT_PERCENT_MAX,
  TASK_COEFFICIENT_PERCENT_MIN,
  TASK_REMINDER_MODES,
  TASK_REMINDER_UNITS,
  TASK_REMINDER_UNIT_LIMITS,
  TASK_SCORE_MAX,
  TASK_SCORE_MIN,
  TASK_STATUSES,
} from "@shared/constants/taskSettings";
import {
  normalizeTaskReminderSettings,
  validateTaskReminderSettings,
} from "@shared/lib/taskReminderLogic";
import { MAX_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import { MAX_PAGE_CATEGORIES } from "@shared/lib/pageCategoryLogic";

const objectIdPattern = /^[a-f\d]{24}$/i;

/** Media ref body for task explanation or report attachments. */
export const taskMediaRefSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  mimeType: z.string().trim().max(128).optional(),
  kind: z.enum(["image", "video"]),
});

/** Reminder settings on create/update. */
export const taskReminderSettingsSchema = z
  .object({
    enabled: z.boolean(),
    mode: z.enum(TASK_REMINDER_MODES).default("every"),
    value: z.number().int().positive(),
    unit: z.enum(TASK_REMINDER_UNITS),
    channels: z.array(z.enum(["web", "telegram"])).min(1).max(2),
    repeatUntilDue: z.boolean().optional().default(false),
    atTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    scheduledDates: z.array(z.coerce.date()).max(MAX_TASK_REMINDER_SCHEDULED_DATES).optional(),
    repeatYearlyOnDates: z.boolean().optional().default(false),
    /** @deprecated Legacy hours-only interval — migrated on read. */
    intervalHours: z.number().int().positive().optional(),
  })
  .transform((raw) => normalizeTaskReminderSettings(raw))
  .superRefine((settings, ctx) => {
    if (settings.mode === "on_dates") return;

    const limits = TASK_REMINDER_UNIT_LIMITS[settings.unit];
    if (settings.value < limits.min || settings.value > limits.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Reminder amount must be between ${limits.min} and ${limits.max} ${settings.unit}.`,
        path: ["value"],
      });
    }
  });

/** Performer assignment row on create/update. */
export const taskPerformerInputSchema = z.object({
  userId: z.string().regex(objectIdPattern, "Invalid user id."),
  roleLabel: z.string().trim().max(64).optional(),
});

/** POST /api/tasks create body. */
export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(20000).default(""),
    dueAt: z.coerce.date().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(48)).max(MAX_PAGE_CATEGORIES).default([]),
    categoryId: z
      .string()
      .trim()
      .min(1)
      .max(48)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .nullable()
      .optional(),
    explanationMedia: z.array(taskMediaRefSchema).max(12).default([]),
    performers: z.array(taskPerformerInputSchema).min(1).max(20),
    reminderSettings: taskReminderSettingsSchema.optional(),
    groupId: z.string().regex(objectIdPattern, "Invalid group id.").nullable().optional(),
    assignmentNotifyTargets: z
      .array(z.enum(TASK_ASSIGNMENT_NOTIFY_TARGETS))
      .min(1)
      .max(2)
      .default(["telegram_dm"]),
    reportMediaAllowed: z.boolean().default(false),
    dispatch: z.boolean().default(true),
  })
  .superRefine((payload, ctx) => {
    if (!payload.reminderSettings?.enabled) return;
    const message = validateTaskReminderSettings(payload.reminderSettings, payload.dueAt);
    if (message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["reminderSettings"],
      });
    }
  });

/** PATCH /api/tasks/[taskId] update body. */
export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(20000).optional(),
    dueAt: z.coerce.date().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(48)).max(MAX_PAGE_CATEGORIES).optional(),
    categoryId: z
      .string()
      .trim()
      .min(1)
      .max(48)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .nullable()
      .optional(),
    explanationMedia: z.array(taskMediaRefSchema).max(12).optional(),
    performers: z.array(taskPerformerInputSchema).min(1).max(20).optional(),
    reminderSettings: taskReminderSettingsSchema.optional(),
    groupId: z.string().regex(objectIdPattern, "Invalid group id.").nullable().optional(),
    assignmentNotifyTargets: z
      .array(z.enum(TASK_ASSIGNMENT_NOTIFY_TARGETS))
      .min(1)
      .max(2)
      .optional(),
    reportMediaAllowed: z.boolean().optional(),
    status: z.enum(TASK_STATUSES).optional(),
  })
  .superRefine((payload, ctx) => {
    if (!payload.reminderSettings?.enabled) return;
    const message = validateTaskReminderSettings(payload.reminderSettings, payload.dueAt);
    if (message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["reminderSettings"],
      });
    }
  });

/** GET /api/tasks list query. */
export const taskListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).default(10),
  scope: z.enum(["all", "authored", "assigned"]).default("all"),
  status: z.enum(TASK_STATUSES).optional(),
  tag: z.string().trim().max(48).optional(),
  categoryId: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  search: z.string().trim().max(120).optional(),
  /** Filter tasks belonging to a task group. */
  groupId: z.string().regex(objectIdPattern).optional(),
  /** When set, list tasks assigned to this user (profile panels). */
  assigneeUserId: z.string().regex(objectIdPattern).optional(),
});

/** POST report body. */
export const taskReportSchema = z.object({
  description: z.string().trim().min(1).max(10000),
  media: z.array(taskMediaRefSchema).max(12).default([]),
});

/** POST delegate body. */
export const taskDelegateSchema = z.object({
  userId: z.string().regex(objectIdPattern, "Invalid user id."),
  roleLabel: z.string().trim().max(64).optional(),
});

/** POST score body — base score (B) and per-performer Q/T percents. */
export const taskScoreSchema = z.object({
  baseScore: z.number().min(TASK_SCORE_MIN).max(TASK_SCORE_MAX),
  scores: z
    .array(
      z.object({
        userId: z.string().regex(objectIdPattern),
        qualityPercent: z
          .number()
          .min(TASK_COEFFICIENT_PERCENT_MIN)
          .max(TASK_COEFFICIENT_PERCENT_MAX),
        timePercent: z
          .number()
          .min(TASK_COEFFICIENT_PERCENT_MIN)
          .max(TASK_COEFFICIENT_PERCENT_MAX),
      }),
    )
    .min(1)
    .max(20),
  /** When false, persist scores without marking the task completed. */
  complete: z.boolean().optional().default(true),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type TaskReportInput = z.infer<typeof taskReportSchema>;
export type TaskDelegateInput = z.infer<typeof taskDelegateSchema>;
export type TaskScoreInput = z.infer<typeof taskScoreSchema>;
