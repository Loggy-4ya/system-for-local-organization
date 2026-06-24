/**
 * @fileoverview Zod schemas for form field submission and stats APIs.
 *
 * @module shared/validation/formFieldSchemas
 */

import { z } from "zod";

/** POST /api/pages/form-fields/submit body. */
export const submitFormFieldBodySchema = z.object({
  path: z.string().trim().min(1).startsWith("/"),
  fieldId: z.string().trim().min(1).max(128),
  textAnswer: z.string().max(2000).optional().nullable(),
  selectedOptionIds: z.array(z.string().trim().min(1).max(128)).max(12).optional(),
});

/** GET /api/pages/form-fields/stats query. */
export const formFieldStatsQuerySchema = z.object({
  path: z.string().trim().min(1).startsWith("/"),
  fieldId: z.string().trim().min(1).max(128),
});

export type SubmitFormFieldBody = z.infer<typeof submitFormFieldBodySchema>;
