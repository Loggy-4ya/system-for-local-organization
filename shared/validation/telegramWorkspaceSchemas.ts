/**
 * @fileoverview Zod validation for Telegram workspace automation settings and project overrides.
 *
 * @module shared/validation/telegramWorkspaceSchemas
 */

import { z } from "zod";
import {
  TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS,
  TELEGRAM_WORKSPACE_PROJECT_STRATEGIES,
} from "@shared/constants/telegramWorkspace";

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
