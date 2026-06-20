/**
 * @fileoverview Authorisation for scheduled media maintenance jobs.
 *
 * Reuses the unified cron job auth helper with the legacy media cleanup secret.
 *
 * @module src/lib/mediaOrphanCleanupAuth
 */

import type { NextRequest } from "next/server";
import { isCronJobAuthorised } from "@/lib/cronJobAuth";

/**
 * Authorise a media orphan cleanup job trigger.
 *
 * Accepts either a unified CRON_SECRET/NEXUS_CRON_SECRET, the legacy
 * `Authorization: Bearer ${MEDIA_ORPHAN_CLEANUP_CRON_SECRET}`, or a legacy Admin session.
 *
 * @param req - Incoming job request.
 * @returns True when the caller may run cleanup.
 */
export async function isMediaOrphanCleanupAuthorised(req: NextRequest): Promise<boolean> {
  return isCronJobAuthorised(req, {
    legacySecrets: [process.env.MEDIA_ORPHAN_CLEANUP_CRON_SECRET],
  });
}
