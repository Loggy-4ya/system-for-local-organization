/**
 * @fileoverview Unit tests for flexible task reminder scheduling helpers.
 *
 * Run: `npm run test:task-reminder-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskReminderLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeBeforeDueReminderAt,
  computeEveryReminderAt,
  computeNextTaskReminderAt,
  formatTaskReminderSchedule,
  formatTaskReminderWeekdays,
  normalizeTaskReminderSettings,
  normalizeTaskReminderWeekdays,
  taskReminderUnitToMs,
  validateTaskReminderSettings,
} from "@shared/lib/taskReminderLogic";

describe("taskReminderLogic", () => {
  it("migrates legacy intervalHours to hours/every mode", () => {
    const normalized = normalizeTaskReminderSettings({
      enabled: true,
      intervalHours: 6,
      channels: ["web"],
    });
    assert.equal(normalized.mode, "every");
    assert.equal(normalized.value, 6);
    assert.equal(normalized.unit, "hours");
  });

  it("converts units to milliseconds", () => {
    assert.equal(taskReminderUnitToMs(30, "minutes"), 30 * 60 * 1000);
    assert.equal(taskReminderUnitToMs(2, "days"), 2 * 24 * 60 * 60 * 1000);
  });

  it("schedules repeating reminders after a reference instant", () => {
    const after = new Date("2026-06-01T12:00:00Z");
    const next = computeEveryReminderAt(
      {
        enabled: true,
        mode: "every",
        value: 2,
        unit: "hours",
        channels: ["web"],
        repeatUntilDue: false,
        atTime: null,
      },
      after,
    );
    assert.equal(next?.toISOString(), "2026-06-01T14:00:00.000Z");
  });

  it("schedules a single reminder before the deadline", () => {
    const dueAt = new Date("2026-06-10T18:00:00Z");
    const after = new Date("2026-06-01T12:00:00Z");
    const next = computeBeforeDueReminderAt(
      {
        enabled: true,
        mode: "before_due",
        value: 2,
        unit: "days",
        channels: ["web"],
        repeatUntilDue: false,
        atTime: null,
      },
      dueAt,
      after,
    );
    assert.equal(next?.toISOString(), "2026-06-08T18:00:00.000Z");
  });

  it("requires due date for before_due mode validation", () => {
    const settings = normalizeTaskReminderSettings({
      enabled: true,
      mode: "before_due",
      value: 1,
      unit: "days",
      channels: ["web"],
    });
    assert.equal(validateTaskReminderSettings(settings, null), "Deadline-relative reminders require a due date.");
  });

  it("schedules on_dates mode from explicit instants", () => {
    const settings = normalizeTaskReminderSettings({
      enabled: true,
      mode: "on_dates",
      value: 1,
      unit: "hours",
      channels: ["web"],
      scheduledDates: ["2026-12-01T09:00:00.000Z", "2026-06-01T09:00:00.000Z"],
    });
    const after = new Date("2026-01-01T00:00:00Z");
    const next = computeNextTaskReminderAt(settings, { afterDate: after, taskDueAt: null });
    assert.equal(next?.toISOString(), "2026-06-01T09:00:00.000Z");
  });

  it("rolls on_dates yearly when repeatYearlyOnDates is enabled", () => {
    const settings = normalizeTaskReminderSettings({
      enabled: true,
      mode: "on_dates",
      value: 1,
      unit: "hours",
      channels: ["web"],
      scheduledDates: ["2026-01-10T09:00:00.000Z"],
      repeatYearlyOnDates: true,
    });
    const after = new Date("2026-12-31T00:00:00Z");
    const next = computeNextTaskReminderAt(settings, { afterDate: after, taskDueAt: null });
    assert.ok(next);
    assert.equal(next!.getFullYear(), 2027);
    assert.equal(next!.getMonth(), 0);
    assert.equal(next!.getDate(), 10);
  });

  it("schedules ongoing mode like repeating intervals without due date", () => {
    const after = new Date("2026-06-01T12:00:00Z");
    const settings = normalizeTaskReminderSettings({
      enabled: true,
      mode: "ongoing",
      value: 1,
      unit: "weeks",
      channels: ["web"],
      atTime: "09:00",
    });
    const next = computeNextTaskReminderAt(settings, { afterDate: after, taskDueAt: null });
    assert.ok(next);
    assert.ok(next!.getTime() > after.getTime());
    assert.match(formatTaskReminderSchedule(settings, null), /Throughout project/);
  });

  it("formats readable schedule summaries", () => {
    const text = formatTaskReminderSchedule({
      enabled: true,
      mode: "every",
      value: 45,
      unit: "minutes",
      channels: ["web", "telegram"],
    });
    assert.match(text, /45 minutes/i);
    assert.match(text, /web, telegram/);
  });

  it("returns null when before_due reminders are exhausted", () => {
    const dueAt = new Date("2026-06-10T18:00:00Z");
    const after = new Date("2026-06-09T18:00:00Z");
    const next = computeNextTaskReminderAt(
      {
        enabled: true,
        mode: "before_due",
        value: 2,
        unit: "days",
        channels: ["web"],
        repeatUntilDue: false,
      },
      { taskDueAt: dueAt, afterDate: after },
    );
    assert.equal(next, null);
  });

  it("normalizes weekday indices for week-based schedules", () => {
    assert.deepEqual(normalizeTaskReminderWeekdays([3, 1, 1, 9]), [1, 3]);
    assert.deepEqual(normalizeTaskReminderWeekdays([]), []);
    assert.deepEqual(normalizeTaskReminderWeekdays(undefined), [1]);
  });

  it("formats weekday labels in Mon-first order", () => {
    assert.equal(formatTaskReminderWeekdays([5, 1, 3]), "Mon, Wed, Fri");
  });

  it("schedules the earliest selected weekday at the configured time", () => {
    // 2026-06-01 is a Monday; after Monday noon → next is Wednesday same week at 09:00 local
    const after = new Date("2026-06-01T12:00:00");
    const next = computeEveryReminderAt(
      {
        enabled: true,
        mode: "every",
        value: 1,
        unit: "weeks",
        channels: ["web"],
        repeatUntilDue: false,
        atTime: "09:00",
        weekdays: [1, 3],
      },
      after,
    );
    assert.ok(next);
    assert.equal(next!.getDay(), 3);
    assert.equal(next!.getHours(), 9);
    assert.equal(next!.getMinutes(), 0);
  });

  it("respects multi-week cadence on the same weekday", () => {
    const after = new Date("2026-06-01T12:00:00");
    const first = computeEveryReminderAt(
      {
        enabled: true,
        mode: "every",
        value: 2,
        unit: "weeks",
        channels: ["web"],
        repeatUntilDue: false,
        atTime: "09:00",
        weekdays: [1],
      },
      after,
    );
    assert.ok(first);
    assert.equal(first!.getDay(), 1);

    const second = computeEveryReminderAt(
      {
        enabled: true,
        mode: "every",
        value: 2,
        unit: "weeks",
        channels: ["web"],
        repeatUntilDue: false,
        atTime: "09:00",
        weekdays: [1],
      },
      first!,
    );
    assert.ok(second);
    const diffDays = Math.round((second!.getTime() - first!.getTime()) / (24 * 60 * 60 * 1000));
    assert.equal(diffDays, 14);
  });

  it("requires at least one weekday when unit is weeks", () => {
    const settings = {
      enabled: true,
      mode: "every" as const,
      value: 1,
      unit: "weeks" as const,
      channels: ["web"] as const,
      atTime: "09:00",
      weekdays: [] as number[],
    };
    assert.equal(
      validateTaskReminderSettings(settings, null),
      "Select at least one weekday for week-based reminders.",
    );
  });
});
