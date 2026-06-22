/**
 * @fileoverview Task group Mongoose schema — multi-part projects with long-run reminders.
 *
 * @module shared/models/TaskGroup
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { TaskGroupStatus } from "@shared/constants/taskSettings";
import {
  DEFAULT_TASK_GROUP_REMINDER_SETTINGS,
  TASK_GROUP_STATUSES,
} from "@shared/constants/taskSettings";
import type { ITaskReminderSettings } from "@shared/models/Task";
import {
  TELEGRAM_OPERATOR_PENDING_ACTIONS,
  type TelegramWorkspaceState,
  type TelegramWorkspaceStrategy,
  type TelegramOperatorPendingAction,
} from "@shared/constants/telegramWorkspace";

/** Telegram workspace binding for a multi-part project. */
export interface ITaskGroupTelegramWorkspace {
  /** Per-project strategy override — `inherit` uses global defaults. */
  strategy: TelegramWorkspaceStrategy;
  /** Provisioning lifecycle state. */
  state: TelegramWorkspaceState;
  /** Telegram supergroup chat id once linked. */
  chatId: number | null;
  /** Cached chat title from Telegram. */
  chatTitle: string | null;
  /** Public invite link when available. */
  inviteLink: string | null;
  /** Short token for `/link <token>` bot command. */
  linkToken: string | null;
  /** When the chat was bound to this project. */
  linkedAt: Date | null;
  /** Nexus user id who completed the link. */
  linkedByUserId: Types.ObjectId | null;
  /** Last provisioning or sync error message. */
  lastError: string | null;
  /** Last successful sync or state transition. */
  lastSyncAt: Date | null;
  /** When true, the linked supergroup uses forum topics for task parts. */
  forumEnabled: boolean;
  /** MTProto maintenance job queued for telegram-worker (forum, invites, dismantle). */
  operatorPendingAction: TelegramOperatorPendingAction | null;
}

/** Planned project team member declared before child tasks exist. */
export interface ITaskGroupRosterMember {
  /** Institution user id. */
  userId: Types.ObjectId;
  /** Denormalized display label for list UIs. */
  displayName: string;
  /** Denormalized profile photo URL. */
  avatar?: string | null;
  /** Optional project-level role label (e.g. "Logistics lead"). */
  roleLabel?: string;
  /** When the member was added to the roster. */
  addedAt: Date;
}

/** A grouped project containing multiple related task documents. */
export interface ITaskGroup extends Document {
  /** Project headline. */
  title: string;
  /** Overview of the combined work. */
  description: string;
  /** Group lifecycle status. */
  status: TaskGroupStatus;
  /** Obsidian-style category tags. */
  tags: string[];
  /** Optional overall project deadline. */
  dueAt: Date | null;
  /** Historical completion timestamps — supports redo cycles. */
  completedAtHistory: Date[];
  /** Group creator. */
  authorUserId: Types.ObjectId;
  /** Denormalized author label for lists. */
  authorDisplayName: string;
  /** Long-run reminder settings for open parts across child tasks. */
  reminderSettings: ITaskReminderSettings;
  /** Aggregated performer ids from roster + child tasks for list/access filters. */
  performerUserIds: Types.ObjectId[];
  /** Pre-declared project team — used before child task parts are created. */
  plannedRoster: ITaskGroupRosterMember[];
  /** Optional Telegram group workspace for this project. */
  telegramWorkspace: ITaskGroupTelegramWorkspace;
  createdAt: Date;
  updatedAt: Date;
}

const TaskGroupTelegramWorkspaceSchema = new Schema<ITaskGroupTelegramWorkspace>(
  {
    strategy: {
      type: String,
      enum: ["inherit", "auto", "manual_link", "user_session", "disabled"],
      default: "inherit",
    },
    state: {
      type: String,
      enum: [
        "none",
        "queued",
        "provisioning",
        "awaiting_manual_link",
        "active",
        "failed",
        "dismantling",
        "closed",
      ],
      default: "none",
    },
    chatId: { type: Number, default: null },
    chatTitle: { type: String, default: null, trim: true },
    inviteLink: { type: String, default: null, trim: true },
    linkToken: { type: String, default: null, trim: true },
    linkedAt: { type: Date, default: null },
    linkedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastError: { type: String, default: null, trim: true },
    lastSyncAt: { type: Date, default: null },
    forumEnabled: { type: Boolean, default: false },
    operatorPendingAction: {
      type: String,
      enum: TELEGRAM_OPERATOR_PENDING_ACTIONS,
      default: null,
    },
  },
  { _id: false },
);

const TaskGroupRosterMemberSchema = new Schema<ITaskGroupRosterMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    displayName: { type: String, required: true, trim: true },
    avatar: { type: String, default: null, trim: true },
    roleLabel: { type: String, trim: true },
    addedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const TaskGroupReminderSettingsSchema = new Schema<ITaskReminderSettings>(
  {
    enabled: { type: Boolean, default: DEFAULT_TASK_GROUP_REMINDER_SETTINGS.enabled },
    mode: { type: String, enum: ["every", "before_due", "ongoing", "on_dates"], default: "ongoing" },
    value: { type: Number, default: DEFAULT_TASK_GROUP_REMINDER_SETTINGS.value, min: 1 },
    unit: { type: String, enum: ["minutes", "hours", "days", "weeks"], default: "weeks" },
    channels: {
      type: [String],
      enum: ["web", "telegram"],
      default: () => [...DEFAULT_TASK_GROUP_REMINDER_SETTINGS.channels],
    },
    repeatUntilDue: { type: Boolean, default: false },
    atTime: { type: String, default: DEFAULT_TASK_GROUP_REMINDER_SETTINGS.atTime, trim: true },
    weekdays: {
      type: [Number],
      default: () => [...DEFAULT_TASK_GROUP_REMINDER_SETTINGS.weekdays],
    },
    scheduledDates: { type: [String], default: [] },
    repeatYearlyOnDates: { type: Boolean, default: false },
  },
  { _id: false },
);

const TaskGroupSchema = new Schema<ITaskGroup>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: TASK_GROUP_STATUSES,
      default: "draft",
      index: true,
    },
    tags: { type: [String], default: [] },
    dueAt: { type: Date, default: null, index: true },
    completedAtHistory: { type: [Date], default: [] },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorDisplayName: { type: String, required: true, trim: true },
    reminderSettings: {
      type: TaskGroupReminderSettingsSchema,
      default: () => ({
        enabled: DEFAULT_TASK_GROUP_REMINDER_SETTINGS.enabled,
        mode: "ongoing",
        value: DEFAULT_TASK_GROUP_REMINDER_SETTINGS.value,
        unit: "weeks",
        channels: ["web"],
        repeatUntilDue: false,
        atTime: DEFAULT_TASK_GROUP_REMINDER_SETTINGS.atTime,
        weekdays: [...DEFAULT_TASK_GROUP_REMINDER_SETTINGS.weekdays],
      }),
    },
    performerUserIds: { type: [Schema.Types.ObjectId], default: [], index: true },
    plannedRoster: { type: [TaskGroupRosterMemberSchema], default: [] },
    telegramWorkspace: {
      type: TaskGroupTelegramWorkspaceSchema,
      default: () => ({
        strategy: "inherit",
        state: "none",
        chatId: null,
        chatTitle: null,
        inviteLink: null,
        linkToken: null,
        linkedAt: null,
        linkedByUserId: null,
        lastError: null,
        lastSyncAt: null,
        forumEnabled: false,
        operatorPendingAction: null,
      }),
    },
  },
  {
    timestamps: true,
    collection: "task_groups",
  },
);

const TaskGroup: Model<ITaskGroup> =
  mongoose.models.TaskGroup ?? mongoose.model<ITaskGroup>("TaskGroup", TaskGroupSchema);

export default TaskGroup;
