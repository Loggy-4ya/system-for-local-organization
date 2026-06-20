/**
 * @fileoverview Environment configuration readers for Nexus scheduled/background jobs.
 *
 * @module src/lib/nexusJobsConfig
 */

/**
 * Read the scheduled events tick interval in milliseconds.
 *
 * Read from `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS`. Defaults to 0 (disabled).
 *
 * @returns The interval in milliseconds, or 0 if disabled.
 */
export function readScheduledEventsTickIntervalMs(): number {
  const rawSeconds = process.env.SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS?.trim();
  if (!rawSeconds) return 0;
  const seconds = Number.parseFloat(rawSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

/**
 * Read the media orphan cleanup interval in hours.
 *
 * Read from `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS`. Defaults to 0 (disabled).
 *
 * @returns The interval in hours, or 0 if disabled.
 */
export function readMediaOrphanCleanupIntervalHours(): number {
  const rawHours = process.env.MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS?.trim();
  if (!rawHours) return 0;
  const hours = Number.parseFloat(rawHours);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

/**
 * Determine whether any in-process scheduled jobs are enabled.
 *
 * @returns True when at least one periodic background job is scheduled in-process.
 */
export function isInProcessJobsEnabled(): boolean {
  return readScheduledEventsTickIntervalMs() > 0 || readMediaOrphanCleanupIntervalHours() > 0;
}
