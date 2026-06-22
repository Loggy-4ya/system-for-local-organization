/**
 * @fileoverview Singleton Telegram workspace automation settings.
 *
 * Admins edit live via `/admin/telegram-workspaces` — no redeploy required.
 * Operator MTProto credentials stay in env ({@link TELEGRAM_OPERATOR_SESSION}), not MongoDB.
 *
 * @module shared/models/TelegramAutomationSettings
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import {
  DEFAULT_TELEGRAM_AUTOMATION_SETTINGS,
  TELEGRAM_AUTOMATION_SETTINGS_ID,
  TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS,
  type TelegramWorkspaceDismantleAction,
} from "@shared/constants/telegramWorkspace";

export { TELEGRAM_AUTOMATION_SETTINGS_ID };

/** Persisted Telegram workspace automation singleton. */
export interface ITelegramAutomationSettings extends Omit<Document, "_id"> {
  /** Singleton key — always {@link TELEGRAM_AUTOMATION_SETTINGS_ID}. */
  _id: string;
  /** Master switch — when false, no provisioning runs. */
  enabled: boolean;
  /** Default strategy for new projects (`inherit` is per-project only). */
  defaultStrategy: "auto" | "manual_link" | "user_session" | "disabled";
  /** When true, activating a project queues workspace provisioning. */
  autoProvisionOnActivate: boolean;
  /** Skip auto group when fewer performers are assigned across child tasks. */
  minPerformersForAutoGroup: number;
  /** When true, dispatched child tasks create a forum topic in linked project groups. */
  createForumTopicPerTask: boolean;
  /** Message posted inside a newly created task forum topic. */
  taskForumTopicWelcomeTemplate: string;
  /** Queue dismantle job when project completes or is cancelled. */
  dismantleOnComplete: boolean;
  /** How to handle the linked chat on dismantle. */
  dismantleAction: TelegramWorkspaceDismantleAction;
  /** Telegram group title template — supports `{{title}}`. */
  groupTitleTemplate: string;
  /** Message posted after a group is linked. */
  groupWelcomeTemplate: string;
  /** Message posted when project completes (archive_notice action). */
  dismantleNoticeTemplate: string;
  /** DM/help copy explaining manual /link flow. */
  linkCommandHelpTemplate: string;
  createdAt: Date;
  updatedAt: Date;
}

const TelegramAutomationSettingsSchema = new Schema<ITelegramAutomationSettings>(
  {
    _id: {
      type: String,
      default: TELEGRAM_AUTOMATION_SETTINGS_ID,
    },
    enabled: { type: Boolean, default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.enabled },
    defaultStrategy: {
      type: String,
      enum: ["auto", "manual_link", "user_session", "disabled"],
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.defaultStrategy,
    },
    autoProvisionOnActivate: {
      type: Boolean,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.autoProvisionOnActivate,
    },
    minPerformersForAutoGroup: {
      type: Number,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.minPerformersForAutoGroup,
      min: 0,
      max: 500,
    },
    createForumTopicPerTask: {
      type: Boolean,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.createForumTopicPerTask,
    },
    taskForumTopicWelcomeTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskForumTopicWelcomeTemplate,
      trim: true,
    },
    dismantleOnComplete: {
      type: Boolean,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.dismantleOnComplete,
    },
    dismantleAction: {
      type: String,
      enum: TELEGRAM_WORKSPACE_DISMANTLE_ACTIONS,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.dismantleAction,
    },
    groupTitleTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.groupTitleTemplate,
      trim: true,
    },
    groupWelcomeTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.groupWelcomeTemplate,
      trim: true,
    },
    dismantleNoticeTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.dismantleNoticeTemplate,
      trim: true,
    },
    linkCommandHelpTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.linkCommandHelpTemplate,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "telegram_automation_settings",
  },
);

const TelegramAutomationSettings: Model<ITelegramAutomationSettings> =
  mongoose.models.TelegramAutomationSettings ??
  mongoose.model<ITelegramAutomationSettings>(
    "TelegramAutomationSettings",
    TelegramAutomationSettingsSchema,
  );

export default TelegramAutomationSettings;
