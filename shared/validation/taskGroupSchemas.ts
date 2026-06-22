/**
 * @fileoverview Zod validation for task group CRUD APIs.
 *
 * @module shared/validation/taskGroupSchemas
 */

import { z } from "zod";
import { MAX_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import { MAX_PAGE_CATEGORIES } from "@shared/lib/pageCategoryLogic";
import { TASK_GROUP_STATUSES } from "@shared/constants/taskSettings";
import { MAX_TASK_GROUP_ROSTER_SIZE } from "@shared/constants/taskSettings";
import { validateTaskReminderSettings } from "@shared/lib/taskReminderLogic";
import { taskReminderSettingsSchema, taskPerformerInputSchema } from "@shared/validation/taskSchemas";

/** Planned roster member row on create/update. */
export const taskGroupRosterInputSchema = taskPerformerInputSchema;

/** POST /api/task-groups create body. */
export const taskGroupCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(20000).default(""),
    dueAt: z.coerce.date().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(48)).max(MAX_PAGE_CATEGORIES).default([]),
    reminderSettings: taskReminderSettingsSchema.optional(),
    roster: z.array(taskGroupRosterInputSchema).max(MAX_TASK_GROUP_ROSTER_SIZE).default([]),
    activate: z.boolean().default(false),
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

/** PATCH /api/task-groups/[groupId] update body. */
export const taskGroupUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(20000).optional(),
    dueAt: z.coerce.date().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(48)).max(MAX_PAGE_CATEGORIES).optional(),
    reminderSettings: taskReminderSettingsSchema.optional(),
    roster: z.array(taskGroupRosterInputSchema).max(MAX_TASK_GROUP_ROSTER_SIZE).optional(),
    status: z.enum(TASK_GROUP_STATUSES).optional(),
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

/** GET /api/task-groups list query. */
export const taskGroupListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).default(10),
  scope: z.enum(["all", "authored", "involved"]).default("all"),
  search: z.string().trim().max(120).optional(),
});

export type TaskGroupCreateInput = z.infer<typeof taskGroupCreateSchema>;
export type TaskGroupUpdateInput = z.infer<typeof taskGroupUpdateSchema>;
export type TaskGroupListQuery = z.infer<typeof taskGroupListQuerySchema>;
