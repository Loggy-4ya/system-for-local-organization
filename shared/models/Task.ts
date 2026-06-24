/**
 * @fileoverview Nexus task Mongoose schema — assignments, reports, scoring, reminders.
 *
 * @module shared/models/Task
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type {
  TaskReminderChannel,
  TaskReminderMode,
  TaskReminderUnit,
  TaskStatus,
  TaskAssignmentNotifyTarget,
} from "@shared/constants/taskSettings";
import {
  DEFAULT_TASK_ASSIGNMENT_NOTIFY_TARGETS,
  DEFAULT_TASK_REMINDER_SETTINGS,
} from "@shared/constants/taskSettings";
import { TASK_STATUSES } from "@shared/constants/taskSettings";

/** Uploaded media reference attached to a task or report. */
export interface ITaskMediaRef {
  /** Public URL under `/uploads/task-reports/`. */
  url: string;
  /** MIME type when known. */
  mimeType?: string;
  /** Media kind for rendering. */
  kind: "image" | "video";
}

/** Performer completion report with proof media. */
export interface ITaskReport {
  /** Rich-text or plain description of work done. */
  description: string;
  /** Proof photos/videos. */
  media: ITaskMediaRef[];
  /** Server timestamp when the report was submitted. */
  submittedAt: Date;
}

/** One assigned performer on a task with optional score and report. */
export interface ITaskPerformer {
  /** Assigned user id. */
  userId: Types.ObjectId;
  /** Denormalized display label for list UIs. */
  displayName: string;
  /** Denormalized profile photo URL for list UIs. */
  avatar?: string | null;
  /** Optional role label (e.g. "Lead", "Reviewer"). */
  roleLabel?: string;
  /** User who assigned this performer (author or delegator). */
  assignedByUserId: Types.ObjectId;
  /** When the performer was added. */
  assignedAt: Date;
  /** When the performer explicitly acknowledged receipt. */
  acknowledgedAt?: Date | null;
  /** Raw quality coefficient percent (Q, 0–200). */
  qualityPercent?: number | null;
  /** Raw time coefficient percent (T, 0–200). */
  timePercent?: number | null;
  /** @deprecated Legacy fields — migrated on read. */
  qualityScore?: number | null;
  /** @deprecated Legacy fields — migrated on read. */
  timeScore?: number | null;
  /** @deprecated Legacy weight 0–1 — migrated on read. */
  qualityCoefficient?: number | null;
  /** @deprecated Legacy weight 0–1 — migrated on read. */
  timeCoefficient?: number | null;
  /** Final score: B × Q% × T%. */
  score?: number | null;
  /** Completion report from this performer. */
  report?: ITaskReport | null;
}

/** Periodic reminder configuration for a task. */
export interface ITaskReminderSettings {
  /** When true, scheduler enqueues `task_reminder` events. */
  enabled: boolean;
  /** Repeat cadence or deadline-relative scheduling. */
  mode: TaskReminderMode;
  /** Interval amount paired with {@link unit}. */
  value: number;
  /** Time unit for {@link value}. */
  unit: TaskReminderUnit;
  /** Delivery channels (web toast, Telegram DM). */
  channels: TaskReminderChannel[];
  /** When mode is `before_due`, repeat every value+unit until the deadline. */
  repeatUntilDue?: boolean;
  /** Optional local clock anchor (`HH:mm`) for day/week schedules. */
  atTime?: string | null;
  /** Selected weekdays (`Date#getDay()` 0–6) when {@link unit} is `weeks`. */
  weekdays?: number[];
  /** Explicit fire instants (ISO strings) when {@link mode} is `on_dates`. */
  scheduledDates?: string[];
  /** When true, roll {@link scheduledDates} to the same month/day each year. */
  repeatYearlyOnDates?: boolean;
}

/** TypeScript representation of a persisted Task document. */
export interface ITask extends Document {
  /** Task headline. */
  title: string;
  /** Rich-text description (sanitized HTML). */
  description: string;
  /** Lifecycle status. */
  status: TaskStatus;
  /** Photos/videos explaining the assignment. */
  explanationMedia: ITaskMediaRef[];
  /** Obsidian-style category tags (same normalisation as pages). */
  tags: string[];
  /** Institutional task category slug — drives scoring coefficient defaults. */
  categoryId: string | null;
  /** Denormalized category label for lists. */
  categoryLabel: string | null;
  /** Base score (B) for this task — set by the author when scoring. */
  baseScore: number | null;
  /** How performers are notified on dispatch (Telegram DM and/or project group). */
  assignmentNotifyTargets: TaskAssignmentNotifyTarget[];
  /** When true, performers may attach proof media in completion reports (web + bot). */
  reportMediaAllowed: boolean;
  /** Optional deadline. */
  dueAt: Date | null;
  /** Historical completion timestamps — supports redo cycles. */
  completedAtHistory: Date[];
  /** Task creator. */
  authorUserId: Types.ObjectId;
  /** Denormalized author label for lists. */
  authorDisplayName: string;
  /** Assigned performers with per-user reports and scores. */
  performers: ITaskPerformer[];
  /** Periodic reminder settings. */
  reminderSettings: ITaskReminderSettings;
  /** Number of delegation hops on this task chain. */
  delegationCount: number;
  /** Optional parent task group (multi-part project). */
  groupId?: Types.ObjectId | null;
  /** Denormalized group title for list surfaces. */
  groupTitle?: string | null;
  /** Telegram forum topic id when the parent project workspace uses topics. */
  telegramForumTopicId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskMediaRefSchema = new Schema<ITaskMediaRef>(
  {
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    kind: { type: String, enum: ["image", "video"], required: true },
  },
  { _id: false },
);

const TaskReportSchema = new Schema<ITaskReport>(
  {
    description: { type: String, required: true, trim: true },
    media: { type: [TaskMediaRefSchema], default: [] },
    submittedAt: { type: Date, required: true },
  },
  { _id: false },
);

const TaskPerformerSchema = new Schema<ITaskPerformer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    displayName: { type: String, required: true, trim: true },
    avatar: { type: String, default: null, trim: true },
    roleLabel: { type: String, trim: true },
    assignedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedAt: { type: Date, required: true, default: Date.now },
    acknowledgedAt: { type: Date, default: null },
    qualityPercent: { type: Number, min: 0, max: 200, default: null },
    timePercent: { type: Number, min: 0, max: 200, default: null },
    qualityScore: { type: Number, min: 0, max: 100, default: null },
    timeScore: { type: Number, min: 0, max: 100, default: null },
    qualityCoefficient: { type: Number, min: 0.05, max: 1, default: null },
    timeCoefficient: { type: Number, min: 0.05, max: 1, default: null },
    score: { type: Number, min: 0, max: 10000, default: null },
    report: { type: TaskReportSchema, default: null },
  },
  { _id: false },
);

const TaskReminderSettingsSchema = new Schema<ITaskReminderSettings>(
  {
    enabled: { type: Boolean, default: false },
    mode: { type: String, enum: ["every", "before_due", "ongoing", "on_dates"], default: "every" },
    value: { type: Number, default: DEFAULT_TASK_REMINDER_SETTINGS.value, min: 1 },
    unit: { type: String, enum: ["minutes", "hours", "days", "weeks"], default: "hours" },
    channels: {
      type: [String],
      enum: ["web", "telegram"],
      default: ["web"],
    },
    repeatUntilDue: { type: Boolean, default: false },
    atTime: { type: String, default: null, trim: true },
    weekdays: { type: [Number], default: [] },
    scheduledDates: { type: [String], default: [] },
    repeatYearlyOnDates: { type: Boolean, default: false },
  },
  { _id: false },
);

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "draft",
      index: true,
    },
    explanationMedia: { type: [TaskMediaRefSchema], default: [] },
    tags: { type: [String], default: [] },
    categoryId: { type: String, default: null, trim: true, index: true },
    categoryLabel: { type: String, default: null, trim: true },
    baseScore: { type: Number, default: null, min: 0, max: 10000 },
    assignmentNotifyTargets: {
      type: [String],
      enum: ["telegram_dm", "telegram_group"],
      default: () => [...DEFAULT_TASK_ASSIGNMENT_NOTIFY_TARGETS],
    },
    reportMediaAllowed: { type: Boolean, default: false },
    dueAt: { type: Date, default: null, index: true },
    completedAtHistory: { type: [Date], default: [] },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorDisplayName: { type: String, required: true, trim: true },
    performers: { type: [TaskPerformerSchema], default: [] },
    reminderSettings: {
      type: TaskReminderSettingsSchema,
      default: () => ({
        enabled: false,
        mode: "every",
        value: DEFAULT_TASK_REMINDER_SETTINGS.value,
        unit: "hours",
        channels: ["web"],
        repeatUntilDue: false,
        atTime: null,
      }),
    },
    delegationCount: { type: Number, default: 0, min: 0 },
    groupId: { type: Schema.Types.ObjectId, ref: "TaskGroup", default: null, index: true },
    groupTitle: { type: String, default: null, trim: true },
    telegramForumTopicId: { type: Number, default: null },
  },
  {
    timestamps: true,
    collection: "tasks",
  },
);

TaskSchema.index({ "performers.userId": 1, status: 1 });
TaskSchema.index({ tags: 1 });
TaskSchema.index({ groupId: 1, status: 1 });

const Task: Model<ITask> = mongoose.models.Task ?? mongoose.model<ITask>("Task", TaskSchema);

export default Task;
