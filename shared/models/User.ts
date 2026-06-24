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
import {
  shouldUnsetUserOptionalUniqueField,
  USER_OPTIONAL_UNIQUE_STRING_FIELDS,
} from "@shared/lib/stripUserOptionalUniqueFields";
import type {
  IUserOrganizationMembership,
  IUserQualityScores,
  IUserSocialGroupActivity,
  IUserSocialLink,
  IUserSociumRole,
} from "@shared/models/userTypes";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";

export type {
  IUserOrganizationMembership,
  IUserQualityScores,
  IUserSocialGroupActivity,
  IUserSocialLink,
  IUserSociumRole,
  SociumRoleKind,
  SociumRoleSource,
} from "@shared/models/userTypes";

// ── Enumerations ─────────────────────────────────────────────────────────────

/**
 * RBAC role values.
 *  - `Admin`          : Full system access; can create tasks, manage members.
 *  - `StudentCouncil` : Elevated student with visibility into council ops.
 *  - `Student`        : Default enrolment role; limited dashboard access.
 */
export type UserRole = "Admin" | "StudentCouncil" | "Student";

/**
 * Student council title collected during registration.
 * Distinct from RBAC {@link UserRole}.
 */
export type StudentTitle = "Starosta" | "Deputy" | "Neither";

// ── Document Interface ────────────────────────────────────────────────────────

/**
 * TypeScript representation of a persisted User document.
 *
 * @see {@link UserSchema} for the matching Mongoose schema definition.
 */
export interface IUser extends Document {
  /** Unique login handle for credentials sign-in. Distinct from Telegram {@link username}. */
  login: string | null;

  /** Optional linked email for OAuth merge and notifications — not used for credentials sign-in. */
  email: string | null;

  /** Timestamp when the email was verified (OAuth providers set this). */
  emailVerified: Date | null;

  /** bcrypt password hash. Null for OAuth-only accounts. Never exposed in APIs. */
  passwordHash: string | null;

  /** Google OAuth2 `sub` identifier. Null until Google account is linked. */
  googleId: string | null;

  /** Apple Sign In `sub` identifier. Null until Apple account is linked. */
  appleId: string | null;

  /** Telegram numeric user ID. Null until Telegram account is linked. */
  telegramId: number | null;

  /**
   * Contact phone number — user-provided in profile settings or synced from Telegram bot.
   * Optional for general students (recommended). **Required** for self-government members
   * and before submitting a membership application.
   */
  phone: string | null;

  /** Given / first name — merged from platform identity or user-provided. */
  name: string;

  /** Family name / surname — optional; combined with {@link name} for full display. */
  surname: string | null;

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
   * Hierarchy index — **0 is highest** authority.
   * @see {@link AccessLevelIndex} in `shared/constants/accessControl.ts`
   */
  accessLevelIndex: number;

  /**
   * Permission keys explicitly delegated by a higher-tier user.
   * Combined with tier defaults from `access_control_settings`.
   */
  delegatedPermissions: string[];

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
   * Student council title from registration chips (Starosta / Deputy / Neither).
   * Distinct from RBAC {@link UserRole}. Synced into {@link sociumRoles}.
   */
  studentTitle: StudentTitle | null;

  /**
   * Socium (student-life) roles — starosta, student, self-government positions, custom.
   * @see {@link IUserSociumRole}
   */
  sociumRoles: IUserSociumRole[];

  /**
   * Social group activity affiliations (catalog keys + denormalized labels).
   * Assigned by admin when attaching roles to students.
   */
  socialGroupActivities: IUserSocialGroupActivity[];

  /**
   * External organization memberships outside self-government.
   * Assigned by admin when attaching roles to students.
   */
  organizations: IUserOrganizationMembership[];

  /** User-authored social media profile links. */
  socialLinks: IUserSocialLink[];

  /** Self-authored about / bio note. */
  about: string | null;

  /**
   * Quality-of-work scores for self-government members.
   * Auto-initialized when a self-government socium role is assigned.
   */
  qualityScores: IUserQualityScores | null;

  /** Last successful Telegram Login Widget or bot sync timestamp. */
  lastTelegramSyncAt: Date | null;

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

  /**
   * Whether the student opted in to apply for self-government membership at signup.
   * Does not grant roles — administrators review applications separately.
   * Also used for teacher institutional access applications.
   */
  selfGovernmentApplicationIntent: boolean;

  /**
   * Whether a teacher account has been approved by administration or self-government.
   * Defaults to true for non-teachers; new teacher signups start as false until review.
   */
  teacherAccessApproved: boolean;

  /** Timestamp when the user accepted personal data processing (signup consent). */
  personalDataConsentAt: Date | null;

  /**
   * Preferred delivery channels for institution notifications (tasks, broadcasts, calendar).
   * @see {@link TaskReminderChannel}
   */
  notificationChannels: TaskReminderChannel[];

  /** When the user answered the browser notification permission prompt (enable or dismiss). */
  webNotificationPromptAt: Date | null;

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
 *  - `login` and `email` use partial unique indexes (only when non-empty strings).
 *  - `googleId` and `telegramId` are sparsely indexed (many docs will be null).
 *  - `group` is indexed to support Admin dashboard queries filtered by group.
 */
const UserSchema = new Schema<IUser>(
  {
    login:        { type: String, trim: true, lowercase: true },
    email:        { type: String, trim: true, lowercase: true },
    emailVerified:{ type: Date, default: null },
    passwordHash: { type: String, default: null, select: false },
    googleId:     { type: String, default: null, sparse: true, index: true },
    appleId:      { type: String, default: null, sparse: true, index: true },
    telegramId:   { type: Number, default: null, sparse: true, index: true },
    phone:        { type: String, default: null },
    name:         { type: String, required: true, trim: true },
    surname:      { type: String, default: null, trim: true },
    username:     { type: String, default: null, trim: true },
    avatar:       { type: String, default: null },
    role: {
      type: String,
      enum: ["Admin", "StudentCouncil", "Student"] satisfies UserRole[],
      default: "Student",
    },
    accessLevelIndex: { type: Number, default: 6, min: 0, max: 6, index: true },
    delegatedPermissions: { type: [String], default: [] },
    specialty:    { type: String, default: null, trim: true },
    group:        { type: String, default: null, trim: true, index: true },
    studentTitle: {
      type: String,
      enum: ["Starosta", "Deputy", "Neither"] satisfies StudentTitle[],
      default: null,
    },
    sociumRoles: {
      type: [
        {
          roleKey: { type: String, required: true, trim: true },
          roleLabel: { type: String, required: true, trim: true },
          kind: {
            type: String,
            enum: [
              "starosta",
              "group_deputy",
              "student",
              "teacher",
              "self_government_member",
              "self_government_head",
              "self_government_deputy",
              "custom",
            ],
            required: true,
          },
          source: { type: String, enum: ["self", "admin", "system"], required: true },
          bodyKey: { type: String, default: null, trim: true },
          bodyTitle: { type: String, default: null, trim: true },
          assignedAt: { type: Date, required: true, default: Date.now },
          assignedByUserId: { type: String, default: null },
        },
      ],
      default: [],
    },
    socialGroupActivities: {
      type: [
        {
          activityKey: { type: String, required: true, trim: true },
          activityLabel: { type: String, required: true, trim: true },
          assignedAt: { type: Date, required: true, default: Date.now },
        },
      ],
      default: [],
    },
    organizations: {
      type: [
        {
          organizationKey: { type: String, required: true, trim: true },
          organizationLabel: { type: String, required: true, trim: true },
          assignedAt: { type: Date, required: true, default: Date.now },
        },
      ],
      default: [],
    },
    socialLinks: {
      type: [
        {
          platform: { type: String, required: true, trim: true, lowercase: true },
          label: { type: String, default: null, trim: true },
          url: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    about: { type: String, default: null, trim: true, maxlength: 2000 },
    qualityScores: {
      type: {
        averageScore: { type: Number, default: 0, min: 0, max: 100 },
        ratingCount: { type: Number, default: 0, min: 0 },
        initializedAt: { type: Date, required: true },
        lastUpdatedAt: { type: Date, required: true },
      },
      default: null,
    },
    lastTelegramSyncAt: { type: Date, default: null },
    stars:     { type: Number, default: 0, min: 0 },
    warnings:  { type: Number, default: 0, min: 0, max: 3 },
    selfGovernmentApplicationIntent: { type: Boolean, default: false },
    teacherAccessApproved: { type: Boolean, default: true },
    personalDataConsentAt: { type: Date, default: null },
    notificationChannels: {
      type: [String],
      enum: ["web", "telegram"],
      default: ["web"],
    },
    webNotificationPromptAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

UserSchema.pre("validate", function unsetOptionalUniqueNulls() {
  for (const field of USER_OPTIONAL_UNIQUE_STRING_FIELDS) {
    if (shouldUnsetUserOptionalUniqueField(this.get(field))) {
      this.set(field, undefined);
      if (this._doc && field in this._doc) {
        delete this._doc[field as keyof typeof this._doc];
      }
    }
  }
});

/**
 * Unset optional unique string fields instead of persisting null — prevents E11000
 * duplicate key errors on `email_1` / `login_1` for users without linked email/login.
 */
UserSchema.pre("save", function unsetOptionalUniqueNullsOnSave() {
  for (const field of USER_OPTIONAL_UNIQUE_STRING_FIELDS) {
    if (shouldUnsetUserOptionalUniqueField(this.get(field))) {
      this.set(field, undefined);
      if (this._doc && field in this._doc) {
        delete this._doc[field as keyof typeof this._doc];
      }
    }
  }
});

/** Partial filter — non-empty string only (`$ne` is unsupported in partial indexes). */
const NON_EMPTY_STRING_PARTIAL_FILTER = { $gt: "" } as const;

/** Unique only when a non-empty login handle is stored. */
UserSchema.index(
  { login: 1 },
  {
    unique: true,
    partialFilterExpression: { login: NON_EMPTY_STRING_PARTIAL_FILTER },
  },
);

/** Unique only when a non-empty linked email is stored. */
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: NON_EMPTY_STRING_PARTIAL_FILTER },
  },
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
