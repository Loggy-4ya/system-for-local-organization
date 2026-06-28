/**
 * @fileoverview One-off migration — removes deprecated `accentFamily` / `accentShade`
 * from all User documents after the per-user accent feature was retired.
 *
 * Run: `npm run job:remove-user-accent-fields`
 * Dry run: `npm run job:remove-user-accent-fields:dry-run`
 *
 * @module scripts/removeUserAccentFields
 */

import connectDB from "@shared/lib/db";
import User from "@shared/models/User";

/**
 * Strip legacy accent fields from every user document that still carries them.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  const filter = {
    $or: [{ accentFamily: { $exists: true } }, { accentShade: { $exists: true } }],
  };

  const matched = await User.countDocuments(filter);
  console.log(`[removeUserAccentFields] Users with legacy accent fields: ${matched}`);

  if (dryRun) {
    console.log("[removeUserAccentFields] Dry run — no documents modified.");
    return;
  }

  if (matched === 0) {
    console.log("[removeUserAccentFields] Nothing to migrate.");
    return;
  }

  const result = await User.updateMany(filter, {
    $unset: { accentFamily: "", accentShade: "" },
  });

  console.log(
    JSON.stringify(
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[removeUserAccentFields]", err);
  process.exitCode = 1;
});
