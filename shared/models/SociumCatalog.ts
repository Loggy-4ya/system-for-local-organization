/**
 * @fileoverview Admin-configurable socium catalogs for roles, activities, and organizations.
 *
 * Seeds and CRUD for these collections will be exposed via the administration panel.
 * User documents store denormalized key/label snapshots for fast profile reads.
 *
 * @module shared/models/SociumCatalog
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import type { SociumRoleKind } from "@shared/models/userTypes";

// ── Socium role catalog ───────────────────────────────────────────────────────

/**
 * Admin-defined socium role definition.
 */
export interface ISociumRoleCatalogEntry extends Document {
  /** Unique slug, e.g. `media_lead`. */
  key: string;
  /** Display label shown on profile badges. */
  label: string;
  /** Always `custom` for catalog entries. */
  kind: Extract<SociumRoleKind, "custom">;
  /** Whether students may self-select this role during registration (default false). */
  assignableBySelf: boolean;
  /** Optional description for admin UI. */
  description: string | null;
  /** Soft-disable without deleting historical assignments. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SociumRoleCatalogSchema = new Schema<ISociumRoleCatalogEntry>(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    label: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["custom"], default: "custom" },
    assignableBySelf: { type: Boolean, default: false },
    description: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "socium_role_catalog" },
);

// ── Social group activity catalog ─────────────────────────────────────────────

/**
 * Admin-defined social group activity category.
 */
export interface ISocialGroupActivityCatalogEntry extends Document {
  /** Unique slug, e.g. `robotics_club`. */
  key: string;
  /** Display label. */
  label: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SocialGroupActivityCatalogSchema = new Schema<ISocialGroupActivityCatalogEntry>(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "social_group_activity_catalog" },
);

// ── Organization catalog ──────────────────────────────────────────────────────

/**
 * Admin-defined external organization (outside self-government).
 */
export interface IOrganizationCatalogEntry extends Document {
  /** Unique slug, e.g. `ieee_student_branch`. */
  key: string;
  /** Display label. */
  label: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationCatalogSchema = new Schema<IOrganizationCatalogEntry>(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "organization_catalog" },
);

// ── Model registration ────────────────────────────────────────────────────────

export const SociumRoleCatalog: Model<ISociumRoleCatalogEntry> =
  mongoose.models.SociumRoleCatalog ??
  mongoose.model<ISociumRoleCatalogEntry>("SociumRoleCatalog", SociumRoleCatalogSchema);

export const SocialGroupActivityCatalog: Model<ISocialGroupActivityCatalogEntry> =
  mongoose.models.SocialGroupActivityCatalog ??
  mongoose.model<ISocialGroupActivityCatalogEntry>(
    "SocialGroupActivityCatalog",
    SocialGroupActivityCatalogSchema,
  );

export const OrganizationCatalog: Model<IOrganizationCatalogEntry> =
  mongoose.models.OrganizationCatalog ??
  mongoose.model<IOrganizationCatalogEntry>("OrganizationCatalog", OrganizationCatalogSchema);

export default SociumRoleCatalog;
