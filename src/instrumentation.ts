/**
 * @fileoverview Next.js instrumentation hook — registers scheduled background tasks on boot.
 *
 * @module src/instrumentation
 */

/**
 * Register background maintenance tasks when the Node server boots.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { bootstrapNexusHosting } = await import("@/lib/nexusHostingBootstrap");
  bootstrapNexusHosting();

  // Central registration of all background job event handlers
  const { registerScheduledEventHandlers } = await import(
    "@shared/lib/scheduledEventHandlers/index"
  );
  registerScheduledEventHandlers();

  const {
    readScheduledEventsTickIntervalMs,
    readMediaOrphanCleanupIntervalHours,
  } = await import("@/lib/nexusJobsConfig");

  const tickIntervalMs = readScheduledEventsTickIntervalMs();
  if (tickIntervalMs > 0) {
    const { startScheduledEventsScheduler } = await import("@/lib/scheduledEventsScheduler");
    startScheduledEventsScheduler(tickIntervalMs);
  }

  const cleanupIntervalHours = readMediaOrphanCleanupIntervalHours();
  if (cleanupIntervalHours > 0) {
    const { scheduleMediaOrphanCleanup } = await import("@/lib/mediaOrphanCleanupScheduler");
    scheduleMediaOrphanCleanup(cleanupIntervalHours);
  }
}
