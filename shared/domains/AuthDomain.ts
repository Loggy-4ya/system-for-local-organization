/**
 * @fileoverview Consolidated authentication and profile domain engine for Project Nexus.
 *
 * Single cohesive domain object handling credentials registration, OAuth identity
 * merging (Google), Telegram Login Widget verification, and profile mutations.
 * All auth-related database operations must flow through this module.
 *
 * @module shared/domains/AuthDomain
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@shared/lib/db";
import User, {
  type IUser,
  type IUserDocument,
  type IUserSocialLink,
  type StudentTitle,
  type UserRole,
} from "@shared/models/User";
import { UserPublishedContent } from "@shared/models/UserEngagement";
import {
  applyStudentTitleSociumSync,
  buildInitialSociumStateFromSignupRole,
  formatUserFullName,
  type SignupSociumRole,
} from "@shared/lib/userSociumHelpers";
import type { AccessLevelIndex, PermissionKey } from "@shared/constants/accessControl";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";
import {
  accessLevelForStarostaRegistration,
  accessLevelForTeacherRegistration,
  defaultStudentAccessLevel,
  inferAccessLevelIndex,
} from "@shared/lib/accessControlLogic";
import { phoneIsRequiredForUser, telegramIsRequiredForUser } from "@shared/lib/userProfileCompleteness";
import { normalizePhoneInput } from "@shared/validation/phoneSchema";
import TelegramContactHarvest from "@shared/models/TelegramContactHarvest";
import {
  normalizeTelegramUserId,
  validateTelegramSharedContact,
  type TelegramSharedContactPayload,
} from "@shared/lib/telegramContactHarvestLogic";
import { registerSchema } from "@shared/validation/authSchemas";
import {
  isApprovedAcademicLabel,
  normalizeAcademicLabel,
  slugifyAcademicCatalogLabel,
} from "@shared/lib/academicCatalogLogic";
import { splitPersonName } from "@shared/lib/splitPersonName";
import { mongooseDocToPlain } from "@shared/lib/mongoosePlainObject";
import {
  toPublicProfileUser,
  type PublicProfileUser,
} from "@shared/lib/publicProfileRedaction";
import { looksLikeMongoObjectId } from "@shared/lib/userProfilePathLogic";
import {
  applyProfilePatchToUser,
  type ProfileUpdateInput,
} from "@shared/lib/userProfilePatch";
import { stripUserOptionalUniqueFields } from "@shared/lib/stripUserOptionalUniqueFields";
import { normalizeUserNotificationChannels } from "@shared/lib/userNotificationSettingsLogic";
import AcademicCatalog from "@shared/models/AcademicCatalog";
import {
  verifyTelegramWebAppInitData,
  type TelegramWebAppUser,
} from "@shared/lib/verifyTelegramWebAppInitData";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Input for credentials-based student registration. */
export interface RegisterCredentialsInput {
  login: string;
  email?: string | null;
  password: string;
  name: string;
  surname?: string | null;
  phone?: string | null;
  avatar?: string | null;
  specialty?: string | null;
  group?: string | null;
  studentTitle?: StudentTitle | null;
  signupSociumRole?: SignupSociumRole;
  applyForSelfGovernment?: boolean;
  personalDataConsent?: boolean;
  /** Verified Telegram Login Widget payload — linked on create when provided. */
  telegramAuth?: TelegramWidgetPayload | null;
}

/** Linked OAuth provider ids for credential error messaging. */
export type LinkedOAuthProvider = "google" | "telegram";

/** Discriminated result for credentials login resolution. */
export type CredentialsLoginResolution =
  | { status: "success"; user: IUser }
  | { status: "not_found" }
  | { status: "oauth_only"; providers: LinkedOAuthProvider[] }
  | { status: "invalid_password" };

/** OAuth profile shape from Google provider. */
export interface OAuthProfileInput {
  providerId: string;
  email: string | null;
  name: string;
  image?: string | null;
  emailVerified?: Date | null;
}

/** Telegram Login Widget callback payload. */
export interface TelegramWidgetPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** Safe user representation — never includes passwordHash. */
export interface PublicUser {
  id: string;
  login: string | null;
  email: string | null;
  name: string;
  surname: string | null;
  fullName: string;
  username: string | null;
  avatar: string | null;
  role: UserRole;
  accessLevelIndex: AccessLevelIndex;
  delegatedPermissions: PermissionKey[];
  effectivePermissions?: PermissionKey[];
  specialty: string | null;
  group: string | null;
  studentTitle: StudentTitle | null;
  sociumRoles: IUser["sociumRoles"];
  socialGroupActivities: IUser["socialGroupActivities"];
  organizations: IUser["organizations"];
  socialLinks: IUserSocialLink[];
  about: string | null;
  qualityScores: IUser["qualityScores"];
  stars: number;
  warnings: number;
  googleId: string | null;
  telegramId: number | null;
  phone: string | null;
  selfGovernmentApplicationIntent: boolean;
  teacherAccessApproved: boolean;
  personalDataConsentAt: Date | null;
  notificationChannels: TaskReminderChannel[];
  webNotificationPromptAt: Date | null;
  lastTelegramSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Public Telegram user fields returned for Mini App onboarding. */
export interface TelegramMiniAppPublicUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

/** Result of Mini App initData authentication. */
export type TelegramMiniAppAuthenticateResult =
  | { status: "authenticated"; user: IUser }
  | {
      status: "needs_onboarding";
      telegramUser: TelegramMiniAppPublicUser;
      /** Phone shared with the bot before account creation, when available. */
      harvestedPhone: string | null;
    };

export type { ProfileUpdateInput };

/** Published content row for profile feed. */
export interface PublicPublishedContentItem {
  id: string;
  contentType: "news" | "social_interactivity";
  title: string;
  href: string;
  publishedAt: Date;
}

const BCRYPT_ROUNDS = 12;

/** Maximum age of a Telegram widget auth payload in seconds. */
const TELEGRAM_AUTH_MAX_AGE_SEC = 86_400;

/**
 * Creates a user document after stripping null/empty optional unique fields so
 * MongoDB never stores `email: null` or `login: null` (E11000 on legacy indexes).
 *
 * @param payload - Fields for the new user row.
 * @returns Created Mongoose document.
 */
async function createUserDocument(
  payload: Record<string, unknown>,
): Promise<IUserDocument> {
  const doc = { ...payload };
  stripUserOptionalUniqueFields(doc);
  return User.create(doc);
}

// ── AuthDomain ────────────────────────────────────────────────────────────────

/**
 * Authentication and profile domain engine.
 *
 * Consolidates all user identity mutations for the Nexus web app and future
 * Telegram worker integrations.
 */
export const AuthDomain = {
  /**
   * Register a new user with login/password credentials.
   *
   * @param input - Registration fields from the student signup form.
   * @returns The created user document.
   * @throws When login or linked email is already registered, or validation fails.
   */
  async registerWithCredentials(input: RegisterCredentialsInput): Promise<IUser> {
    await connectDB();

    const signupSociumRole: SignupSociumRole =
      input.signupSociumRole ??
      (input.studentTitle === "Starosta" ? "Starosta" : "Student");

    const parsed = registerSchema.parse({
      login: input.login,
      email: input.email ?? null,
      password: input.password,
      confirmPassword: input.password,
      name: input.name || input.login,
      surname: input.surname ?? null,
      phone: input.phone ?? null,
      avatar: input.avatar ?? null,
      specialty: input.specialty,
      group: input.group,
      signupSociumRole,
      applyForSelfGovernment: input.applyForSelfGovernment ?? false,
      personalDataConsent: input.personalDataConsent ?? true,
      telegramAuth: input.telegramAuth ?? null,
    });

    const login = parsed.login;
    const email = parsed.email ?? null;
    const phone = parsed.phone ?? null;

    const existingLogin = await User.findOne({ login });
    if (existingLogin) {
      throw new Error("An account with this login already exists.");
    }

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        throw new Error("An account with this email already exists.");
      }
    }

    const passwordHash = await bcrypt.hash(parsed.password, BCRYPT_ROUNDS);
    const studentTitle = parsed.studentTitle;
    const { sociumRoles, qualityScores } = buildInitialSociumStateFromSignupRole(
      parsed.signupSociumRole,
    );
    const accessLevelIndex =
      parsed.signupSociumRole === "Starosta"
        ? accessLevelForStarostaRegistration(null)
        : parsed.signupSociumRole === "Teacher"
          ? accessLevelForTeacherRegistration(null)
          : defaultStudentAccessLevel();

    const isTeacherSignup = parsed.signupSociumRole === "Teacher";

    const user = await createUserDocument({
      login,
      email,
      passwordHash,
      name: parsed.name || login,
      surname: parsed.surname,
      phone,
      avatar: parsed.avatar ?? null,
      specialty: isTeacherSignup ? null : parsed.specialty,
      group: isTeacherSignup ? null : parsed.group,
      studentTitle,
      sociumRoles,
      qualityScores,
      accessLevelIndex,
      delegatedPermissions: [],
      selfGovernmentApplicationIntent: isTeacherSignup ? true : parsed.applyForSelfGovernment,
      teacherAccessApproved: isTeacherSignup ? false : true,
      personalDataConsentAt: new Date(),
    });

    if (!isTeacherSignup) {
      await queuePendingAcademicCatalogEntries({
        specialty: parsed.specialty,
        group: parsed.group,
        submittedByUserId: String(user._id),
      });
    }

    if (parsed.telegramAuth) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error("Telegram bot is not configured.");
      }
      return AuthDomain.linkTelegramProfile(String(user._id), parsed.telegramAuth, botToken);
    }

    return user;
  },

  /**
   * List approved specialty and group labels for signup dropdowns.
   *
   * Falls back to distinct values already stored on user documents when the catalog
   * has not been seeded yet.
   *
   * @returns Sorted unique approved labels for each kind.
   */
  async listSignupAcademicOptions(): Promise<{ specialties: string[]; groups: string[] }> {
    await connectDB();

    const [catalogSpecialties, catalogGroups, userSpecialties, userGroups] = await Promise.all([
      AcademicCatalog.find({ kind: "specialty", status: "approved" })
        .sort({ label: 1 })
        .lean(),
      AcademicCatalog.find({ kind: "group", status: "approved" })
        .sort({ label: 1 })
        .lean(),
      User.distinct("specialty", { specialty: { $nin: [null, ""] } }),
      User.distinct("group", { group: { $nin: [null, ""] } }),
    ]);

    const specialties = mergeUniqueLabels(
      catalogSpecialties.map((row) => row.label),
      userSpecialties.filter((value): value is string => Boolean(value)),
    );

    const groups = mergeUniqueLabels(
      catalogGroups.map((row) => row.label),
      userGroups.filter((value): value is string => Boolean(value)),
    );

    return { specialties, groups };
  },

  /**
   * Resolve credentials login with explicit failure reasons for UX messaging.
   *
   * @param login - User login handle.
   * @param password - Plain-text password.
   * @returns Discriminated login resolution — never throws.
   */
  async resolveCredentialsLogin(
    login: string,
    password: string,
  ): Promise<CredentialsLoginResolution> {
    await connectDB();

    const normalized = login.trim().toLowerCase();
    const user = await User.findOne({ login: normalized }).select("+passwordHash");
    if (!user) {
      return { status: "not_found" };
    }

    if (!user.passwordHash) {
      return { status: "oauth_only", providers: listLinkedOAuthProviders(user) };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { status: "invalid_password" };
    }

    return { status: "success", user };
  },

  /**
   * Validate login/password credentials for Auth.js Credentials provider.
   *
   * @param login - User login handle.
   * @param password - Plain-text password.
   * @returns Matching user document or null when invalid.
   */
  async validateCredentials(login: string, password: string): Promise<IUser | null> {
    const resolution = await AuthDomain.resolveCredentialsLogin(login, password);
    return resolution.status === "success" ? resolution.user : null;
  },

  /**
   * Find or create a user from a Google OAuth profile.
   *
   * Merges by `googleId` first, then by email if present.
   *
   * @param profile - Google OAuth profile data.
   * @returns Upserted user document.
   */
  async findOrCreateFromGoogle(profile: OAuthProfileInput): Promise<IUser> {
    await connectDB();
    return mergeOAuthUser("googleId", profile);
  },

  /**
   * Link a Google OAuth profile to an existing Nexus account (profile settings flow).
   *
   * Populates `email` and `emailVerified` from the Google profile. Does not create
   * a new user document.
   *
   * @param userId - Target user MongoDB id.
   * @param profile - Verified Google OAuth profile.
   * @returns Updated user document.
   * @throws When user not found, Google id/email already belongs to another account,
   *   or a different Google account is already linked to this user.
   */
  async linkGoogleProfile(userId: string, profile: OAuthProfileInput): Promise<IUser> {
    await connectDB();
    return linkOAuthProfileToUser(userId, "googleId", profile);
  },

  /**
   * Authenticate a Telegram Mini App visitor via signed `initData`.
   *
   * Returning users are synced and returned for bridge-token sign-in.
   * First-time visitors receive onboarding metadata instead of a user row.
   *
   * @param initData - Raw `Telegram.WebApp.initData` query string.
   * @param botToken - BotFather token from environment.
   * @returns Authenticated user or onboarding payload.
   * @throws When initData verification fails.
   */
  async authenticateTelegramMiniApp(
    initData: string,
    botToken: string,
  ): Promise<TelegramMiniAppAuthenticateResult> {
    await connectDB();

    if (!botToken) {
      throw new Error("Telegram bot token is not configured.");
    }

    const verified = verifyTelegramWebAppInitData(initData, botToken);
    const syncAt = new Date();
    const name = formatTelegramDisplayName(verified.user);

    let user = await User.findOne({ telegramId: verified.user.id });

    if (user) {
      user.name = name || user.name;
      user.username = verified.user.username ?? user.username;
      user.avatar = verified.user.photo_url ?? user.avatar;
      user.lastTelegramSyncAt = syncAt;
      await user.save();
      await AuthDomain.mergeHarvestedPhoneIntoUser(user);
      return { status: "authenticated", user };
    }

    return {
      status: "needs_onboarding",
      telegramUser: toTelegramMiniAppPublicUser(verified.user),
      harvestedPhone: await AuthDomain.resolvePhoneForTelegramUser(verified.user.id),
    };
  },

  /**
   * Register a new Nexus account from the Telegram Mini App onboarding form.
   *
   * @param initData - Raw `Telegram.WebApp.initData` (re-verified server-side).
   * @param input - Credentials registration fields from onboarding.
   * @param botToken - BotFather token from environment.
   * @returns Created user with linked `telegramId`.
   * @throws When initData is invalid, login/email exists, or telegramId is taken.
   */
  async registerFromTelegramMiniApp(
    initData: string,
    input: RegisterCredentialsInput,
    botToken: string,
  ): Promise<IUser> {
    await connectDB();

    if (!botToken) {
      throw new Error("Telegram bot token is not configured.");
    }

    const verified = verifyTelegramWebAppInitData(initData, botToken);
    const existingTelegram = await User.findOne({ telegramId: verified.user.id });
    if (existingTelegram) {
      throw new Error("This Telegram account is already linked to Nexus.");
    }

    const harvestedPhone = await AuthDomain.resolvePhoneForTelegramUser(verified.user.id);

    const signupSociumRole: SignupSociumRole =
      input.signupSociumRole ??
      (input.studentTitle === "Starosta" ? "Starosta" : "Student");

    const parsed = registerSchema.parse({
      login: input.login,
      email: input.email ?? null,
      password: input.password,
      confirmPassword: input.password,
      name: input.name || input.login,
      surname: input.surname ?? null,
      phone: input.phone ?? harvestedPhone ?? null,
      avatar: input.avatar ?? null,
      specialty: input.specialty,
      group: input.group,
      signupSociumRole,
      applyForSelfGovernment: input.applyForSelfGovernment ?? false,
      personalDataConsent: input.personalDataConsent ?? true,
    });

    const login = parsed.login;
    const email = parsed.email ?? null;

    const existingLogin = await User.findOne({ login });
    if (existingLogin) {
      throw new Error("An account with this login already exists.");
    }

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        throw new Error("An account with this email already exists.");
      }
    }

    const passwordHash = await bcrypt.hash(parsed.password, BCRYPT_ROUNDS);
    const syncAt = new Date();
    const name = formatTelegramDisplayName(verified.user) || parsed.name || login;
    const studentTitle = parsed.studentTitle;
    const { sociumRoles, qualityScores } = buildInitialSociumStateFromSignupRole(
      parsed.signupSociumRole,
    );
    const accessLevelIndex =
      parsed.signupSociumRole === "Starosta"
        ? accessLevelForStarostaRegistration(null)
        : parsed.signupSociumRole === "Teacher"
          ? accessLevelForTeacherRegistration(null)
          : defaultStudentAccessLevel();

    const isTeacherSignup = parsed.signupSociumRole === "Teacher";

    const user = await createUserDocument({
      login,
      email,
      passwordHash,
      name,
      surname: parsed.surname,
      phone: parsed.phone ?? null,
      specialty: isTeacherSignup ? null : parsed.specialty,
      group: isTeacherSignup ? null : parsed.group,
      studentTitle,
      sociumRoles,
      qualityScores,
      accessLevelIndex,
      delegatedPermissions: [],
      selfGovernmentApplicationIntent: isTeacherSignup ? true : parsed.applyForSelfGovernment,
      teacherAccessApproved: isTeacherSignup ? false : true,
      personalDataConsentAt: new Date(),
      telegramId: verified.user.id,
      username: verified.user.username ?? null,
      avatar: verified.user.photo_url ?? null,
      lastTelegramSyncAt: syncAt,
    });

    if (!isTeacherSignup) {
      await queuePendingAcademicCatalogEntries({
        specialty: parsed.specialty,
        group: parsed.group,
        submittedByUserId: String(user._id),
      });
    }

    await AuthDomain.mergeHarvestedPhoneIntoUser(user);
    const normalizedTelegramId = normalizeTelegramUserId(verified.user.id);
    if (normalizedTelegramId != null) {
      await TelegramContactHarvest.deleteOne({ telegramId: normalizedTelegramId });
    }

    return user;
  },

  /**
   * Link a verified Telegram Login Widget identity to an existing Nexus account.
   *
   * @param userId - Target user MongoDB id.
   * @param payload - Widget callback data including HMAC hash.
   * @param botToken - Telegram bot token from environment.
   * @returns Updated user document with `telegramId` set.
   * @throws When hash verification fails, payload is expired, or Telegram id is taken.
   */
  async linkTelegramProfile(
    userId: string,
    payload: TelegramWidgetPayload,
    botToken: string,
  ): Promise<IUser> {
    await connectDB();

    if (!botToken) {
      throw new Error("Telegram bot token is not configured.");
    }

    verifyTelegramHash(payload, botToken);

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - payload.auth_date > TELEGRAM_AUTH_MAX_AGE_SEC) {
      throw new Error("Telegram authentication payload has expired. Connect again.");
    }

    const existingTelegram = await User.findOne({ telegramId: payload.id });
    if (existingTelegram && String(existingTelegram._id) !== userId) {
      throw new Error("This Telegram account is already linked to another Nexus user.");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const name = [payload.first_name, payload.last_name].filter(Boolean).join(" ");
    const split = splitPersonName(name);
    const syncAt = new Date();

    user.telegramId = payload.id;
    user.username = payload.username ?? user.username;
    if (payload.photo_url && !user.avatar) {
      user.avatar = payload.photo_url;
    }
    if (!user.surname && split.surname) {
      user.surname = split.surname;
    }
    if ((!user.name || user.name.startsWith("Telegram User")) && (split.name || name)) {
      user.name = split.name || name;
    }
    user.lastTelegramSyncAt = syncAt;
    await user.save();

    await AuthDomain.mergeHarvestedPhoneIntoUser(user);

    return user;
  },

  /**
   * Persist a phone number shared via the Telegram bot contact button.
   *
   * Updates an existing linked user immediately; otherwise stages the phone until
   * Mini App onboarding creates the account.
   *
   * @param senderTelegramId - `message.from.id` from the webhook update.
   * @param contact - Telegram shared contact payload.
   * @returns Whether the phone was stored and the normalized value when accepted.
   */
  async absorbTelegramSharedContact(
    senderTelegramId: number | string,
    contact: TelegramSharedContactPayload,
  ): Promise<{ saved: boolean; phone: string | null; reason: "self_mismatch" | "invalid_phone" | null }> {
    const normalizedSenderId = normalizeTelegramUserId(senderTelegramId);
    if (normalizedSenderId == null) {
      return { saved: false, phone: null, reason: "invalid_phone" };
    }

    const validation = validateTelegramSharedContact(normalizedSenderId, contact);
    if (!validation.ok || !validation.phone) {
      return {
        saved: false,
        phone: null,
        reason: validation.reason === "self_mismatch" ? "self_mismatch" : "invalid_phone",
      };
    }

    await connectDB();
    const now = new Date();
    const user = await User.findOne({ telegramId: normalizedSenderId });

    if (user) {
      user.phone = validation.phone;
      user.lastTelegramSyncAt = now;
      await user.save();
      await TelegramContactHarvest.deleteOne({ telegramId: normalizedSenderId });
      return { saved: true, phone: validation.phone, reason: null };
    }

    await TelegramContactHarvest.findOneAndUpdate(
      { telegramId: normalizedSenderId },
      { phone: validation.phone, harvestedAt: now },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return { saved: true, phone: validation.phone, reason: null };
  },

  /**
   * Resolve a harvested or persisted phone for a Telegram user id.
   *
   * @param telegramUserId - Numeric Telegram user id.
   * @returns Normalized phone when known on the user row or harvest cache.
   */
  async resolvePhoneForTelegramUser(telegramUserId: number | string): Promise<string | null> {
    const normalizedTelegramId = normalizeTelegramUserId(telegramUserId);
    if (normalizedTelegramId == null) {
      return null;
    }

    await connectDB();
    const user = await User.findOne({ telegramId: normalizedTelegramId }).select("phone");
    if (user?.phone) {
      return user.phone;
    }

    const harvest = await TelegramContactHarvest.findOne({ telegramId: normalizedTelegramId }).select(
      "phone",
    );
    return harvest?.phone ?? null;
  },

  /**
   * Copy a staged harvest phone onto a user when the account is created or linked.
   *
   * @param user - User document to update when phone is still empty.
   */
  async mergeHarvestedPhoneIntoUser(user: IUser): Promise<void> {
    const normalizedTelegramId = normalizeTelegramUserId(user.telegramId);
    if (normalizedTelegramId == null || user.phone) return;

    const harvest = await TelegramContactHarvest.findOne({ telegramId: normalizedTelegramId }).select(
      "phone",
    );
    if (!harvest?.phone) return;

    user.phone = harvest.phone;
    await user.save();
    await TelegramContactHarvest.deleteOne({ telegramId: normalizedTelegramId });
  },

  /**
   * Remove Telegram linkage from an account when another sign-in method remains.
   *
   * @param userId - Target user MongoDB id.
   * @returns Updated user document.
   * @throws When user not found or unlink would lock the account out.
   */
  async unlinkTelegram(userId: string): Promise<IUser> {
    await connectDB();

    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw new Error("User not found.");

    if (!user.telegramId) {
      throw new Error("Telegram is not linked to this account.");
    }

    if (
      telegramIsRequiredForUser({
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        specialty: user.specialty,
        group: user.group,
        avatar: user.avatar,
        sociumRoles: user.sociumRoles ?? [],
        selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
        telegramId: user.telegramId,
      })
    ) {
      throw new Error(
        "Telegram is required for self-government members.",
      );
    }

    const hasAlternateAuth =
      Boolean(user.passwordHash) || Boolean(user.googleId);

    if (!hasAlternateAuth) {
      throw new Error(
        "Set a password or link Google before unlinking Telegram.",
      );
    }

    user.telegramId = null;
    user.lastTelegramSyncAt = null;
    await user.save();

    return user;
  },

  /**
   * Verify a Telegram Login Widget payload and link identity to a user.
   *
   * @param payload - Widget callback data including HMAC hash.
   * @param botToken - Telegram bot token from environment.
   * @returns Upserted user document.
   * @throws When hash verification fails or payload is expired.
   */
  async verifyTelegramLoginWidget(
    payload: TelegramWidgetPayload,
    botToken: string
  ): Promise<IUser> {
    await connectDB();

    if (!botToken) {
      throw new Error("Telegram bot token is not configured.");
    }

    verifyTelegramHash(payload, botToken);

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - payload.auth_date > TELEGRAM_AUTH_MAX_AGE_SEC) {
      throw new Error("Telegram authentication payload has expired.");
    }

    const name = [payload.first_name, payload.last_name].filter(Boolean).join(" ");
    const syncAt = new Date();
    const split = splitPersonName(name);

    let user = await User.findOne({ telegramId: payload.id });

    if (user) {
      user.name = split.name || name || user.name;
      if (split.surname) user.surname = split.surname;
      user.username = payload.username ?? user.username;
      user.avatar = payload.photo_url ?? user.avatar;
      user.lastTelegramSyncAt = syncAt;
      await user.save();
      return user;
    }

    user = await createUserDocument({
      telegramId: payload.id,
      name: split.name || name || `Telegram User ${payload.id}`,
      surname: split.surname,
      username: payload.username ?? null,
      avatar: payload.photo_url ?? null,
      lastTelegramSyncAt: syncAt,
    });

    return user;
  },

  /**
   * Load a user by MongoDB document id.
   *
   * @param userId - Stringified ObjectId.
   * @returns User document or null.
   */
  async getUserById(userId: string): Promise<IUser | null> {
    await connectDB();
    return User.findById(userId);
  },

  /**
   * Resolve a user from a public profile route segment (`/users/{ref}`).
   *
   * Accepts a MongoDB id or a credentials login handle (case-insensitive).
   * Tries ObjectId lookup first, then login — single `login` binding only.
   *
   * @param ref - Dynamic route param from `/users/[ref]`.
   * @returns Matching user document or null.
   */
  async resolveUserByProfileRef(ref: string): Promise<IUser | null> {
    await connectDB();
    const trimmed = ref.trim();
    if (!trimmed) return null;

    let decoded = trimmed;
    try {
      decoded = decodeURIComponent(trimmed);
    } catch {
      decoded = trimmed;
    }

    if (looksLikeMongoObjectId(decoded)) {
      const byId = await User.findById(decoded);
      if (byId) return byId;
    }

    const login = decoded.trim().toLowerCase();
    if (!login) return null;

    return User.findOne({ login });
  },

  /**
   * Update editable profile fields for the settings page.
   *
   * @param userId - Target user id.
   * @param patch - Allowed profile fields.
   * @returns Updated user document.
   * @throws When user is not found.
   */
  async updateProfile(userId: string, patch: ProfileUpdateInput): Promise<IUser> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");

    applyProfilePatchToUser(user, patch);

    await user.save();
    return user;
  },

  /**
   * Change password for a credentials-based account.
   *
   * @param userId - Target user id.
   * @param currentPassword - Existing password for verification.
   * @param newPassword - New plain-text password (min 8 chars).
   * @throws When user not found, no password set, or current password wrong.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await connectDB();

    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw new Error("User not found.");
    if (!user.passwordHash) throw new Error("This account uses OAuth sign-in only.");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect.");

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.save();
  },

  /**
   * List recent published community content for a user's profile feed.
   *
   * @param userId - Author user id.
   * @param limit - Maximum rows to return.
   * @returns Published content items newest first.
   */
  async getPublishedContentForUser(
    userId: string,
    limit = 10,
  ): Promise<PublicPublishedContentItem[]> {
    await connectDB();

    const rows = await UserPublishedContent.find({ authorUserId: userId })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    return rows.map((row) => ({
      id: String(row._id),
      contentType: row.contentType,
      title: row.title,
      href: row.href,
      publishedAt: row.publishedAt,
    }));
  },

  /**
   * Convert a Mongoose user document to a safe public representation.
   *
   * @param doc - User document (passwordHash is never included).
   * @returns Public user object for API and session payloads.
   */
  toPublicUser(doc: IUser | IUserDocument): PublicUser {
    // Mongoose documents carry $parent / $schema circular refs that crash React RSC
    // serialization. Convert to a plain object first so all nested subdocuments
    // (sociumRoles, qualityScores, …) become ordinary JS objects.
    const d: IUser =
      typeof (doc as IUserDocument).toObject === "function"
        ? (doc as IUserDocument).toObject({ flattenObjectIds: true })
        : (doc as IUser);

    return {
      id: String(d._id),
      login: d.login ?? null,
      email: d.email ?? null,
      name: d.name,
      surname: d.surname ?? null,
      fullName: formatUserFullName(d.name, d.surname ?? null),
      username: d.username ?? null,
      avatar: d.avatar ?? null,
      role: d.role,
      accessLevelIndex: inferAccessLevelIndex(d),
      delegatedPermissions: (d.delegatedPermissions ?? []) as PermissionKey[],
      specialty: d.specialty ?? null,
      group: d.group ?? null,
      studentTitle: d.studentTitle ?? null,
      sociumRoles: d.sociumRoles ?? [],
      socialGroupActivities: d.socialGroupActivities ?? [],
      organizations: d.organizations ?? [],
      socialLinks: d.socialLinks ?? [],
      about: d.about ?? null,
      qualityScores: d.qualityScores,
      stars: d.stars,
      warnings: d.warnings,
      googleId: d.googleId ?? null,
      telegramId: d.telegramId ?? null,
      phone: d.phone ?? null,
      selfGovernmentApplicationIntent: d.selfGovernmentApplicationIntent ?? false,
      teacherAccessApproved: d.teacherAccessApproved ?? true,
      personalDataConsentAt: d.personalDataConsentAt ?? null,
      notificationChannels: normalizeUserNotificationChannels(d.notificationChannels),
      webNotificationPromptAt: d.webNotificationPromptAt ?? null,
      lastTelegramSyncAt: d.lastTelegramSyncAt ?? null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  },

  /**
   * Resolve a redacted public profile for member-to-member viewing at `/users/[ref]`.
   *
   * @param viewer - Authenticated viewer document, or null when unauthenticated.
   * @param targetUserRef - Profile owner MongoDB id or login handle.
   * @returns Redacted {@link PublicProfileUser} DTO.
   * @throws Error `USER_NOT_FOUND` when the target does not exist.
   */
  async getPublicProfileForViewer(
    viewer: IUser | null,
    targetUserRef: string,
  ): Promise<PublicProfileUser> {
    await connectDB();
    const target = await AuthDomain.resolveUserByProfileRef(targetUserRef);
    if (!target) throw new Error("USER_NOT_FOUND");

    const viewerSlice = viewer
      ? {
          id: String(viewer._id),
          role: viewer.role,
          accessLevelIndex: viewer.accessLevelIndex,
          delegatedPermissions: (viewer.delegatedPermissions ?? []) as PermissionKey[],
          sociumRoles: viewer.sociumRoles ?? [],
          studentTitle: viewer.studentTitle,
        }
      : null;

    return toPublicProfileUser(viewerSlice, target);
  },
};

// ── Internal helpers ────────────────────────────────────────────────────────────

/**
 * Merge an OAuth identity into an existing user or create a new document.
 *
 * @param idField - Provider-specific id field name on the User schema.
 * @param profile - Normalised OAuth profile.
 * @returns Upserted user document.
 */
async function mergeOAuthUser(
  idField: "googleId",
  profile: OAuthProfileInput
): Promise<IUser> {
  const email = profile.email?.trim().toLowerCase() || null;

  let user =
    (await User.findOne({ [idField]: profile.providerId })) ??
    (email ? await User.findOne({ email }) : null);

  if (user) {
    user[idField] = profile.providerId;
    if (email) {
      user.email = email;
      user.emailVerified = profile.emailVerified ?? user.emailVerified ?? new Date();
    }
    if (profile.name) {
      const split = splitPersonName(profile.name);
      user.name = split.name || user.name;
      if (split.surname) user.surname = split.surname;
    }
    if (profile.image) user.avatar = profile.image;
    await user.save();
    return user;
  }

  const split = splitPersonName(profile.name || "Nexus User");

  user = await createUserDocument({
    [idField]: profile.providerId,
    email,
    emailVerified: email ? (profile.emailVerified ?? new Date()) : null,
    name: split.name || profile.name || "Nexus User",
    surname: split.surname,
    avatar: profile.image ?? null,
    personalDataConsentAt: null,
  });

  return user;
}

/**
 * Link an OAuth provider identity onto an existing user document.
 *
 * @param userId - Target user MongoDB id.
 * @param idField - Provider-specific id field on the User schema.
 * @param profile - Normalised OAuth profile.
 * @returns Updated user document.
 * @throws When user not found or provider id/email conflicts with another account.
 */
async function linkOAuthProfileToUser(
  userId: string,
  idField: "googleId",
  profile: OAuthProfileInput,
): Promise<IUser> {
  const email = profile.email?.trim().toLowerCase() || null;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const existingProviderId = user[idField];
  if (existingProviderId && existingProviderId !== profile.providerId) {
    throw new Error("A different Google account is already linked.");
  }

  const existingByProvider = await User.findOne({
    [idField]: profile.providerId,
    _id: { $ne: userId },
  });
  if (existingByProvider) {
    throw new Error("This OAuth account is linked to another Nexus user.");
  }

  if (email) {
    const existingByEmail = await User.findOne({ email, _id: { $ne: userId } });
    if (existingByEmail) {
      throw new Error("This OAuth email is linked to another Nexus user.");
    }

    user.email = email;
    user.emailVerified = profile.emailVerified ?? user.emailVerified ?? new Date();
  }

  user[idField] = profile.providerId;
  if (profile.name) user.name = profile.name;
  if (profile.image) user.avatar = profile.image;
  await user.save();
  return user;
}

/**
 * Format a display name from Telegram Web App user fields.
 *
 * @param user - Parsed Telegram user from initData.
 * @returns Combined first/last name or empty string.
 */
function formatTelegramDisplayName(user: TelegramWebAppUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}

/**
 * Map verified Telegram Web App user to a safe onboarding payload.
 *
 * @param user - Parsed Telegram user from initData.
 * @returns Public onboarding user fields.
 */
function toTelegramMiniAppPublicUser(user: TelegramWebAppUser): TelegramMiniAppPublicUser {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    photo_url: user.photo_url,
  };
}

/**
 * Verify Telegram Login Widget HMAC hash per official Telegram docs.
 *
 * @param payload - Widget callback payload.
 * @param botToken - Bot token used as HMAC secret seed.
 * @throws When computed hash does not match payload hash.
 */
function verifyTelegramHash(payload: TelegramWidgetPayload, botToken: string): void {
  const { hash, ...data } = payload;

  const checkString = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  if (computed !== hash) {
    throw new Error("Invalid Telegram authentication hash.");
  }
}

/**
 * Merge catalog and legacy user labels into a sorted unique list.
 *
 * @param primary - Preferred labels (catalog approved).
 * @param fallback - Legacy labels from user documents.
 * @returns Case-insensitive unique labels sorted alphabetically.
 */
function mergeUniqueLabels(primary: string[], fallback: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const label of [...primary, ...fallback]) {
    const normalized = label.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }

  return merged.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * List OAuth providers linked on a user without a password hash.
 *
 * @param user - User document with provider id fields.
 * @returns Provider slugs for error messaging.
 */
function listLinkedOAuthProviders(user: IUser): LinkedOAuthProvider[] {
  const providers: LinkedOAuthProvider[] = [];
  if (user.googleId) providers.push("google");
  if (user.telegramId) providers.push("telegram");
  return providers;
}

/**
 * Queue pending academic catalog rows when a signup value is not yet approved.
 *
 * @param params - Submitted specialty/group and submitting user id.
 */
async function queuePendingAcademicCatalogEntries(params: {
  specialty: string | null;
  group: string | null;
  submittedByUserId: string;
}): Promise<void> {
  const [approvedSpecialties, approvedGroups] = await Promise.all([
    AcademicCatalog.find({ kind: "specialty", status: "approved" }).lean(),
    AcademicCatalog.find({ kind: "group", status: "approved" }).lean(),
  ]);

  const entries: Array<{ kind: "specialty" | "group"; label: string }> = [];
  const specialty = normalizeAcademicLabel(params.specialty);
  const group = normalizeAcademicLabel(params.group);

  if (
    specialty &&
    !isApprovedAcademicLabel(
      specialty,
      approvedSpecialties.map((row) => row.label),
    )
  ) {
    entries.push({ kind: "specialty", label: specialty });
  }

  if (
    group &&
    !isApprovedAcademicLabel(
      group,
      approvedGroups.map((row) => row.label),
    )
  ) {
    entries.push({ kind: "group", label: group });
  }

  for (const entry of entries) {
    const key = slugifyAcademicCatalogLabel(entry.label);
    if (!key) continue;

    await AcademicCatalog.updateOne(
      { kind: entry.kind, key },
      {
        $setOnInsert: {
          kind: entry.kind,
          key,
          label: entry.label,
          status: "pending",
          submittedByUserId: params.submittedByUserId,
          reviewedAt: null,
          reviewedByUserId: null,
        },
      },
      { upsert: true },
    );
  }
}

export default AuthDomain;
