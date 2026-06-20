/**
 * @fileoverview CLI entrypoint for orphan upload cleanup (`npm run job:media-orphan-cleanup`).
 *
 * Connects to MongoDB, scans `public/uploads/` against references, and deletes
 * files older than `MEDIA_ORPHAN_MIN_AGE_HOURS` (default 24).
 *
 * @module scripts/mediaOrphanCleanup
 */

import connectDB from "@shared/lib/db";
import { MediaDomain } from "@shared/domains/MediaDomain";

/**
 * Execute orphan cleanup from the command line.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();
  const summary = await MediaDomain.cleanupOrphanUploads({ dryRun });

  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[mediaOrphanCleanup]", err);
  process.exitCode = 1;
});
