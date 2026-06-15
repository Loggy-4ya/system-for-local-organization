/**
 * @fileoverview Consolidated authentication and profile domain engine for Project Nexus.
 *
 * Single cohesive domain object handling credentials registration, OAuth identity
 * merging (Google, Apple), Telegram Login Widget verification, and profile mutations.
 * All auth-related database operations must flow through this module.
 *
 * @module shared/domains/AuthDomain
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@shared/lib/db";
import User, {
  type AccentFamily,
  type AccentShade,
  type IUser,
  type StudentTitle,
  type UserRole,
} from "@shared/models/User";
import { registerSchema } from "@shared/validation/authSchemas";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Input for credentials-based student registration. */
export interface RegisterCredentialsInput {
  email: string;
  password: string;
  name: string;
  specialty?: string | null;
  group?: string | null;
  studentTitle?: StudentTitle | null;
}

/** OAuth profile shape from Google or Apple providers. */
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
  email: string | null;
  name: string;
  username: string | null;
  avatar: string | null;
  role: UserRole;
  specialty: string | null;
  group: string | null;
  studentTitle: StudentTitle | null;
  accentFamily: AccentFamily;
  accentShade: AccentShade;
  stars: number;
  warnings: number;
  googleId: string | null;
  appleId: string | null;
  telegramId: number | null;
  phone: string | null;
  lastTelegramSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Patch payload for profile settings updates. */
export interface ProfileUpdateInput {
  name?: string;
  specialty?: string | null;
  group?: string | null;
  studentTitle?: StudentTitle | null;
  avatar?: string | null;
  accentFamily?: AccentFamily;
  accentShade?: AccentShade;
}

const BCRYPT_ROUNDS = 12;

/** Maximum age of a Telegram widget auth payload in seconds. */
const TELEGRAM_AUTH_MAX_AGE_SEC = 86_400;

// ── AuthDomain ────────────────────────────────────────────────────────────────

/**
 * Authentication and profile domain engine.
 *
 * Consolidates all user identity mutations for the Nexus web app and future
 * Telegram worker integrations.
 */
export const AuthDomain = {
  /**
   * Register a new user with email and password credentials.
   *
   * @param input - Registration fields from the student signup form.
   * @returns The created user document.
   * @throws When email is already registered or validation fails.
   */
  async registerWithCredentials(input: RegisterCredentialsInput): Promise<IUser> {
    await connectDB();

    // Enforce schema validation
    const parsed = registerSchema.parse({
      email: input.email,
      password: input.password,
      name: input.name || input.email.split("@")[0],
      specialty: input.specialty,
      group: input.group,
      studentTitle: input.studentTitle ?? "Neither",
    });

    const email = parsed.email;
    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(parsed.password, BCRYPT_ROUNDS);

    const user = await User.create({
      email,
      passwordHash,
      name: parsed.name || email.split("@")[0],
      specialty: parsed.specialty,
      group: parsed.group,
      studentTitle: parsed.studentTitle,
    });

    return user;
  },

  /**
   * Validate email/password credentials for Auth.js Credentials provider.
   *
   * @param email - User email address.
   * @param password - Plain-text password.
   * @returns Matching user document or null when invalid.
   */
  async validateCredentials(email: string, password: string): Promise<IUser | null> {
    await connectDB();

    const normalized = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalized }).select("+passwordHash");
    if (!user?.passwordHash) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
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
   * Find or create a user from an Apple Sign In profile.
   *
   * Merges by `appleId` first, then by email if present.
   *
   * @param profile - Apple OAuth profile data.
   * @returns Upserted user document.
   */
  async findOrCreateFromApple(profile: OAuthProfileInput): Promise<IUser> {
    await connectDB();
    return mergeOAuthUser("appleId", profile);
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

    let user = await User.findOne({ telegramId: payload.id });

    if (user) {
      user.name = name || user.name;
      user.username = payload.username ?? user.username;
      user.avatar = payload.photo_url ?? user.avatar;
      user.lastTelegramSyncAt = syncAt;
      await user.save();
      return user;
    }

    user = await User.create({
      telegramId: payload.id,
      name: name || `Telegram User ${payload.id}`,
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

    if (patch.name !== undefined) user.name = patch.name.trim();
    if (patch.specialty !== undefined) user.specialty = patch.specialty?.trim() || null;
    if (patch.group !== undefined) user.group = patch.group?.trim() || null;
    if (patch.studentTitle !== undefined) user.studentTitle = patch.studentTitle;
    if (patch.avatar !== undefined) user.avatar = patch.avatar;
    if (patch.accentFamily !== undefined) user.accentFamily = patch.accentFamily;
    if (patch.accentShade !== undefined) user.accentShade = patch.accentShade;

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
   * Convert a Mongoose user document to a safe public representation.
   *
   * @param doc - User document (passwordHash is never included).
   * @returns Public user object for API and session payloads.
   */
  toPublicUser(doc: IUser): PublicUser {
    return {
      id: String(doc._id),
      email: doc.email,
      name: doc.name,
      username: doc.username,
      avatar: doc.avatar,
      role: doc.role,
      specialty: doc.specialty,
      group: doc.group,
      studentTitle: doc.studentTitle,
      accentFamily: doc.accentFamily,
      accentShade: doc.accentShade,
      stars: doc.stars,
      warnings: doc.warnings,
      googleId: doc.googleId,
      appleId: doc.appleId,
      telegramId: doc.telegramId,
      phone: doc.phone,
      lastTelegramSyncAt: doc.lastTelegramSyncAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
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
  idField: "googleId" | "appleId",
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
    if (profile.name) user.name = profile.name;
    if (profile.image) user.avatar = profile.image;
    await user.save();
    return user;
  }

  user = await User.create({
    [idField]: profile.providerId,
    email,
    emailVerified: email ? (profile.emailVerified ?? new Date()) : null,
    name: profile.name || "Nexus User",
    avatar: profile.image ?? null,
  });

  return user;
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

export default AuthDomain;
