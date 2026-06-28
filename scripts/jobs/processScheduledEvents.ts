/**
 * @fileoverview CLI entrypoint for processing due scheduled events (`npm run job:process-scheduled-events`).
 *
 * Connects to MongoDB, registers scheduled event handlers, and runs the tick process.
 *
 * @module scripts/processScheduledEvents
 */

import connectDB from "@shared/lib/db";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { registerScheduledEventHandlers } from "@shared/lib/scheduledEventHandlers/index";

/**
 * Execute scheduled events processing from the command line.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  // Simple CLI argument parsing
  let limit: number | undefined = undefined;
  const limitIdx = process.argv.indexOf("--limit");
  if (limitIdx !== -1 && limitIdx + 1 < process.argv.length) {
    const parsedLimit = Number.parseInt(process.argv[limitIdx + 1], 10);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      limit = parsedLimit;
    }
  }

  let eventTypes: string[] | undefined = undefined;
  const typesIdx = process.argv.indexOf("--event-types");
  if (typesIdx !== -1 && typesIdx + 1 < process.argv.length) {
    eventTypes = process.argv[typesIdx + 1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Register handlers before running tick
  registerScheduledEventHandlers();

  await connectDB();
  const summary = await SchedulerDomain.processDueEvents({
    limit,
    dryRun,
    eventTypes,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("[processScheduledEvents CLI failed]", err);
  process.exitCode = 1;
});
