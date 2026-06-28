/**
 * @fileoverview Environment configuration readers for Nexus scheduled/background jobs.
 *
 * Intervals are clamped by {@link getNexusHostingPolicy} on always-on VPS deployments.
 * always return 0 for in-process loops regardless of raw env values.
 *
 * @module src/lib/nexusJobsConfig
 */

import { getNexusHostingPolicy } from "@/lib/nexusHostingBootstrap";

/**
 * Read the scheduled events tick interval in milliseconds.
 *
 * Honors `NEXUS_HOSTING_MODE` — HTTP cron is optional when in-process tick is disabled.
 *
 * @returns The interval in milliseconds, or 0 if disabled.
 */
export function readScheduledEventsTickIntervalMs(): number {
  return getNexusHostingPolicy().scheduledEventsTickIntervalMs;
}

/**
 * Read the media orphan cleanup interval in hours.
 *
 * Honors `NEXUS_HOSTING_MODE` — HTTP cron is optional when in-process tick is disabled.
 *
 * @returns The interval in hours, or 0 if disabled.
 */
export function readMediaOrphanCleanupIntervalHours(): number {
  return getNexusHostingPolicy().mediaOrphanCleanupIntervalHours;
}

/**
 * Determine whether any in-process scheduled jobs are enabled.
 *
 * @returns True when at least one periodic background job is scheduled in-process.
 */
export function isInProcessJobsEnabled(): boolean {
  const policy = getNexusHostingPolicy();
  return policy.scheduledEventsTickIntervalMs > 0 || policy.mediaOrphanCleanupIntervalHours > 0;
}
