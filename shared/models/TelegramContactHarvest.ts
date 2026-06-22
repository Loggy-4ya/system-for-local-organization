/**
 * @fileoverview Staging store for Telegram-shared phone numbers before Nexus registration.
 *
 * When a visitor shares their contact via the bot but has no `users` row yet, the
 * normalized phone is stored here keyed by `telegramId` until Mini App onboarding
 * or a later account link consumes it.
 *
 * @module shared/models/TelegramContactHarvest
 */

import mongoose, { Document, Model, Schema } from "mongoose";

/** Persisted harvested phone awaiting account creation. */
export interface ITelegramContactHarvest extends Document {
  /** Telegram numeric user id — unique across harvest rows. */
  telegramId: number;
  /** Normalized international phone string. */
  phone: string;
  /** Last time the user shared this contact with the bot. */
  harvestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TelegramContactHarvestSchema = new Schema<ITelegramContactHarvest>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    phone: { type: String, required: true, trim: true },
    harvestedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

const TelegramContactHarvest: Model<ITelegramContactHarvest> =
  (mongoose.models.TelegramContactHarvest as Model<ITelegramContactHarvest> | undefined) ??
  mongoose.model<ITelegramContactHarvest>("TelegramContactHarvest", TelegramContactHarvestSchema);

export default TelegramContactHarvest;
