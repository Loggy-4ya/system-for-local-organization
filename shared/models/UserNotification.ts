/**
 * @fileoverview Per-user durable notification inbox rows.
 *
 * Canonical store for the personal notification center. Producers upsert by
 * `{ userId, deliveryKey }`; future Telegram/email/push dispatchers read the same rows.
 *
 * @module shared/models/UserNotification
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import {
  NOTIFICATION_INBOX_CHANNELS,
  NOTIFICATION_INBOX_VARIANTS,
  USER_NOTIFICATION_KINDS,
  type NotificationInboxChannel,
  type NotificationInboxVariant,
  type UserNotificationKind,
} from "@shared/constants/notificationInbox";

/**
 * One inbox notification for a single user.
 */
export interface IUserNotification extends Document {
  /** Recipient MongoDB user id (stringified ObjectId). */
  userId: string;
  /** Notification category for filtering and icons. */
  kind: UserNotificationKind;
  /** Idempotent upsert key (`broadcast:…`, `task_reminder:…`, …). */
  deliveryKey: string;
  /** Short headline. */
  title: string;
  /** Supporting body copy (plain text). */
  body: string;
  /** Visual tone in the inbox UI. */
  variant: NotificationInboxVariant;
  /** Optional deep link (`/tasks/…`, `/task-groups/…`). */
  actionHref: string | null;
  /** Optional back-reference to source document id. */
  sourceId: string | null;
  /** Channels this notification was intended for at creation time. */
  channels: NotificationInboxChannel[];
  /** When the user marked the row read; `null` means unread. */
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserNotificationSchema = new Schema<IUserNotification>(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, enum: USER_NOTIFICATION_KINDS, required: true, index: true },
    deliveryKey: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    variant: { type: String, enum: NOTIFICATION_INBOX_VARIANTS, default: "info" },
    actionHref: { type: String, default: null, trim: true, maxlength: 500 },
    sourceId: { type: String, default: null, trim: true, index: true },
    channels: {
      type: [String],
      enum: NOTIFICATION_INBOX_CHANNELS,
      default: () => ["web"],
    },
    readAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    collection: "user_notifications",
  },
);

UserNotificationSchema.index({ userId: 1, deliveryKey: 1 }, { unique: true });
UserNotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

const UserNotification: Model<IUserNotification> =
  mongoose.models.UserNotification ??
  mongoose.model<IUserNotification>("UserNotification", UserNotificationSchema);

export default UserNotification;
