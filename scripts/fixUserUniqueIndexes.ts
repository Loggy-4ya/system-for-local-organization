/**
 * @fileoverview One-off migration — fix `email_1` / `login_1` E11000 on `{ email: null }`.
 *
 * Unsets null/empty optional unique fields and replaces legacy sparse/non-partial
 * unique indexes with partial unique indexes (see {@link User} schema).
 *
 * Run: `npm run job:fix-user-unique-indexes`
 * Dry run: `npm run job:fix-user-unique-indexes:dry-run`
 *
 * @module scripts/fixUserUniqueIndexes
 */

import connectDB from "@shared/lib/db";
import User from "@shared/models/User";

/** Partial filter for optional unique string fields — `$ne` is invalid in partial indexes. */
const NON_EMPTY_STRING_PARTIAL_FILTER = { $gt: "" } as const;

const PARTIAL_UNIQUE_INDEXES = [
  {
    key: { login: 1 },
    options: {
      unique: true,
      name: "login_1",
      partialFilterExpression: { login: NON_EMPTY_STRING_PARTIAL_FILTER },
    },
  },
  {
    key: { email: 1 },
    options: {
      unique: true,
      name: "email_1",
      partialFilterExpression: { email: NON_EMPTY_STRING_PARTIAL_FILTER },
    },
  },
] as const;

/**
 * Drop and recreate login/email indexes with partial unique filters.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  const nullEmailCount = await User.countDocuments({
    $or: [{ email: null }, { email: "" }],
  });
  const nullLoginCount = await User.countDocuments({
    $or: [{ login: null }, { login: "" }],
  });

  console.log(`[fixUserUniqueIndexes] Users with null/empty email: ${nullEmailCount}`);
  console.log(`[fixUserUniqueIndexes] Users with null/empty login: ${nullLoginCount}`);

  const collection = User.collection;
  const existing = await collection.indexes();
  console.log(
    "[fixUserUniqueIndexes] Existing indexes:",
    existing.map((idx) => idx.name).join(", "),
  );

  if (dryRun) {
    console.log("[fixUserUniqueIndexes] Dry run — no documents or indexes modified.");
    return;
  }

  if (nullEmailCount > 0) {
    const emailResult = await User.updateMany(
      { $or: [{ email: null }, { email: "" }] },
      { $unset: { email: "" } },
    );
    console.log("[fixUserUniqueIndexes] Unset email:", emailResult.modifiedCount);
  }

  if (nullLoginCount > 0) {
    const loginResult = await User.updateMany(
      { $or: [{ login: null }, { login: "" }] },
      { $unset: { login: "" } },
    );
    console.log("[fixUserUniqueIndexes] Unset login:", loginResult.modifiedCount);
  }

  for (const indexName of ["email_1", "login_1"] as const) {
    try {
      await collection.dropIndex(indexName);
      console.log(`[fixUserUniqueIndexes] Dropped index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("index not found") && !message.includes("ns not found")) {
        throw error;
      }
      console.log(`[fixUserUniqueIndexes] Index ${indexName} not present — skipped drop`);
    }
  }

  for (const spec of PARTIAL_UNIQUE_INDEXES) {
    await collection.createIndex(spec.key, spec.options);
    console.log(`[fixUserUniqueIndexes] Created index ${spec.options.name}`);
  }

  console.log("[fixUserUniqueIndexes] Done.");
}

main().catch((err) => {
  console.error("[fixUserUniqueIndexes]", err);
  process.exitCode = 1;
});
