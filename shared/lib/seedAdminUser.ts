/**
 * @fileoverview Database seeding logic for the Admin seed user.
 *
 * Checks if the Admin seed user exists in MongoDB. If not, it creates
 * the Admin user using credentials defined in the environment variables.
 *
 * @module shared/lib/seedAdminUser
 */

import bcrypt from "bcryptjs";
import connectDB from "@shared/lib/db";
import User from "@shared/models/User";

const BCRYPT_ROUNDS = 12;

/**
 * Seed the Admin user if it does not exist in MongoDB.
 */
export async function seedAdminUser(): Promise<void> {
  // Skip seeding during Next.js build / static pre-rendering phase
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.IS_BUILD_PHASE === "true") {
    return;
  }

  const email = process.env.ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    // If environment variables are not set, skip seeding silently
    return;
  }

  try {
    await connectDB();

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      await User.create({
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

      console.log(`[Nexus Seed] Admin seed user created successfully: ${normalizedEmail}`);
    }
  } catch (err) {
    console.error("[Nexus Seed] Error seeding Admin user:", err);
  }
}
