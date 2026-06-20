/**
 * @fileoverview In-process scheduler for periodic scheduled events processing.
 *
 * Enabled when `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS` is a positive number.
 * Started from Next.js `src/instrumentation.ts`.
 *
 * @module src/lib/scheduledEventsScheduler
 */

import connectDB from "@shared/lib/db";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let tickInFlight = false;

/**
 * Run one scheduled events execution pass.
 *
 * @returns Promise resolving when the pass finishes.
 */
export async function runScheduledEventsTick(): Promise<void> {
  if (tickInFlight) {
    console.info("[ScheduledEvents] Skipped — previous tick still running.");
    return;
  }

  tickInFlight = true;
  try {
    await connectDB();
    const summary = await SchedulerDomain.processDueEvents({ limit: 50 });
    
    // Only log if something was actually evaluated to prevent log clutter at tight intervals
    if (summary.processed > 0) {
      console.info("[ScheduledEvents] Tick completed.", {
        processed: summary.processed,
        completed: summary.completed,
        failed: summary.failed,
      });
    }
  } catch (err) {
    console.error("[ScheduledEvents] Tick failed.", err);
  } finally {
    tickInFlight = false;
  }
}

/**
 * Start the periodic in-process execution loop.
 *
 * @param intervalMs - Execution period in milliseconds.
 */
export function startScheduledEventsScheduler(intervalMs: number): void {
  if (intervalHandle) return;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

  console.info(
    `[ScheduledEvents] Scheduled every ${intervalMs / 1000}s (${intervalMs}ms).`,
  );

  // Execute first run shortly after boot to process any backlog
  setTimeout(() => {
    void runScheduledEventsTick();
  }, 1000);

  intervalHandle = setInterval(() => {
    void runScheduledEventsTick();
  }, intervalMs);

  if (typeof intervalHandle.unref === "function") {
    intervalHandle.unref();
  }
}
