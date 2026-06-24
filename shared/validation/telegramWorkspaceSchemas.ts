/**
 * @fileoverview Zod validation for Telegram workspace automation settings and project overrides.
 *
 * @module shared/validation/telegramWorkspaceSchemas
 */

import { z } from "zod";
import {
  TELEGRAM_REPORT_FLOW_STEPS,
  TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS,
  TELEGRAM_WORKSPACE_PROJECT_STRATEGIES,
} from "@shared/constants/telegramWorkspace";

const reportFlowStepsSchema = z
  .array(z.enum(TELEGRAM_REPORT_FLOW_STEPS))
  .min(1)
  .max(2)
  .refine((steps) => new Set(steps).size === steps.length, {
    message: "Report flow steps must be unique.",
  });

/** PATCH automation settings body. */
export const telegramAutomationSettingsUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  defaultStrategy: z.enum(["auto", "manual_link", "user_session", "disabled"]).optional(),
  autoProvisionOnActivate: z.boolean().optional(),
  minPerformersForAutoGroup: z.number().int().min(0).max(500).optional(),
  createForumTopicPerTask: z.boolean().optional(),
  taskForumTopicWelcomeTemplate: z.string().trim().min(1).max(4000).optional(),
  dismantleOnComplete: z.boolean().optional(),
  dismantleAction: z.enum(TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS).optional(),
  groupTitleTemplate: z.string().trim().min(1).max(128).optional(),
  groupWelcomeTemplate: z.string().trim().min(1).max(4000).optional(),
  dismantleNoticeTemplate: z.string().trim().min(1).max(4000).optional(),
  linkCommandHelpTemplate: z.string().trim().min(1).max(4000).optional(),
  reportFlowSteps: reportFlowStepsSchema.optional(),
  botCompletedCommandEnabled: z.boolean().optional(),
  tasksHeaderTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksLineTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksFooterTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksEmptyTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksDmHeaderTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksDmLineTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksDmFooterTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksDmEmptyTemplate: z.string().trim().min(1).max(4000).optional(),
  tasksUnlinkedGroupTemplate: z.string().trim().min(1).max(4000).optional(),
  taskReportPickTemplate: z.string().trim().min(1).max(4000).optional(),
  taskReportDescriptionPromptTemplate: z.string().trim().min(1).max(4000).optional(),
  taskReportMediaPromptTemplate: z.string().trim().min(1).max(4000).optional(),
  taskReportSuccessTemplate: z.string().trim().min(1).max(4000).optional(),
  taskReportCancelledTemplate: z.string().trim().min(1).max(4000).optional(),
  taskReportSessionInterruptedTemplate: z.string().trim().min(1).max(4000).optional(),
  taskCompletedSuccessTemplate: z.string().trim().min(1).max(4000).optional(),
  taskCompletedForbiddenTemplate: z.string().trim().min(1).max(4000).optional(),
  seeReportHeaderTemplate: z.string().trim().min(1).max(4000).optional(),
  seeReportBodyTemplate: z.string().trim().min(1).max(4000).optional(),
  seeReportEmptyTemplate: z.string().trim().min(1).max(4000).optional(),
});

/** PATCH per-project workspace strategy. */
export const taskGroupTelegramWorkspacePatchSchema = z.object({
  strategy: z.enum(TELEGRAM_WORKSPACE_PROJECT_STRATEGIES).optional(),
  requeue: z.boolean().optional().default(false),
});

export type TelegramAutomationSettingsUpdateInput = z.infer<
  typeof telegramAutomationSettingsUpdateSchema
>;
export type TaskGroupTelegramWorkspacePatchInput = z.infer<
  typeof taskGroupTelegramWorkspacePatchSchema
>;
