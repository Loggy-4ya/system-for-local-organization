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
import { clearTelegramLinkage } from "@shared/lib/seedAdminUserHelpers";

const BCRYPT_ROUNDS = 12;

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
      const clearedTelegram = clearTelegramLinkage(existingByLogin);
      if (clearedTelegram) {
        await existingByLogin.save();
        console.log(`[Nexus Seed] Cleared Telegram linkage from admin "${normalizedLogin}".`);
      }
      return;
    }

    const legacyByEmail =
      normalizedLegacyEmail != null
        ? await User.findOne({ email: normalizedLegacyEmail }).select("+passwordHash")
        : null;

    if (legacyByEmail) {
      legacyByEmail.login = normalizedLogin;
      legacyByEmail.role = "Admin";
      legacyByEmail.accessLevelIndex = 0;
      legacyByEmail.passwordHash = passwordHash;
      clearTelegramLinkage(legacyByEmail);
      await legacyByEmail.save();

      console.log(
        `[Nexus Seed] Legacy admin upgraded with login "${normalizedLogin}" (legacy email lookup only).`,
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
