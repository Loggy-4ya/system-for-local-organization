/**
 * @fileoverview MongoDB audit trail for blocked or altered user-authored content.
 *
 * Stores sanitization diffs without persisting raw malicious payloads.
 *
 * @module shared/models/SecuritySanitizeAudit
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { PuckSanitizeFieldEvent } from "@shared/lib/puckContentSanitizeReport";

/** Originating pipeline that performed sanitization. */
export type SecuritySanitizeSource = "puck_save";

/**
 * Persisted security sanitization audit document.
 */
export interface ISecuritySanitizeAudit extends Document {
  /** Pipeline that emitted the audit (e.g. Puck page save). */
  source: SecuritySanitizeSource;
  /** Affected page path when source is `puck_save`. */
  pagePath: string;
  /** Editor user id when authenticated. */
  actorUserId?: string;
  /** Number of mutated fields in this pass. */
  eventCount: number;
  /** Per-field sanitization metadata (no raw payload values). */
  events: PuckSanitizeFieldEvent[];
  /** Record creation timestamp. */
  createdAt: Date;
  /** Record update timestamp. */
  updatedAt: Date;
}

const SecuritySanitizeAuditSchema = new Schema<ISecuritySanitizeAudit>(
  {
    source: {
      type: String,
      enum: ["puck_save"],
      required: true,
      index: true,
    },
    pagePath: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    actorUserId: {
      type: String,
      trim: true,
      index: true,
    },
    eventCount: {
      type: Number,
      required: true,
      min: 1,
    },
    events: {
      type: [
        {
          path: { type: String, required: true },
          kind: {
            type: String,
            enum: ["href", "media", "url", "rich-text"],
            required: true,
          },
          originalLength: { type: Number, required: true },
          sanitizedLength: { type: Number, required: true },
        },
      ],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "security_sanitize_audits",
  },
);

SecuritySanitizeAuditSchema.index({ createdAt: -1 });

const SecuritySanitizeAudit: Model<ISecuritySanitizeAudit> =
  mongoose.models.SecuritySanitizeAudit ??
  mongoose.model<ISecuritySanitizeAudit>(
    "SecuritySanitizeAudit",
    SecuritySanitizeAuditSchema,
  );

export default SecuritySanitizeAudit;
