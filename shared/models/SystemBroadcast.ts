/**
 * @fileoverview System-wide broadcast message documents.
 *
 * Created by authorised administrators and delivered through one or more channels
 * ({@link BroadcastChannel}) to all users in the system.
 *
 * @module shared/models/SystemBroadcast
 */

import mongoose, { Document, Model, Schema } from "mongoose";

/** Toast visual tone on the web client. */
export type BroadcastToastVariant = "info" | "success" | "warning" | "error";

/** Aggregated delivery counters written after dispatch. */
export interface IBroadcastDeliveryStats {
  /** Total user documents at send time. */
  totalUsers: number;
  /** Users eligible for web toast delivery. */
  webToastEligible: number;
  /** Users with a linked `telegramId`. */
  telegramEligible: number;
  /** Successful Telegram DM deliveries. */
  telegramSent: number;
  /** Failed Telegram DM deliveries. */
  telegramFailed: number;
}

/**
 * Persisted broadcast message.
 */
export interface ISystemBroadcast extends Document {
  /** Optional short headline shown in toast title row. */
  title: string | null;
  /** Primary message body (plain text). */
  body: string;
  /** Web toast colour variant. */
  variant: BroadcastToastVariant;
  /** Delivery channels requested for this broadcast. */
  channels: string[];
  /** MongoDB id of the administrator who sent the broadcast. */
  createdByUserId: string;
  /** When set, web toasts hide after this timestamp. */
  expiresAt: Date | null;
  /** Post-dispatch delivery summary. */
  deliveryStats: IBroadcastDeliveryStats;
  createdAt: Date;
  updatedAt: Date;
}

const SystemBroadcastSchema = new Schema<ISystemBroadcast>(
  {
    title: { type: String, default: null, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    variant: {
      type: String,
      enum: ["info", "success", "warning", "error"] satisfies BroadcastToastVariant[],
      default: "info",
    },
    channels: { type: [String], required: true, default: [] },
    createdByUserId: { type: String, required: true, index: true },
    expiresAt: { type: Date, default: null, index: true },
    deliveryStats: {
      type: {
        totalUsers: { type: Number, default: 0, min: 0 },
        webToastEligible: { type: Number, default: 0, min: 0 },
        telegramEligible: { type: Number, default: 0, min: 0 },
        telegramSent: { type: Number, default: 0, min: 0 },
        telegramFailed: { type: Number, default: 0, min: 0 },
      },
      required: true,
      default: () => ({
        totalUsers: 0,
        webToastEligible: 0,
        telegramEligible: 0,
        telegramSent: 0,
        telegramFailed: 0,
      }),
    },
  },
  {
    timestamps: true,
    collection: "system_broadcasts",
  },
);

SystemBroadcastSchema.index({ createdAt: -1 });
SystemBroadcastSchema.index({ channels: 1, expiresAt: 1 });

export const SystemBroadcast: Model<ISystemBroadcast> =
  mongoose.models.SystemBroadcast ??
  mongoose.model<ISystemBroadcast>("SystemBroadcast", SystemBroadcastSchema);

export default SystemBroadcast;
