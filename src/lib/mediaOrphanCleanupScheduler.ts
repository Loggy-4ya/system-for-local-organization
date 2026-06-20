/**
 * @fileoverview In-process scheduler for periodic orphan upload cleanup.
 *
 * Enabled when `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS` is a positive number and
 * `MEDIA_STORAGE_DRIVER=local`. Started from `src/instrumentation.ts`.
 *
 * @module src/lib/mediaOrphanCleanupScheduler
 */

import connectDB from "@shared/lib/db";
import { MediaDomain } from "@shared/domains/MediaDomain";

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let cleanupInFlight = false;

/**
 * Run one orphan cleanup pass (honours dry-run only when explicitly requested).
 *
 * @param dryRun - When true, list orphans without deleting.
 */
export async function runMediaOrphanCleanupPass(dryRun = false): Promise<void> {
  if (cleanupInFlight) {
    console.info("[MediaOrphanCleanup] Skipped — previous pass still running.");
    return;
  }

  cleanupInFlight = true;
  try {
    await connectDB();
    const summary = await MediaDomain.cleanupOrphanUploads({ dryRun });
    console.info("[MediaOrphanCleanup] Completed.", summary);
  } catch (err) {
    console.error("[MediaOrphanCleanup] Failed.", err);
  } finally {
    cleanupInFlight = false;
  }
}

/**
 * Start periodic orphan upload cleanup for this Node process.
 *
 * @param intervalHours - Hours between passes.
 */
export function scheduleMediaOrphanCleanup(intervalHours: number): void {
  if (intervalHandle) return;
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) return;

  const intervalMs = intervalHours * 60 * 60 * 1000;
  console.info(
    `[MediaOrphanCleanup] Scheduled every ${intervalHours}h (${intervalMs}ms).`,
  );

  void runMediaOrphanCleanupPass(false);

  intervalHandle = setInterval(() => {
    void runMediaOrphanCleanupPass(false);
  }, intervalMs);

  if (typeof intervalHandle.unref === "function") {
    intervalHandle.unref();
  }
}
