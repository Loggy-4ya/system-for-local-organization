/**
 * @fileoverview Zod validation for institutional calendar rule APIs.
 *
 * @module shared/validation/institutionalCalendarSchemas
 */

import { z } from "zod";
import {
  INSTITUTIONAL_CALENDAR_ACTIONS,
  INSTITUTIONAL_CALENDAR_SOCIUM_KINDS,
  MAX_INSTITUTIONAL_CALENDAR_RULES,
  MAX_INSTITUTIONAL_YEARLY_ANCHORS,
} from "@shared/constants/institutionalCalendar";
import {
  normalizeYearlyAnchors,
  validateInstitutionalCalendarTarget,
} from "@shared/lib/institutionalCalendarLogic";

const objectIdPattern = /^[a-f\d]{24}$/i;

/** Yearly anchor row. */
export const institutionalYearlyAnchorSchema = z.object({
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  atTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
});

/** Task template for spawn actions. */
export const institutionalTaskTemplateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20000).default(""),
  dispatch: z.boolean().default(true),
});

const targetFields = {
  targetSociumKinds: z.array(z.enum(INSTITUTIONAL_CALENDAR_SOCIUM_KINDS)).default([]),
  targetSociumRoleKeys: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
  targetAccessLevelIndexes: z
    .array(z.coerce.number().int().min(0).max(6))
    .max(7)
    .default([]),
};

/** POST /api/admin/institutional-calendar create body. */
export const institutionalCalendarCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(20000).default(""),
    enabled: z.boolean().default(true),
    action: z.enum(INSTITUTIONAL_CALENDAR_ACTIONS).default("spawn_task_and_notify"),
    yearlyAnchors: z.array(institutionalYearlyAnchorSchema).max(MAX_INSTITUTIONAL_YEARLY_ANCHORS).default([]),
    channels: z.array(z.enum(["web", "telegram"])).min(1).max(2).default(["web"]),
    taskTemplate: institutionalTaskTemplateSchema.optional(),
    ...targetFields,
  })
  .transform((raw) => ({
    ...raw,
    yearlyAnchors: normalizeYearlyAnchors(raw.yearlyAnchors),
  }))
  .superRefine((payload, ctx) => {
    if (payload.yearlyAnchors.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one yearly calendar date.",
        path: ["yearlyAnchors"],
      });
    }

    const targetError = validateInstitutionalCalendarTarget(payload);
    if (targetError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: targetError,
        path: ["targetSociumKinds"],
      });
    }
  });

/** PATCH /api/admin/institutional-calendar/[ruleId] update body. */
export const institutionalCalendarUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(20000).optional(),
    enabled: z.boolean().optional(),
    action: z.enum(INSTITUTIONAL_CALENDAR_ACTIONS).optional(),
    yearlyAnchors: z.array(institutionalYearlyAnchorSchema).max(MAX_INSTITUTIONAL_YEARLY_ANCHORS).optional(),
    channels: z.array(z.enum(["web", "telegram"])).min(1).max(2).optional(),
    taskTemplate: institutionalTaskTemplateSchema.optional(),
    targetSociumKinds: z.array(z.enum(INSTITUTIONAL_CALENDAR_SOCIUM_KINDS)).optional(),
    targetSociumRoleKeys: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
    targetAccessLevelIndexes: z.array(z.coerce.number().int().min(0).max(6)).max(7).optional(),
  })
  .transform((raw) => ({
    ...raw,
    yearlyAnchors:
      raw.yearlyAnchors !== undefined ? normalizeYearlyAnchors(raw.yearlyAnchors) : undefined,
  }))
  .superRefine((payload, ctx) => {
    if (payload.yearlyAnchors !== undefined && payload.yearlyAnchors.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one yearly calendar date.",
        path: ["yearlyAnchors"],
      });
    }

    if (
      payload.targetSociumKinds === undefined &&
      payload.targetSociumRoleKeys === undefined &&
      payload.targetAccessLevelIndexes === undefined
    ) {
      return;
    }

    const targetError = validateInstitutionalCalendarTarget({
      targetSociumKinds: payload.targetSociumKinds ?? [],
      targetSociumRoleKeys: payload.targetSociumRoleKeys ?? [],
      targetAccessLevelIndexes: payload.targetAccessLevelIndexes ?? [],
    });
    if (targetError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: targetError,
        path: ["targetSociumKinds"],
      });
    }
  });

/** Guard for create when rule count exceeds cap. */
export const INSTITUTIONAL_CALENDAR_RULE_COUNT_LIMIT = MAX_INSTITUTIONAL_CALENDAR_RULES;

export type InstitutionalCalendarCreateInput = z.infer<typeof institutionalCalendarCreateSchema>;
export type InstitutionalCalendarUpdateInput = z.infer<typeof institutionalCalendarUpdateSchema>;
