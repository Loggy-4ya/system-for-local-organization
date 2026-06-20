/**
 * @fileoverview Pure utility functions for scheduled event state transitions, backoff math, and locking.
 *
 * This module contains no database side-effects and is fully unit-tested under `tests/`.
 *
 * @module shared/lib/scheduledEventLogic
 */

import type { ScheduledEventStatus } from "@shared/models/SystemScheduledEvent";

/** Simplified shape of an event document required for claim-eligibility checks. */
export interface MinimallyClaimableEvent {
  status: ScheduledEventStatus;
  dueAt: Date;
  lockedUntil: Date | null;
}

/** Output state from resolving the outcome of a processed event. */
export interface ProcessOutcome {
  /** Next lifecycle state the event should transition to. */
  status: ScheduledEventStatus;
  /** Adjusted execution timestamp for retry, if applicable. */
  dueAt?: Date;
  /** Completion timestamp, if completed successfully. */
  completedAt?: Date;
}

/**
 * Compute the next retry timestamp using exponential backoff.
 *
 * Delay follows 60s * 2^(attempts - 1), capping at maximum attempts.
 *
 * @param attempts - Number of executions attempted so far (should be >= 1).
 * @param now - Reference timestamp.
 * @returns Date when the event should run again.
 */
export function computeRetryDueAt(attempts: number, now: Date): Date {
  const baseDelayMs = 60 * 1000; // 1 minute base
  const multiplier = Math.pow(2, Math.max(0, attempts - 1));
  const delayMs = baseDelayMs * multiplier;
  return new Date(now.getTime() + delayMs);
}

/**
 * Check if a scheduled event is eligible to be claimed for processing.
 *
 * An event is claimable if:
 * - Its status is "pending" and its due time is in the past, or
 * - Its status is "processing" but its lock lease has expired (stalled container crashed).
 *
 * @param event - Candidate event descriptor.
 * @param now - Reference timestamp.
 * @returns True when the event should be processed.
 */
export function canClaimEvent(event: MinimallyClaimableEvent, now: Date): boolean {
  const nowMs = now.getTime();
  if (event.status === "pending" && event.dueAt.getTime() <= nowMs) {
    return true;
  }
  if (
    event.status === "processing" &&
    event.lockedUntil !== null &&
    event.lockedUntil.getTime() <= nowMs
  ) {
    return true;
  }
  return false;
}

/**
 * Build the atomic Mongoose update payload for claiming an event.
 *
 * Increments attempts and transitions status to processing with a lease lock.
 *
 * @param now - Reference timestamp.
 * @param lockDurationMs - Lock lease duration in milliseconds.
 * @returns Mongoose update document.
 */
export function buildClaimUpdate(now: Date, lockDurationMs: number): Record<string, any> {
  return {
    $set: {
      status: "processing" as ScheduledEventStatus,
      lockedUntil: new Date(now.getTime() + lockDurationMs),
    },
    $inc: {
      attempts: 1,
    },
  };
}

/**
 * Resolve the final status and metadata transition for a completed or failed execution.
 *
 * Handles retries with backoff if attempts are under maxAttempts.
 *
 * @param success - Whether the event handler completed successfully.
 * @param attempts - Total execution attempts (including the current one).
 * @param maxAttempts - Cap on allowed retries.
 * @param now - Reference timestamp.
 * @returns Lifecycle state mutations.
 */
export function resolveProcessOutcome(
  success: boolean,
  attempts: number,
  maxAttempts: number,
  now: Date,
): ProcessOutcome {
  if (success) {
    return {
      status: "completed",
      completedAt: now,
    };
  }

  if (attempts < maxAttempts) {
    return {
      status: "pending",
      dueAt: computeRetryDueAt(attempts, now),
    };
  }

  return {
    status: "failed",
  };
}
