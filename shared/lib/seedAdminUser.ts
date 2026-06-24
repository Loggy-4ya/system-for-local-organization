/**
 * @fileoverview Database seeding logic for the Admin seed user.
 *
 * Creates the admin when missing, or backfills `login` on legacy email-only seed
 * documents from before credentials sign-in used login handles. The seed user has
 * login + password + Admin role only — no Telegram linkage, no env-seeded email
 * (email is populated when Google OAuth is linked from profile settings), and no
 * specialty, group, student title, or socium profile data (those are set via the UI).
 *
 * Tests: `tests/shared/lib/seedAdminUser.test.ts` — `npm run test:seed-admin-user`
 *
 * @module shared/lib/seedAdminUser
 */

import bcrypt from "bcryptjs";
import connectDB from "@shared/lib/db";
import User from "@shared/models/User";
import { applySeedAdminEnvSync } from "@shared/lib/seedAdminUserHelpers";
import type { SeedAdminEnvSyncTarget } from "@shared/lib/seedAdminUserHelpers";

const BCRYPT_ROUNDS = 12;

/**
 * Persist env credential sync when any maintenance field changed.
 *
 * @param user - Seed admin document with pending mutations.
 * @param normalizedLogin - Target login from env.
 * @param sync - Flags from {@link applySeedAdminEnvSync}.
 * @returns Resolves after save when needed.
 */
async function saveSeedAdminEnvSyncIfNeeded(
  user: SeedAdminEnvSyncTarget & { save: () => Promise<unknown> },
  normalizedLogin: string,
  sync: Awaited<ReturnType<typeof applySeedAdminEnvSync>>,
): Promise<void> {
  const { clearedTelegram, syncedLogin, syncedPassword } = sync;

  if (!clearedTelegram && !syncedLogin && !syncedPassword) {
    return;
  }

  await user.save();

  if (clearedTelegram) {
    console.log(`[Nexus Seed] Cleared Telegram linkage from admin "${normalizedLogin}".`);
  }
  if (syncedLogin) {
    console.log(`[Nexus Seed] Synced admin login from env for "${normalizedLogin}".`);
  }
  if (syncedPassword) {
    console.log(`[Nexus Seed] Synced admin password from env for "${normalizedLogin}".`);
  }
}

/**
 * Seed or upgrade the Admin user in MongoDB.
 *
 * @returns Resolves when seeding or legacy migration completes.
 */
export async function seedAdminUser(): Promise<void> {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.IS_BUILD_PHASE === "true") {
    return;
  }

  const login = process.env.ADMIN_LOGIN || process.env.ADMIN_SEED_LOGIN;
  const legacyEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD;

  if (!login || !password) {
    return;
  }

  try {
    await connectDB();

    const normalizedLogin = login.trim().toLowerCase();
    const normalizedLegacyEmail = legacyEmail?.trim().toLowerCase() ?? null;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const existingByLogin = await User.findOne({ login: normalizedLogin }).select("+passwordHash");

    if (existingByLogin) {
      await saveSeedAdminEnvSyncIfNeeded(
        existingByLogin,
        normalizedLogin,
        await applySeedAdminEnvSync(existingByLogin, normalizedLogin, password, passwordHash),
      );
      return;
    }

    const legacyByEmail =
      normalizedLegacyEmail != null
        ? await User.findOne({ email: normalizedLegacyEmail }).select("+passwordHash")
        : null;

    if (legacyByEmail) {
      legacyByEmail.role = "Admin";
      legacyByEmail.accessLevelIndex = 0;
      await saveSeedAdminEnvSyncIfNeeded(
        legacyByEmail,
        normalizedLogin,
        await applySeedAdminEnvSync(legacyByEmail, normalizedLogin, password, passwordHash),
      );

      console.log(
        `[Nexus Seed] Legacy admin upgraded with login "${normalizedLogin}" (legacy email lookup only).`,
      );
      return;
    }

    const singletonSeedAdmins = await User.find({
      role: "Admin",
      accessLevelIndex: 0,
      login: { $ne: normalizedLogin },
    })
      .select("+passwordHash")
      .sort({ createdAt: 1 })
      .limit(2);

    if (singletonSeedAdmins.length === 1) {
      const existingSeedAdmin = singletonSeedAdmins[0]!;
      await saveSeedAdminEnvSyncIfNeeded(
        existingSeedAdmin,
        normalizedLogin,
        await applySeedAdminEnvSync(existingSeedAdmin, normalizedLogin, password, passwordHash),
      );
      return;
    }

    await User.create({
      login: normalizedLogin,
      passwordHash,
      name: normalizedLogin,
      role: "Admin",
      accessLevelIndex: 0,
    });

    console.log(`[Nexus Seed] Admin seed user created successfully: ${normalizedLogin}`);
  } catch (err) {
    console.error("[Nexus Seed] Error seeding Admin user:", err);
  }
}
