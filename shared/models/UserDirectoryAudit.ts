/**
 * @fileoverview MongoDB audit trail for User Directory admin mutations.
 *
 * Records who changed what (field keys and safe metadata only — no PII payloads).
 *
 * @module shared/models/UserDirectoryAudit
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

/** Supported user-directory audit actions. */
export type UserDirectoryAuditAction = "user_update" | "user_delete";

/**
 * Persisted user directory admin audit document.
 */
export interface IUserDirectoryAudit extends Document {
  /** Mutation kind. */
  action: UserDirectoryAuditAction;
  /** Whether the operation completed successfully. */
  success: boolean;
  /** Acting admin user id. */
  actorUserId: string;
  /** Acting admin login handle when available. */
  actorLogin: string | null;
  /** Target user id. */
  targetUserId: string;
  /** Target display name at action time (no email/phone). */
  targetDisplayName: string | null;
  /** Short human-readable summary for the logs UI. */
  summary: string;
  /** Patch keys or domains touched (e.g. accessLevelIndex, delegatedPermissions). */
  changedFields: string[];
  /** Machine-readable failure code when `success` is false. */
  errorCode: string | null;
  /** Non-PII structured metadata (counts, level indices). */
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const UserDirectoryAuditSchema = new Schema<IUserDirectoryAudit>(
  {
    action: {
      type: String,
      enum: ["user_update", "user_delete"],
      required: true,
      index: true,
    },
    success: { type: Boolean, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorLogin: { type: String, default: null, trim: true },
    targetUserId: { type: String, required: true, index: true },
    targetDisplayName: { type: String, default: null, trim: true },
    summary: { type: String, required: true, trim: true },
    changedFields: { type: [String], default: [] },
    errorCode: { type: String, default: null, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: "user_directory_audits",
  },
);

UserDirectoryAuditSchema.index({ createdAt: -1 });

const UserDirectoryAudit: Model<IUserDirectoryAudit> =
  mongoose.models.UserDirectoryAudit ??
  mongoose.model<IUserDirectoryAudit>("UserDirectoryAudit", UserDirectoryAuditSchema);

export default UserDirectoryAudit;
