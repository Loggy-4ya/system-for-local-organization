/**
 * @fileoverview Ephemeral Telegram bot wizard sessions (in-memory draft until submit).
 *
 * Report drafts live here only — nothing is written to task documents until the
 * wizard completes. TTL index drops expired rows automatically.
 *
 * @module shared/models/TelegramBotSession
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import type { ITaskMediaRef } from "@shared/models/Task";

/** Supported multi-step bot flows. */
export type TelegramBotSessionKind = "task_report";

/** Persisted in-progress `/task_report` draft. */
export interface ITelegramBotSession extends Omit<Document, "_id"> {
  /** Compound key `${chatId}:${telegramUserId}`. */
  _id: string;
  /** Telegram sender id. */
  telegramUserId: number;
  /** Private or group chat id. */
  chatId: number;
  /** Active wizard kind. */
  kind: TelegramBotSessionKind;
  /** Target MongoDB task id. */
  taskId: string;
  /** Index into the effective step list (after media allowance filtering). */
  stepIndex: number;
  /** Plain-text description collected during the wizard (not yet submitted). */
  description?: string;
  /** Uploaded media refs collected during the wizard. */
  media: ITaskMediaRef[];
  /** Hard expiry — MongoDB TTL index removes the document. */
  expiresAt: Date;
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

const TelegramBotSessionSchema = new Schema<ITelegramBotSession>(
  {
    _id: { type: String, required: true },
    telegramUserId: { type: Number, required: true, index: true },
    chatId: { type: Number, required: true, index: true },
    kind: { type: String, enum: ["task_report"], required: true },
    taskId: { type: String, required: true, trim: true },
    stepIndex: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, trim: true },
    media: { type: [TaskMediaRefSchema], default: [] },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "telegram_bot_sessions",
  },
);

TelegramBotSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TelegramBotSession: Model<ITelegramBotSession> =
  mongoose.models.TelegramBotSession ??
  mongoose.model<ITelegramBotSession>("TelegramBotSession", TelegramBotSessionSchema);

export default TelegramBotSession;

/**
 * Build the session document id for a chat + sender pair.
 *
 * @param chatId - Telegram chat id.
 * @param telegramUserId - Telegram user id.
 * @returns Stable session key.
 */
export function buildTelegramBotSessionId(chatId: number, telegramUserId: number): string {
  return `${chatId}:${telegramUserId}`;
}
