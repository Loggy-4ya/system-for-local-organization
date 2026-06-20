/**
 * @fileoverview Singleton access-control settings stored in MongoDB.
 *
 * Defines the seven-tier hierarchy, default permissions per tier, and
 * downward grant/delegation rules editable from `/admin/user-access`.
 *
 * @module shared/models/AccessControlSettings
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import {
  ACCESS_CONTROL_SETTINGS_ID,
  ALL_PERMISSION_KEYS,
  type AccessControlSettingsConfig,
  type AccessLevelDefinition,
  type AccessLevelIndex,
  type LevelGrantRule,
  type PermissionKey,
} from "@shared/constants/accessControl";

export { ACCESS_CONTROL_SETTINGS_ID };

/** Persisted access-control singleton document. */
export interface IAccessControlSettings extends Omit<Document, "_id">, AccessControlSettingsConfig {
  /** Singleton key — always {@link ACCESS_CONTROL_SETTINGS_ID}. */
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccessLevelDefinitionSchema = new Schema<AccessLevelDefinition>(
  {
    index: { type: Number, required: true, min: 0, max: 6 },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const LevelGrantRuleSchema = new Schema<LevelGrantRule>(
  {
    assignableLevelIndices: {
      type: [{ type: Number, min: 0, max: 6 }],
      default: [],
    },
    delegatablePermissions: {
      type: [{ type: String, enum: ALL_PERMISSION_KEYS }],
      default: [],
    },
  },
  { _id: false },
);

const AccessControlSettingsSchema = new Schema<IAccessControlSettings>(
  {
    _id: {
      type: String,
      default: ACCESS_CONTROL_SETTINGS_ID,
    },
    levels: {
      type: [AccessLevelDefinitionSchema],
      required: true,
      default: () => [],
    },
    levelPermissions: {
      type: Schema.Types.Mixed,
      required: true,
      default: () => ({}),
    },
    grantRules: {
      type: Schema.Types.Mixed,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "access_control_settings",
  },
);

const AccessControlSettings: Model<IAccessControlSettings> =
  mongoose.models.AccessControlSettings ??
  mongoose.model<IAccessControlSettings>("AccessControlSettings", AccessControlSettingsSchema);

export default AccessControlSettings;

export type { AccessLevelIndex, PermissionKey, AccessControlSettingsConfig };
