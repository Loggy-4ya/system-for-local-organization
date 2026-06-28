/**
 * @fileoverview One-off migration — seeds default Explore/Manage header navigation.
 *
 * Uses `MONGODB_URI` from `.env.local` when set (remote Atlas in typical dev setups).
 *
 * Run: `npm run job:migrate-global-layout-header`
 * Dry run: `npm run job:migrate-global-layout-header:dry-run`
 * Force replace: `npm run job:migrate-global-layout-header -- --force`
 *
 * @module scripts/migrateGlobalLayoutHeader
 */

import mongoose from "mongoose";
import { envPath, loadEnvLocal } from "../../env/loadEnvLocal";

loadEnvLocal();

/**
 * Apply the current default header categories when the singleton is empty or legacy.
 *
 * Pass `--force` to replace any stored header categories with the current default seed.
 */
async function run(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    console.error(
      `[migrateGlobalLayoutHeader] MONGODB_URI is missing. Set it in ${envPath} or export it before running.`,
    );
    process.exitCode = 1;
    return;
  }

  const [{ GlobalLayoutDomain }, { cloneDefaultHeaderCategories, shouldApplyDefaultHeaderCategories }] =
    await Promise.all([
      import("@shared/domains/GlobalLayoutDomain"),
      import("@shared/lib/globalLayoutHeaderSeedLogic"),
    ]);

  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  try {
    const doc = await GlobalLayoutDomain.loadOrSeed();
    const categories = doc.header?.categories ?? [];
    const shouldMigrate = force || shouldApplyDefaultHeaderCategories(categories);

    console.log(
      `[migrateGlobalLayoutHeader] Current categories: ${categories.length}; migrate: ${shouldMigrate}${force ? " (forced)" : ""}`,
    );

    if (!shouldMigrate) {
      console.log("[migrateGlobalLayoutHeader] Header navigation already customized — no changes.");
      console.log("[migrateGlobalLayoutHeader] Re-run with --force to replace stored categories.");
      return;
    }

    if (dryRun) {
      console.log(
        `[migrateGlobalLayoutHeader] Dry run — would seed ${cloneDefaultHeaderCategories().length} categories.`,
      );
      return;
    }

    doc.header.categories = cloneDefaultHeaderCategories();
    doc.markModified("header.categories");
    await doc.save();

    console.log(
      `[migrateGlobalLayoutHeader] Seeded ${doc.header.categories.length} header categories.`,
    );
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

run().catch((error: unknown) => {
  console.error("[migrateGlobalLayoutHeader] Failed:", error);
  process.exitCode = 1;
});
