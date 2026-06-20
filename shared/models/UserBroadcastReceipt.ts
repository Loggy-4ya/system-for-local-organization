/**
 * @fileoverview Per-user broadcast delivery and dismissal receipts.
 *
 * Tracks web toast dismissals and Telegram DM outcomes without bloating user documents.
 *
 * @module shared/models/UserBroadcastReceipt
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * Receipt row linking a user to a broadcast delivery attempt.
 */
export interface IUserBroadcastReceipt extends Document {
  /** Parent broadcast document id. */
  broadcastId: Types.ObjectId;
  /** Target user MongoDB id (stringified). */
  userId: string;
  /** When the user dismissed the web toast (null = still active). */
  webDismissedAt: Date | null;
  /** When Telegram DM succeeded. */
  telegramDeliveredAt: Date | null;
  /** Last Telegram delivery error message. */
  telegramError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserBroadcastReceiptSchema = new Schema<IUserBroadcastReceipt>(
  {
    broadcastId: { type: Schema.Types.ObjectId, required: true, ref: "SystemBroadcast", index: true },
    userId: { type: String, required: true, index: true },
    webDismissedAt: { type: Date, default: null },
    telegramDeliveredAt: { type: Date, default: null },
    telegramError: { type: String, default: null, trim: true },
  },
  {
    timestamps: true,
    collection: "user_broadcast_receipts",
  },
);

UserBroadcastReceiptSchema.index({ broadcastId: 1, userId: 1 }, { unique: true });

export const UserBroadcastReceipt: Model<IUserBroadcastReceipt> =
  mongoose.models.UserBroadcastReceipt ??
  mongoose.model<IUserBroadcastReceipt>("UserBroadcastReceipt", UserBroadcastReceiptSchema);

export default UserBroadcastReceipt;
