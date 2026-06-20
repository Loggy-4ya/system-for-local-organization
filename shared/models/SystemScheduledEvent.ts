/**
 * @fileoverview System scheduled events Mongoose schema for Project Nexus.
 *
 * Persists future background jobs, execution states, retry histories, and locks
 * to guarantee robust scheduled event delivery.
 *
 * @module shared/models/SystemScheduledEvent
 */

import mongoose, { Document, Model, Schema } from "mongoose";

/** Allowed execution states for scheduled events. */
export type ScheduledEventStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

/**
 * TypeScript representation of a persisted Scheduled Event document.
 */
export interface ISystemScheduledEvent extends Document {
  /** Discriminator key indicating which handler should process the event. */
  eventType: string;
  /** Timestamp when the event is scheduled to execute. */
  dueAt: Date;
  /** Current state of the event execution lifecycle. */
  status: ScheduledEventStatus;
  /** Task-specific JSON payload needed by the handler. */
  payload: Record<string, any>;
  /** Optional key to enforce single scheduling (idempotency/deduplication). */
  idempotencyKey?: string;
  /** Number of times execution has been attempted. */
  attempts: number;
  /** Maximum number of retry attempts permitted before failing. */
  maxAttempts: number;
  /** Lock lease timestamp preventing concurrent processing by multiple instances. */
  lockedUntil: Date | null;
  /** Diagnostic error trace from the last failed execution attempt. */
  lastError?: string;
  /** Timestamp when the event reached completed status. */
  completedAt?: Date;
  /** Timestamp when the record was created. */
  createdAt: Date;
  /** Timestamp of the last record mutation. */
  updatedAt: Date;
}

const SystemScheduledEventSchema = new Schema<ISystemScheduledEvent>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    dueAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      required: true,
      default: "pending",
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
      default: () => ({}),
    },
    idempotencyKey: {
      type: String,
      index: { unique: true, sparse: true },
      trim: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      default: 3,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "system_scheduled_events",
  }
);

// Compound index for optimized "due event tick" retrieval queries
SystemScheduledEventSchema.index({ status: 1, dueAt: 1 });

const SystemScheduledEvent: Model<ISystemScheduledEvent> =
  mongoose.models.SystemScheduledEvent ??
  mongoose.model<ISystemScheduledEvent>("SystemScheduledEvent", SystemScheduledEventSchema);

export default SystemScheduledEvent;
