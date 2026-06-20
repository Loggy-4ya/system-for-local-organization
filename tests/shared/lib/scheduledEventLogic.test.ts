/**
 * @fileoverview Unit tests for scheduled event transition and backoff logic.
 *
 * Run: npm run test:scheduled-events
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeRetryDueAt,
  canClaimEvent,
  buildClaimUpdate,
  resolveProcessOutcome,
} from "@shared/lib/scheduledEventLogic";

describe("computeRetryDueAt", () => {
  it("calculates exponential backoff based on attempts", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");
    const nowMs = now.getTime();

    // Attempt 1: 60s * 2^0 = 1 minute
    const attempt1 = computeRetryDueAt(1, now);
    assert.equal(attempt1.getTime(), nowMs + 60 * 1000);

    // Attempt 2: 60s * 2^1 = 2 minutes
    const attempt2 = computeRetryDueAt(2, now);
    assert.equal(attempt2.getTime(), nowMs + 120 * 1000);

    // Attempt 3: 60s * 2^2 = 4 minutes
    const attempt3 = computeRetryDueAt(3, now);
    assert.equal(attempt3.getTime(), nowMs + 240 * 1000);
  });
});

describe("canClaimEvent", () => {
  it("claims pending events when dueAt is past or now", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");

    const pastEvent = {
      status: "pending" as const,
      dueAt: new Date("2026-06-19T11:59:59.000Z"),
      lockedUntil: null,
    };
    assert.equal(canClaimEvent(pastEvent, now), true);

    const futureEvent = {
      status: "pending" as const,
      dueAt: new Date("2026-06-19T12:01:00.000Z"),
      lockedUntil: null,
    };
    assert.equal(canClaimEvent(futureEvent, now), false);
  });

  it("claims processing events only when lock has expired", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");

    const lockedEvent = {
      status: "processing" as const,
      dueAt: new Date("2026-06-19T11:50:00.000Z"),
      lockedUntil: new Date("2026-06-19T12:05:00.000Z"),
    };
    assert.equal(canClaimEvent(lockedEvent, now), false);

    const expiredLockEvent = {
      status: "processing" as const,
      dueAt: new Date("2026-06-19T11:50:00.000Z"),
      lockedUntil: new Date("2026-06-19T11:59:00.000Z"),
    };
    assert.equal(canClaimEvent(expiredLockEvent, now), true);
  });

  it("ignores other non-pending non-processing status states", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");

    const completedEvent = {
      status: "completed" as const,
      dueAt: new Date("2026-06-19T11:50:00.000Z"),
      lockedUntil: null,
    };
    assert.equal(canClaimEvent(completedEvent, now), false);
  });
});

describe("buildClaimUpdate", () => {
  it("builds a correct Mongoose atomic claim payload", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");
    const lockDurationMs = 5 * 60 * 1000; // 5 min

    const update = buildClaimUpdate(now, lockDurationMs);
    assert.deepEqual(update, {
      $set: {
        status: "processing",
        lockedUntil: new Date(now.getTime() + lockDurationMs),
      },
      $inc: {
        attempts: 1,
      },
    });
  });
});

describe("resolveProcessOutcome", () => {
  it("completes event successfully", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");
    const outcome = resolveProcessOutcome(true, 1, 3, now);

    assert.equal(outcome.status, "completed");
    assert.equal(outcome.completedAt?.getTime(), now.getTime());
    assert.equal(outcome.dueAt, undefined);
  });

  it("re-enqueues for retry if under maxAttempts on failure", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");
    // Attempt 1 of 3 (failed) -> retry
    const outcome = resolveProcessOutcome(false, 1, 3, now);

    assert.equal(outcome.status, "pending");
    assert.equal(outcome.completedAt, undefined);
    assert.equal(outcome.dueAt?.getTime(), now.getTime() + 60 * 1000); // Attempt 1 backoff is 60s
  });

  it("marks as failed if attempts reach or exceed maxAttempts on failure", () => {
    const now = new Date("2026-06-19T12:00:00.000Z");
    // Attempt 3 of 3 (failed) -> fail
    const outcome = resolveProcessOutcome(false, 3, 3, now);

    assert.equal(outcome.status, "failed");
    assert.equal(outcome.completedAt, undefined);
    assert.equal(outcome.dueAt, undefined);
  });
});
