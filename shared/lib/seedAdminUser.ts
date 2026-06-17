/**
 * @fileoverview Database seeding logic for the Admin seed user.
 *
 * Creates the admin when missing, or backfills `login` on legacy email-only seed
 * documents from before credentials sign-in used login handles.
 *
 * @module shared/lib/seedAdminUser
 */

import bcrypt from "bcryptjs";
import connectDB from "@shared/lib/db";
import User from "@shared/models/User";

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
  const email = process.env.ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD;

  if (!login || !password) {
    return;
  }

  try {
    await connectDB();

    const normalizedLogin = login.trim().toLowerCase();
    const normalizedEmail = email?.trim().toLowerCase() ?? null;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const existingByLogin = await User.findOne({ login: normalizedLogin }).select("+passwordHash");

    if (existingByLogin) {
      return;
    }

    const legacyByEmail =
      normalizedEmail != null
        ? await User.findOne({ email: normalizedEmail }).select("+passwordHash")
        : null;

    if (legacyByEmail) {
      legacyByEmail.login = normalizedLogin;
      legacyByEmail.role = "Admin";
      legacyByEmail.passwordHash = passwordHash;
      await legacyByEmail.save();

      console.log(
        `[Nexus Seed] Legacy admin upgraded with login "${normalizedLogin}" (email: ${normalizedEmail})`,
      );
      return;
    }

    await User.create({
      login: normalizedLogin,
      email: normalizedEmail,
      passwordHash,
      name: "Admin Seed User",
      role: "Admin",
      specialty: "System Administration",
      group: "SYS-01",
      studentTitle: "Starosta",
      accentFamily: "blue",
      accentShade: "medium",
    });

    console.log(`[Nexus Seed] Admin seed user created successfully: ${normalizedLogin}`);
  } catch (err) {
    console.error("[Nexus Seed] Error seeding Admin user:", err);
  }
}
