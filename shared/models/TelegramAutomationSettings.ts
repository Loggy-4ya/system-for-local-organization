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
  /** Ordered `/task_report` wizard steps (`description`, `media`). */
  reportFlowSteps: ("description" | "media")[];
  /** When true, dispatch admins may use `/completed` in bot chat. */
  botCompletedCommandEnabled: boolean;
  /** Header line for `/tasks` in a linked project group. */
  tasksHeaderTemplate: string;
  /** One line per open part in group `/tasks`. */
  tasksLineTemplate: string;
  /** Footer hints after group `/tasks`. */
  tasksFooterTemplate: string;
  /** Message when a linked group has no open parts. */
  tasksEmptyTemplate: string;
  /** Header for `/tasks` in private bot DM. */
  tasksDmHeaderTemplate: string;
  /** One line per assignment in DM `/tasks`. */
  tasksDmLineTemplate: string;
  /** Footer hints after DM `/tasks`. */
  tasksDmFooterTemplate: string;
  /** Message when DM user has no open assignments. */
  tasksDmEmptyTemplate: string;
  /** Reply when a group chat is not linked to Nexus. */
  tasksUnlinkedGroupTemplate: string;
  /** Picker when `/task_report` needs a task index. */
  taskReportPickTemplate: string;
  /** Prompt before collecting report description text. */
  taskReportDescriptionPromptTemplate: string;
  /** Prompt before collecting proof media. */
  taskReportMediaPromptTemplate: string;
  /** Sent after successful `/task_report` submission. */
  taskReportSuccessTemplate: string;
  /** Sent when the user runs `/cancel` during a report wizard. */
  taskReportCancelledTemplate: string;
  /** Sent when a new bot command discards an in-progress report draft. */
  taskReportSessionInterruptedTemplate: string;
  /** Sent after `/completed` succeeds. */
  taskCompletedSuccessTemplate: string;
  /** Sent when `/completed` is denied. */
  taskCompletedForbiddenTemplate: string;
  /** Header for `/see_report` output. */
  seeReportHeaderTemplate: string;
  /** Body lines for `/see_report` output. */
  seeReportBodyTemplate: string;
  /** When no performer report exists yet. */
  seeReportEmptyTemplate: string;
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
    reportFlowSteps: {
      type: [String],
      enum: ["description", "media"],
      default: () => [...DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.reportFlowSteps],
    },
    botCompletedCommandEnabled: {
      type: Boolean,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.botCompletedCommandEnabled,
    },
    tasksHeaderTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksHeaderTemplate,
      trim: true,
    },
    tasksLineTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksLineTemplate,
      trim: true,
    },
    tasksFooterTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksFooterTemplate,
      trim: true,
    },
    tasksEmptyTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksEmptyTemplate,
      trim: true,
    },
    tasksDmHeaderTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksDmHeaderTemplate,
      trim: true,
    },
    tasksDmLineTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksDmLineTemplate,
      trim: true,
    },
    tasksDmFooterTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksDmFooterTemplate,
      trim: true,
    },
    tasksDmEmptyTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksDmEmptyTemplate,
      trim: true,
    },
    tasksUnlinkedGroupTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.tasksUnlinkedGroupTemplate,
      trim: true,
    },
    taskReportPickTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskReportPickTemplate,
      trim: true,
    },
    taskReportDescriptionPromptTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskReportDescriptionPromptTemplate,
      trim: true,
    },
    taskReportMediaPromptTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskReportMediaPromptTemplate,
      trim: true,
    },
    taskReportSuccessTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskReportSuccessTemplate,
      trim: true,
    },
    taskReportCancelledTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskReportCancelledTemplate,
      trim: true,
    },
    taskReportSessionInterruptedTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskReportSessionInterruptedTemplate,
      trim: true,
    },
    taskCompletedSuccessTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskCompletedSuccessTemplate,
      trim: true,
    },
    taskCompletedForbiddenTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.taskCompletedForbiddenTemplate,
      trim: true,
    },
    seeReportHeaderTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.seeReportHeaderTemplate,
      trim: true,
    },
    seeReportBodyTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.seeReportBodyTemplate,
      trim: true,
    },
    seeReportEmptyTemplate: {
      type: String,
      default: DEFAULT_TELEGRAM_AUTOMATION_SETTINGS.seeReportEmptyTemplate,
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
