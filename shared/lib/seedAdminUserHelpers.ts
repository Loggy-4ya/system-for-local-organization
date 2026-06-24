/**
 * @fileoverview Pure helpers for admin seed user maintenance.
 *
 * Tests: `tests/shared/lib/seedAdminUser.test.ts` — `npm run test:seed-admin-user`
 *
 * @module shared/lib/seedAdminUserHelpers
 */

import bcrypt from "bcryptjs";
import type { IUser } from "@shared/models/User";

/**
 * Remove Telegram linkage fields from a user document in memory.
 *
 * @param user - User fields to mutate.
 * @returns Whether any Telegram fields were cleared.
 */
export function clearTelegramLinkage(
  user: Pick<IUser, "telegramId" | "username" | "lastTelegramSyncAt">,
): boolean {
  if (!user.telegramId) {
    return false;
  }

  user.telegramId = null;
  user.username = null;
  user.lastTelegramSyncAt = null;
  return true;
}

/**
 * Whether the stored admin seed password hash should be replaced from env.
 *
 * @param passwordHash - Existing bcrypt hash, if any.
 * @param plainPassword - Password from `ADMIN_SEED_PASSWORD` / `ADMIN_PASSWORD`.
 * @returns True when the hash is missing or does not match the env password.
 */
export async function seedAdminPasswordNeedsUpdate(
  passwordHash: string | null | undefined,
  plainPassword: string,
): Promise<boolean> {
  if (!passwordHash) return true;
  return !(await bcrypt.compare(plainPassword, passwordHash));
}

/**
 * Whether the stored login handle should be replaced from env.
 *
 * @param storedLogin - Existing login on the seed admin document.
 * @param normalizedLogin - Trimmed, lowercased `ADMIN_SEED_LOGIN` / `ADMIN_LOGIN`.
 * @returns True when the stored login differs from env.
 */
export function seedAdminLoginNeedsUpdate(
  storedLogin: string | null | undefined,
  normalizedLogin: string,
): boolean {
  const current = storedLogin?.trim().toLowerCase() ?? "";
  return current !== normalizedLogin;
}

/** Fields mutated when syncing env credentials onto an existing seed admin. */
export type SeedAdminEnvSyncTarget = Pick<
  IUser,
  "login" | "passwordHash" | "telegramId" | "username" | "lastTelegramSyncAt"
>;

/** Result flags from {@link applySeedAdminEnvSync}. */
export interface SeedAdminEnvSyncResult {
  clearedTelegram: boolean;
  syncedLogin: boolean;
  syncedPassword: boolean;
}

/**
 * Apply env login/password maintenance to an in-memory seed admin document.
 *
 * @param user - Existing admin user fields to mutate.
 * @param normalizedLogin - Target login from env.
 * @param plainPassword - Plain password from env (for compare-only path).
 * @param passwordHash - Precomputed bcrypt hash when a password update is required.
 * @returns Which fields were changed.
 */
export async function applySeedAdminEnvSync(
  user: SeedAdminEnvSyncTarget,
  normalizedLogin: string,
  plainPassword: string,
  passwordHash: string,
): Promise<SeedAdminEnvSyncResult> {
  const clearedTelegram = clearTelegramLinkage(user);
  const syncedLogin = seedAdminLoginNeedsUpdate(user.login, normalizedLogin);

  if (syncedLogin) {
    user.login = normalizedLogin;
  }

  const syncedPassword = await seedAdminPasswordNeedsUpdate(user.passwordHash, plainPassword);

  if (syncedPassword) {
    user.passwordHash = passwordHash;
  }

  return { clearedTelegram, syncedLogin, syncedPassword };
}
