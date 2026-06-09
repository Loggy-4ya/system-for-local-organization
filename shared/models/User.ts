/**
 * @fileoverview Unified User Mongoose schema for Project Nexus.
 *
 * This model is the single source of truth for all user identities in the
 * system. It merges cross-platform authentication identities (Google OAuth2,
 * Telegram) into one MongoDB document, satisfying the
 * "Cross-Platform Authentication & Profile Aggregation" domain pillar.
 *
 * @module shared/models/User
 */

import mongoose, { Document, Model, Schema } from "mongoose";

// ── Enumerations ─────────────────────────────────────────────────────────────

/**
 * RBAC role values.
 *  - `Admin`          : Full system access; can create tasks, manage members.
 *  - `StudentCouncil` : Elevated student with visibility into council ops.
 *  - `Student`        : Default enrolment role; limited dashboard access.
 */
export type UserRole = "Admin" | "StudentCouncil" | "Student";

// ── Document Interface ────────────────────────────────────────────────────────

/**
 * TypeScript representation of a persisted User document.
 *
 * @see {@link UserSchema} for the matching Mongoose schema definition.
 */
export interface IUser extends Document {
  /** Google OAuth2 `sub` identifier. Null until Google account is linked. */
  googleId: string | null;

  /** Telegram numeric user ID. Null until Telegram account is linked. */
  telegramId: number | null;

  /** Verified phone number harvested by the Telegram bot on first contact. */
  phone: string | null;

  /** Display name — merged from platform identity or user-provided. */
  name: string;

  /**
   * Telegram username handle (without `@`).
   * Null if the user has not set one on Telegram.
   */
  username: string | null;

  /** URL to the user's profile avatar image. */
  avatar: string | null;

  /** RBAC role controlling dashboard visibility and action permissions. */
  role: UserRole;

  /**
   * Academic specialty string, e.g. `"Software Engineering"`.
   * Collected during the student registration flow.
   */
  specialty: string | null;

  /**
   * Student group designation, e.g. `"SE-42"`.
   * Collected during the student registration flow.
   */
  group: string | null;

  /**
   * Accumulated gamification points.
   * Stars = sum of coins + crystals earned over the study period.
   */
  stars: number;

  /**
   * Number of active warnings issued by an Admin.
   * Reaching 3 triggers an automatic workspace kick-out.
   */
  warnings: number;

  /** Timestamp when the document was first created. */
  createdAt: Date;

  /** Timestamp of the last document mutation. */
  updatedAt: Date;
}

// ── Schema Definition ─────────────────────────────────────────────────────────

/**
 * Mongoose schema for the User model.
 *
 * Indexing strategy:
 *  - `googleId` and `telegramId` are sparsely indexed (many docs will be null).
 *  - `group` is indexed to support Admin dashboard queries filtered by group.
 */
const UserSchema = new Schema<IUser>(
  {
    googleId:   { type: String, default: null, sparse: true, index: true },
    telegramId: { type: Number, default: null, sparse: true, index: true },
    phone:      { type: String, default: null },
    name:       { type: String, required: true, trim: true },
    username:   { type: String, default: null, trim: true },
    avatar:     { type: String, default: null },
    role: {
      type: String,
      enum: ["Admin", "StudentCouncil", "Student"] satisfies UserRole[],
      default: "Student",
    },
    specialty: { type: String, default: null, trim: true },
    group:     { type: String, default: null, trim: true, index: true },
    stars:     { type: Number, default: 0, min: 0 },
    warnings:  { type: Number, default: 0, min: 0, max: 3 },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// ── Model Registration ─────────────────────────────────────────────────────────

/**
 * The Nexus User model.
 *
 * Always imported via this module — never construct a new `mongoose.model`
 * call elsewhere to avoid the "Cannot overwrite model" error during hot-reload.
 */
const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
