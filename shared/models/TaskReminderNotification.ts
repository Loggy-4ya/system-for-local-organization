/**
 * @fileoverview Per-user task reminder delivery rows for web toasts and Telegram DMs.
 *
 * @module shared/models/TaskReminderNotification
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

/** Toast tone for web reminder surfaces. */
export type TaskReminderNotificationVariant = "info" | "warning";

/**
 * One reminder fire delivery attempt for a single performer.
 */
export interface ITaskReminderNotification extends Document {
  /** Delivery target — single task, group summary, or institutional calendar rule. */
  kind: "task" | "group" | "institutional";
  /** Parent task id when {@link kind} is `task`. */
  taskId?: Types.ObjectId | null;
  /** Parent group id when {@link kind} is `group`. */
  groupId?: Types.ObjectId | null;
  /** Institutional calendar rule id when {@link kind} is `institutional`. */
  ruleId?: Types.ObjectId | null;
  /** Target performer user id. */
  userId: string;
  /** Unique key for this scheduler fire (`taskId:isoTimestamp`). */
  deliveryKey: string;
  /** Toast headline. */
  title: string;
  /** Supporting message body. */
  body: string;
  /** Visual tone on web. */
  variant: TaskReminderNotificationVariant;
  /** When false, row exists only for Telegram tracking. */
  webChannel: boolean;
  /** When the user dismissed the web toast. */
  webDismissedAt: Date | null;
  /** When Telegram DM succeeded. */
  telegramDeliveredAt: Date | null;
  /** Last Telegram delivery error. */
  telegramError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskReminderNotificationSchema = new Schema<ITaskReminderNotification>(
  {
    kind: { type: String, enum: ["task", "group", "institutional"], default: "task", index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: "TaskGroup", default: null, index: true },
    ruleId: { type: Schema.Types.ObjectId, ref: "InstitutionalCalendarRule", default: null, index: true },
    userId: { type: String, required: true, index: true },
    deliveryKey: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    variant: { type: String, enum: ["info", "warning"], default: "info" },
    webChannel: { type: Boolean, default: true },
    webDismissedAt: { type: Date, default: null },
    telegramDeliveredAt: { type: Date, default: null },
    telegramError: { type: String, default: null, trim: true },
  },
  {
    timestamps: true,
    collection: "task_reminder_notifications",
  },
);

TaskReminderNotificationSchema.index({ userId: 1, deliveryKey: 1 }, { unique: true });
TaskReminderNotificationSchema.index({ userId: 1, webDismissedAt: 1, createdAt: -1 });

const TaskReminderNotification: Model<ITaskReminderNotification> =
  mongoose.models.TaskReminderNotification ??
  mongoose.model<ITaskReminderNotification>(
    "TaskReminderNotification",
    TaskReminderNotificationSchema,
  );

export default TaskReminderNotification;
