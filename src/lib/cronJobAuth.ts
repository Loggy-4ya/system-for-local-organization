/**
 * @fileoverview Unified cron and maintenance job authorization checks.
 *
 * Supports Vercel's convention `CRON_SECRET`, `NEXUS_CRON_SECRET`, legacy fallback secrets,
 * and standard admin session authorization.
 *
 * @module src/lib/cronJobAuth
 */

import type { NextRequest } from "next/server";
import { requireAdminRole } from "@/lib/authGuards";

/** Options for cron job authorization. */
export interface CronJobAuthOptions {
  /** Optional legacy secrets for backward compatibility. */
  legacySecrets?: (string | undefined)[];
}

/**
 * Authorize a cron or background maintenance job request.
 *
 * Checks bearer token in the Authorization header against `CRON_SECRET`, `NEXUS_CRON_SECRET`,
 * and any legacy secrets. Falls back to verifying the user has an Admin role.
 *
 * @param req - Incoming request.
 * @param options - Authorization configuration including legacy fallback secrets.
 * @returns True when the request is authorized.
 */
export async function isCronJobAuthorised(
  req: NextRequest,
  options?: CronJobAuthOptions,
): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : "";

  if (token) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret && token === cronSecret) {
      return true;
    }

    const nexusCronSecret = process.env.NEXUS_CRON_SECRET?.trim();
    if (nexusCronSecret && token === nexusCronSecret) {
      return true;
    }

    if (options?.legacySecrets) {
      for (const legacy of options.legacySecrets) {
        const trimmed = legacy?.trim();
        if (trimmed && token === trimmed) {
          return true;
        }
      }
    }
  }

  try {
    await requireAdminRole();
    return true;
  } catch {
    return false;
  }
}
