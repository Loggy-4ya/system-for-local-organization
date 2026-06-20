/**
 * @fileoverview Consolidated scheduled events domain engine for Project Nexus.
 *
 * Provides a single, unified interface for registering background task handlers,
 * scheduling future events, cancelling events, and driving the periodic execution tick.
 *
 * @module shared/domains/SchedulerDomain
 */

import connectDB from "@shared/lib/db";
import SystemScheduledEvent, { type ISystemScheduledEvent } from "@shared/models/SystemScheduledEvent";
import {
  buildClaimUpdate,
  resolveProcessOutcome,
} from "@shared/lib/scheduledEventLogic";
import type { ScheduledEventHandler } from "@shared/lib/scheduledEventHandlers/index";

/** Summary feedback payload returned at the end of every event processing loop. */
export interface ProcessDueEventsSummary {
  /** Total number of events successfully locked in this tick. */
  processed: number;
  /** Total number of locked events that completed without throwing. */
  completed: number;
  /** Total number of locked events that failed (including retries). */
  failed: number;
  /** Number of events skipped (e.g. during a dry-run check). */
  skipped: number;
  /** Individual status summary for each event evaluated during the tick. */
  results: Array<{
    eventId: string;
    eventType: string;
    status: string;
    error?: string;
  }>;
}

/**
 * Domain engine for background scheduled tasks.
 */
export class SchedulerDomain {
  private static handlers = new Map<string, ScheduledEventHandler>();

  /**
   * Register a background task handler for a given event type.
   *
   * @param eventType - Target scheduled event type slug.
   * @param handler - Function containing background task logic.
   */
  public static registerHandler(eventType: string, handler: ScheduledEventHandler): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * Clear all registered handlers. Useful for testing environments.
   */
  public static clearHandlers(): void {
    this.handlers.clear();
  }

  /**
   * Enqueue a new scheduled event or reschedule an existing one by its idempotency key.
   *
   * When an idempotency key is supplied, any existing record with that key will have
   * its payload, event type, and target run time updated, resetting status back to pending.
   *
   * @param input - Enqueuing parameters.
   * @returns Persisted scheduled event document.
   */
  public static async scheduleEvent(input: {
    eventType: string;
    dueAt: Date;
    payload: Record<string, any>;
    idempotencyKey?: string;
    maxAttempts?: number;
  }): Promise<ISystemScheduledEvent> {
    await connectDB();
    const maxAttempts = input.maxAttempts ?? 3;

    if (input.idempotencyKey) {
      const doc = await SystemScheduledEvent.findOneAndUpdate(
        { idempotencyKey: input.idempotencyKey },
        {
          $set: {
            eventType: input.eventType,
            dueAt: input.dueAt,
            payload: input.payload,
            status: "pending",
            attempts: 0,
            maxAttempts,
            lockedUntil: null,
            lastError: undefined,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      return doc;
    }

    const doc = await SystemScheduledEvent.create({
      eventType: input.eventType,
      dueAt: input.dueAt,
      payload: input.payload,
      maxAttempts,
    });
    return doc;
  }

  /**
   * Cancel a scheduled event using its idempotency key.
   *
   * Only events that are currently pending or failed can be cancelled.
   *
   * @param idempotencyKey - Unique key supplied when scheduling the event.
   * @returns True when an event was successfully found and cancelled.
   */
  public static async cancelEvent(idempotencyKey: string): Promise<boolean> {
    await connectDB();
    const result = await SystemScheduledEvent.updateOne(
      { idempotencyKey, status: { $in: ["pending", "failed"] } },
      { $set: { status: "cancelled" } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Claim and execute due scheduled events.
   *
   * Queries pending events due at/before the tick timestamp (or processing events whose
   * lock lease has expired). Atomically locks a chunk of candidate events to prevent
   * concurrency issues, dispatches them to their registered handlers, and persists the outcomes.
   *
   * @param options - Execution filters and batch limit constraints.
   * @returns Diagnostic processing summary.
   */
  public static async processDueEvents(
    options: {
      limit?: number;
      dryRun?: boolean;
      eventTypes?: string[];
      now?: Date;
    } = {}
  ): Promise<ProcessDueEventsSummary> {
    await connectDB();
    const queryNow = options.now || new Date();
    const limit = options.limit ?? 50;
    const dryRun = options.dryRun ?? false;

    const query: Record<string, any> = {
      $or: [
        { status: "pending", dueAt: { $lte: queryNow } },
        { status: "processing", lockedUntil: { $lte: queryNow } },
      ],
    };

    if (options.eventTypes && options.eventTypes.length > 0) {
      query.eventType = { $in: options.eventTypes };
    }

    const candidates = await SystemScheduledEvent.find(query)
      .sort({ dueAt: 1 })
      .limit(limit)
      .lean();

    const summary: ProcessDueEventsSummary = {
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };

    if (dryRun) {
      summary.processed = candidates.length;
      summary.skipped = candidates.length;
      summary.results = candidates.map((ev) => ({
        eventId: String(ev._id),
        eventType: ev.eventType,
        status: "dry-run-skipped",
      }));
      return summary;
    }

    const lockDurationMs = 5 * 60 * 1000; // 5 minute lock lease

    for (const candidate of candidates) {
      const claimUpdate = buildClaimUpdate(queryNow, lockDurationMs);
      const claimedEvent = await SystemScheduledEvent.findOneAndUpdate(
        {
          _id: candidate._id,
          $or: [
            { status: "pending", dueAt: { $lte: queryNow } },
            { status: "processing", lockedUntil: { $lte: queryNow } },
          ],
        },
        claimUpdate,
        { new: true }
      );

      if (!claimedEvent) {
        continue;
      }

      summary.processed++;
      const handler = this.handlers.get(claimedEvent.eventType);

      let success = false;
      let lastErrorMsg = "";

      if (!handler) {
        lastErrorMsg = `No handler registered for eventType "${claimedEvent.eventType}"`;
      } else {
        try {
          await handler(claimedEvent.payload, claimedEvent);
          success = true;
        } catch (err: any) {
          lastErrorMsg = err instanceof Error ? err.message : String(err);
        }
      }

      const outcome = resolveProcessOutcome(
        success,
        claimedEvent.attempts,
        claimedEvent.maxAttempts,
        queryNow
      );

      await SystemScheduledEvent.updateOne(
        { _id: claimedEvent._id },
        {
          $set: {
            status: outcome.status,
            lockedUntil: null,
            ...(outcome.dueAt && { dueAt: outcome.dueAt }),
            ...(outcome.completedAt && { completedAt: outcome.completedAt }),
            ...(lastErrorMsg && { lastError: lastErrorMsg }),
          },
        }
      );

      if (outcome.status === "completed") {
        summary.completed++;
      } else {
        summary.failed++;
      }

      summary.results.push({
        eventId: String(claimedEvent._id),
        eventType: claimedEvent.eventType,
        status: outcome.status,
        ...(lastErrorMsg && { error: lastErrorMsg }),
      });
    }

    return summary;
  }
}
