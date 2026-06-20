/**
 * @fileoverview Admin-reviewed specialty and group catalog for student registration.
 *
 * Approved entries populate signup dropdowns. User-submitted values that are not
 * yet approved are stored with `status: pending` for administrator review.
 *
 * @module shared/models/AcademicCatalog
 */

import mongoose, { Document, Model, Schema } from "mongoose";

/** Catalog entry kind — academic specialty or student group. */
export type AcademicCatalogKind = "specialty" | "group";

/** Review state for catalog entries. */
export type AcademicCatalogStatus = "approved" | "pending";

/**
 * Specialty or group catalog row.
 */
export interface IAcademicCatalogEntry extends Document {
  /** Entry kind — specialty or group. */
  kind: AcademicCatalogKind;
  /** URL-safe slug derived from label. */
  key: string;
  /** Display label shown in dropdowns and on profiles. */
  label: string;
  /** Review state — only `approved` rows appear in public signup options. */
  status: AcademicCatalogStatus;
  /** User who submitted a pending entry (null for admin-seeded rows). */
  submittedByUserId: string | null;
  /** When an admin approved or rejected the entry. */
  reviewedAt: Date | null;
  /** Admin who reviewed the entry. */
  reviewedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicCatalogSchema = new Schema<IAcademicCatalogEntry>(
  {
    kind: {
      type: String,
      enum: ["specialty", "group"] satisfies AcademicCatalogKind[],
      required: true,
      index: true,
    },
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["approved", "pending"] satisfies AcademicCatalogStatus[],
      default: "pending",
      index: true,
    },
    submittedByUserId: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedByUserId: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "academic_catalog",
  },
);

AcademicCatalogSchema.index({ kind: 1, key: 1 }, { unique: true });
AcademicCatalogSchema.index({ kind: 1, label: 1 });

export const AcademicCatalog: Model<IAcademicCatalogEntry> =
  mongoose.models.AcademicCatalog ??
  mongoose.model<IAcademicCatalogEntry>("AcademicCatalog", AcademicCatalogSchema);

export default AcademicCatalog;
