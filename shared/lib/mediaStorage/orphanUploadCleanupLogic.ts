/**
 * @fileoverview Pure helpers for orphan upload detection against a reference key set.
 *
 * @module shared/lib/mediaStorage/orphanUploadCleanupLogic
 *
 * Tests: `npm run test:orphan-upload-cleanup`
 * Registry: `.ai/docs/testing.md`
 */

/** One file discovered on the local uploads filesystem. */
export interface LocalUploadInventoryEntry {
  /** Provider storage key (e.g. `avatars/foo.png`). */
  storageKey: string;
  /** Last modified time in milliseconds since epoch. */
  mtimeMs: number;
}

/** Summary returned by orphan cleanup planning/deletion. */
export interface OrphanUploadCleanupSummary {
  /** When true, orphans were listed but not deleted. */
  dryRun: boolean;
  /** Distinct storage keys referenced in MongoDB. */
  referencedCount: number;
  /** Files discovered on disk (excluding `.gitkeep`). */
  onDiskCount: number;
  /** Orphan candidates after age filter. */
  orphanCount: number;
  /** Files skipped because they are newer than the minimum age. */
  skippedRecentCount: number;
  /** Storage keys successfully deleted (empty when dryRun). */
  deletedKeys: string[];
  /** Per-file delete failures. */
  errors: string[];
}

/**
 * Resolve orphan storage keys from disk inventory minus DB references.
 *
 * Files newer than `minAgeMs` are excluded so in-flight uploads not yet saved to MongoDB
 * are not removed.
 *
 * @param referencedKeys - Storage keys still referenced in the database.
 * @param onDisk - Local inventory entries.
 * @param minAgeMs - Minimum file age before deletion eligibility.
 * @param nowMs - Current timestamp (injectable for tests).
 * @returns Orphan storage keys eligible for deletion.
 */
export function findOrphanStorageKeys(
  referencedKeys: ReadonlySet<string>,
  onDisk: readonly LocalUploadInventoryEntry[],
  minAgeMs: number,
  nowMs: number = Date.now(),
): { orphans: string[]; skippedRecentCount: number } {
  const orphans: string[] = [];
  let skippedRecentCount = 0;

  for (const entry of onDisk) {
    if (referencedKeys.has(entry.storageKey)) continue;

    const ageMs = nowMs - entry.mtimeMs;
    if (ageMs < minAgeMs) {
      skippedRecentCount += 1;
      continue;
    }

    orphans.push(entry.storageKey);
  }

  orphans.sort();
  return { orphans, skippedRecentCount };
}

/**
 * Read minimum orphan age from environment (hours → milliseconds).
 *
 * @param env - Environment map (defaults to `process.env`).
 * @returns Minimum age in milliseconds (default 24h).
 */
export function readOrphanMinAgeMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.MEDIA_ORPHAN_MIN_AGE_HOURS?.trim();
  const hours = raw ? Number.parseFloat(raw) : 24;
  if (!Number.isFinite(hours) || hours < 0) {
    return 24 * 60 * 60 * 1000;
  }
  return hours * 60 * 60 * 1000;
}
