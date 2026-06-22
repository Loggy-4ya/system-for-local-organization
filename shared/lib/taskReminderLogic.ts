/**
 * @fileoverview Pure helpers for flexible task reminder scheduling.
 *
 * Supports repeating intervals (minutes → weeks), deadline-relative reminders,
 * optional clock-time anchors for day/week cadences, and legacy `intervalHours`.
 *
 * @module shared/lib/taskReminderLogic
 *
 * Tests: `npm run test:task-reminder-logic`
 * Registry: `.ai/docs/testing.md`
 */

import {
  DEFAULT_TASK_REMINDER_SETTINGS,
  DEFAULT_TASK_REMINDER_WEEKDAYS,
  MAX_TASK_REMINDER_SCHEDULED_DATES,
  TASK_REMINDER_MODE_LABELS,
  TASK_REMINDER_WEEKDAY_LABELS,
  TASK_REMINDER_UNIT_LABELS,
  TASK_REMINDER_UNIT_LIMITS,
  type TaskReminderChannel,
  type TaskReminderMode,
  type TaskReminderUnit,
  type TaskReminderWeekday,
} from "@shared/constants/taskSettings";
import type { ITaskReminderSettings } from "@shared/models/Task";

/** Legacy reminder shape still present on older MongoDB documents. */
export interface LegacyTaskReminderSettings extends Partial<ITaskReminderSettings> {
  /** Deprecated hours-only interval. */
  intervalHours?: number;
}

/** Inputs for computing the next reminder instant. */
export interface TaskReminderScheduleContext {
  /** Task deadline — required for `before_due` mode. */
  taskDueAt?: Date | string | null;
  /** Schedule relative to this instant (defaults to now). */
  afterDate?: Date;
}

/** Milliseconds in one minute. */
const MS_PER_MINUTE = 60 * 1000;

/** Milliseconds in one hour. */
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Milliseconds in one day. */
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Milliseconds in one week. */
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Convert a reminder unit amount to milliseconds.
 *
 * @param value - Positive interval amount.
 * @param unit - Time unit.
 * @returns Duration in milliseconds.
 */
export function taskReminderUnitToMs(value: number, unit: TaskReminderUnit): number {
  switch (unit) {
    case "minutes":
      return value * MS_PER_MINUTE;
    case "hours":
      return value * MS_PER_HOUR;
    case "days":
      return value * MS_PER_DAY;
    case "weeks":
      return value * MS_PER_WEEK;
    default:
      return value * MS_PER_HOUR;
  }
}

/**
 * Clamp a reminder `value` to the allowed range for its unit.
 *
 * @param value - Raw amount from API or UI.
 * @param unit - Selected time unit.
 * @returns Clamped integer within institutional limits.
 */
export function clampTaskReminderValue(value: number, unit: TaskReminderUnit): number {
  const limits = TASK_REMINDER_UNIT_LIMITS[unit];
  const rounded = Math.floor(Number(value));
  if (!Number.isFinite(rounded)) return limits.min;
  return Math.min(limits.max, Math.max(limits.min, rounded));
}

/**
 * Parse an optional `HH:mm` clock anchor.
 *
 * @param atTime - Clock string or null.
 * @returns Hours and minutes, or null when invalid/absent.
 */
export function parseTaskReminderAtTime(atTime: string | null | undefined): { hours: number; minutes: number } | null {
  if (!atTime?.trim()) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(atTime.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Apply a local clock time to a calendar date.
 *
 * @param date - Base calendar date.
 * @param atTime - `HH:mm` local time string.
 * @returns New date at the requested clock time.
 */
export function applyTaskReminderAtTime(date: Date, atTime: string): Date {
  const parsed = parseTaskReminderAtTime(atTime);
  const result = new Date(date);
  if (!parsed) return result;
  result.setHours(parsed.hours, parsed.minutes, 0, 0);
  return result;
}

/**
 * Add reminder units to a date (calendar-aware for days/weeks).
 *
 * @param date - Starting instant.
 * @param value - Amount to add.
 * @param unit - Time unit.
 * @returns Shifted date.
 */
export function addTaskReminderUnits(date: Date, value: number, unit: TaskReminderUnit): Date {
  const result = new Date(date);
  switch (unit) {
    case "minutes":
      result.setMinutes(result.getMinutes() + value);
      break;
    case "hours":
      result.setHours(result.getHours() + value);
      break;
    case "days":
      result.setDate(result.getDate() + value);
      break;
    case "weeks":
      result.setDate(result.getDate() + value * 7);
      break;
    default:
      result.setHours(result.getHours() + value);
  }
  return result;
}

/**
 * Normalize persisted/API reminder settings, migrating legacy `intervalHours`.
 *
 * @param raw - Stored or incoming reminder settings.
 * @returns Canonical reminder settings object.
 */
export function normalizeTaskReminderSettings(
  raw: LegacyTaskReminderSettings | null | undefined,
): ITaskReminderSettings {
  if (!raw) {
    return { ...DEFAULT_TASK_REMINDER_SETTINGS, channels: [...DEFAULT_TASK_REMINDER_SETTINGS.channels] };
  }

  const unit = (raw.unit ?? "hours") as TaskReminderUnit;
  const value = clampTaskReminderValue(
    raw.value ?? raw.intervalHours ?? DEFAULT_TASK_REMINDER_SETTINGS.value,
    unit,
  );

  return {
    enabled: Boolean(raw.enabled),
    mode: (raw.mode ?? "every") as TaskReminderMode,
    value,
    unit,
    channels: (raw.channels?.length ? raw.channels : ["web"]) as TaskReminderChannel[],
    repeatUntilDue: Boolean(raw.repeatUntilDue),
    atTime: raw.atTime ?? null,
    weekdays: unit === "weeks" ? normalizeTaskReminderWeekdays(raw.weekdays) : [],
    scheduledDates: normalizeScheduledDateStrings(raw.scheduledDates),
    repeatYearlyOnDates: Boolean(raw.repeatYearlyOnDates),
  };
}

/**
 * Parse, dedupe, and sort weekday indices for week-based schedules.
 *
 * @param raw - Weekday indices from API or MongoDB.
 * @param fallback - Used when input is empty or invalid.
 * @returns Unique ascending weekday indices (0–6).
 */
export function normalizeTaskReminderWeekdays(
  raw: number[] | null | undefined,
  fallback: readonly TaskReminderWeekday[] = DEFAULT_TASK_REMINDER_WEEKDAYS,
): number[] {
  if (raw == null) return [...fallback];
  if (raw.length === 0) return [];

  const valid = raw.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) as TaskReminderWeekday[];
  const unique = [...new Set(valid)].sort((a, b) => a - b);
  return unique.length ? unique : [...fallback];
}

/**
 * Human-readable weekday list for schedule summaries.
 *
 * @param weekdays - Normalized weekday indices.
 * @returns Comma-separated short labels (Mon-first order).
 */
export function formatTaskReminderWeekdays(weekdays: number[] | null | undefined): string {
  const normalized = normalizeTaskReminderWeekdays(weekdays, []);
  if (normalized.length === 0) return "";

  const order = [1, 2, 3, 4, 5, 6, 0] as const;
  const sorted = order.filter((day) => normalized.includes(day));
  return sorted.map((day) => TASK_REMINDER_WEEKDAY_LABELS[day]).join(", ");
}

/**
 * Find the latest weekday occurrence at a clock time on or before a reference instant.
 *
 * @param weekday - JavaScript weekday index.
 * @param atTime - Local `HH:mm` anchor.
 * @param onOrBefore - Upper bound inclusive.
 * @returns Previous matching instant or null.
 */
function findPreviousWeekdayOccurrence(
  weekday: number,
  atTime: string,
  onOrBefore: Date,
): Date | null {
  const cursor = new Date(onOrBefore);
  for (let offset = 0; offset <= 370; offset++) {
    const day = new Date(cursor);
    day.setDate(day.getDate() - offset);
    if (day.getDay() !== weekday) continue;
    const candidate = applyTaskReminderAtTime(day, atTime);
    if (candidate.getTime() <= onOrBefore.getTime()) return candidate;
  }
  return null;
}

/**
 * Find the earliest weekday occurrence at a clock time strictly after a reference instant.
 *
 * @param weekday - JavaScript weekday index.
 * @param atTime - Local `HH:mm` anchor.
 * @param afterDate - Lower bound exclusive.
 * @returns Next matching instant or null.
 */
function findNextWeekdayOccurrence(
  weekday: number,
  atTime: string,
  afterDate: Date,
): Date | null {
  const cursor = new Date(afterDate);
  cursor.setMilliseconds(cursor.getMilliseconds() + 1);
  for (let offset = 0; offset <= 370; offset++) {
    const day = new Date(cursor);
    day.setDate(day.getDate() + offset);
    if (day.getDay() !== weekday) continue;
    const candidate = applyTaskReminderAtTime(day, atTime);
    if (candidate.getTime() > afterDate.getTime()) return candidate;
  }
  return null;
}

/**
 * Resolve the next reminder on one weekday with an N-week cadence.
 *
 * @param weekday - JavaScript weekday index.
 * @param atTime - Local `HH:mm` anchor.
 * @param afterDate - Do not schedule on or before this instant.
 * @param intervalWeeks - Weeks between occurrences on this weekday.
 * @returns Next fire instant or null.
 */
function computeWeekdayReminderAt(
  weekday: number,
  atTime: string,
  afterDate: Date,
  intervalWeeks: number,
): Date | null {
  if (intervalWeeks <= 1) {
    return findNextWeekdayOccurrence(weekday, atTime, afterDate);
  }

  const previous = findPreviousWeekdayOccurrence(weekday, atTime, afterDate);
  if (!previous) {
    return findNextWeekdayOccurrence(weekday, atTime, afterDate);
  }

  let next = addTaskReminderUnits(previous, intervalWeeks, "weeks");
  next = applyTaskReminderAtTime(next, atTime);
  while (next.getTime() <= afterDate.getTime()) {
    next = addTaskReminderUnits(next, intervalWeeks, "weeks");
    next = applyTaskReminderAtTime(next, atTime);
  }

  return next;
}

/**
 * Compute the next week-based reminder across selected weekdays.
 *
 * @param settings - Normalized reminder settings with `unit: weeks`.
 * @param afterDate - Do not schedule on or before this instant.
 * @returns Earliest next weekday fire instant.
 */
function computeWeeksReminderAt(
  settings: ITaskReminderSettings,
  afterDate: Date,
): Date | null {
  const weekdays = normalizeTaskReminderWeekdays(settings.weekdays);
  const atTime = settings.atTime ?? "09:00";

  let best: Date | null = null;
  for (const weekday of weekdays) {
    const candidate = computeWeekdayReminderAt(weekday, atTime, afterDate, settings.value);
    if (!candidate) continue;
    if (!best || candidate.getTime() < best.getTime()) {
      best = candidate;
    }
  }

  return best;
}

/**
 * Parse, dedupe, sort, and cap explicit reminder instants.
 *
 * @param raw - ISO date strings from API or MongoDB.
 * @returns Canonical ascending ISO strings.
 */
export function normalizeScheduledDateStrings(
  raw: Array<string | Date> | null | undefined,
): string[] {
  if (!raw?.length) return [];

  const seen = new Set<number>();
  const parsed: Date[] = [];

  for (const value of raw) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.getTime();
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(date);
  }

  parsed.sort((a, b) => a.getTime() - b.getTime());
  return parsed.slice(0, MAX_TASK_REMINDER_SCHEDULED_DATES).map((date) => date.toISOString());
}

/**
 * Add one calendar year while preserving local month/day/time.
 *
 * @param date - Source instant.
 * @returns Same local slot next year.
 */
export function addCalendarYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Resolve the next occurrence of one anchored instant after a reference time.
 *
 * @param anchor - Stored reminder instant.
 * @param afterDate - Do not return on or before this instant.
 * @param repeatYearly - When true, roll forward yearly when anchor has passed.
 * @returns Next fire instant or null.
 */
export function nextOccurrenceAfter(
  anchor: Date,
  afterDate: Date,
  repeatYearly: boolean,
): Date | null {
  if (anchor.getTime() > afterDate.getTime()) return anchor;
  if (!repeatYearly) return null;

  let cursor = new Date(anchor);
  for (let i = 0; i < 100; i++) {
    cursor = addCalendarYears(cursor, 1);
    if (cursor.getTime() > afterDate.getTime()) return cursor;
  }

  return null;
}

/**
 * Compute the next explicit-date reminder instant.
 *
 * @param settings - Normalized reminder settings in `on_dates` mode.
 * @param afterDate - Do not schedule on or before this instant.
 * @returns Next reminder date, or null when none remain.
 */
export function computeOnDatesReminderAt(
  settings: ITaskReminderSettings,
  afterDate: Date,
): Date | null {
  const anchors = normalizeScheduledDateStrings(settings.scheduledDates).map((iso) => new Date(iso));
  if (anchors.length === 0) return null;

  let next: Date | null = null;
  const repeatYearly = Boolean(settings.repeatYearlyOnDates);

  for (const anchor of anchors) {
    const candidate = nextOccurrenceAfter(anchor, afterDate, repeatYearly);
    if (!candidate) continue;
    if (!next || candidate.getTime() < next.getTime()) {
      next = candidate;
    }
  }

  return next;
}

/**
 * Parse a due-at timestamp for reminder math.
 *
 * @param value - Raw due date.
 * @returns Parsed date or null.
 */
function normalizeDueAt(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Compute the next repeating reminder after a reference instant.
 *
 * @param settings - Normalized reminder settings in `every` mode.
 * @param afterDate - Do not schedule on or before this instant.
 * @returns Next reminder date, or null when none can be computed.
 */
export function computeEveryReminderAt(
  settings: ITaskReminderSettings,
  afterDate: Date,
): Date | null {
  const parsedAtTime =
    settings.unit === "days" || settings.unit === "weeks"
      ? parseTaskReminderAtTime(settings.atTime)
      : null;

  if (settings.unit === "weeks" && parsedAtTime && settings.atTime) {
    return computeWeeksReminderAt(settings, afterDate);
  }

  if (parsedAtTime && settings.atTime) {
    let cursor = applyTaskReminderAtTime(new Date(afterDate), settings.atTime);
    if (cursor.getTime() <= afterDate.getTime()) {
      cursor = addTaskReminderUnits(cursor, 1, settings.unit === "weeks" ? "weeks" : "days");
      cursor = applyTaskReminderAtTime(cursor, settings.atTime);
    }

    while (cursor.getTime() <= afterDate.getTime()) {
      cursor = addTaskReminderUnits(cursor, settings.value, settings.unit);
      if (settings.atTime) {
        cursor = applyTaskReminderAtTime(cursor, settings.atTime);
      }
    }

    return cursor;
  }

  return new Date(afterDate.getTime() + taskReminderUnitToMs(settings.value, settings.unit));
}

/**
 * Compute the next deadline-relative reminder instant.
 *
 * @param settings - Normalized reminder settings in `before_due` mode.
 * @param taskDueAt - Task deadline.
 * @param afterDate - Do not schedule on or before this instant.
 * @returns Next reminder date, or null when none remain.
 */
export function computeBeforeDueReminderAt(
  settings: ITaskReminderSettings,
  taskDueAt: Date,
  afterDate: Date,
): Date | null {
  const offsetMs = taskReminderUnitToMs(settings.value, settings.unit);
  const firstReminderAt = new Date(taskDueAt.getTime() - offsetMs);

  if (!settings.repeatUntilDue) {
    return firstReminderAt.getTime() > afterDate.getTime() ? firstReminderAt : null;
  }

  if (firstReminderAt.getTime() > afterDate.getTime()) {
    return firstReminderAt;
  }

  let cursor = firstReminderAt;
  while (cursor.getTime() <= afterDate.getTime()) {
    cursor = new Date(cursor.getTime() + offsetMs);
    if (cursor.getTime() >= taskDueAt.getTime()) {
      return null;
    }
  }

  return cursor.getTime() < taskDueAt.getTime() ? cursor : null;
}

/**
 * Resolve the next scheduler fire date for a task reminder.
 *
 * @param rawSettings - Stored reminder settings (legacy-safe).
 * @param context - Due date and reference instant.
 * @returns Next reminder timestamp, or null when reminders should be cancelled.
 */
export function computeNextTaskReminderAt(
  rawSettings: LegacyTaskReminderSettings | null | undefined,
  context: TaskReminderScheduleContext = {},
): Date | null {
  const settings = normalizeTaskReminderSettings(rawSettings);
  if (!settings.enabled) return null;

  const afterDate = context.afterDate ?? new Date();
  const taskDueAt = normalizeDueAt(context.taskDueAt);

  if (settings.mode === "before_due") {
    if (!taskDueAt) return null;
    if (taskDueAt.getTime() <= afterDate.getTime()) return null;
    return computeBeforeDueReminderAt(settings, taskDueAt, afterDate);
  }

  if (settings.mode === "on_dates") {
    return computeOnDatesReminderAt(settings, afterDate);
  }

  // `every` and `ongoing` share interval scheduling until externally cancelled.
  return computeEveryReminderAt(settings, afterDate);
}

/**
 * Build a human-readable summary for task detail surfaces.
 *
 * @param rawSettings - Stored reminder settings.
 * @param taskDueAt - Optional due date for deadline-relative copy.
 * @returns Short schedule description.
 */
export function formatTaskReminderSchedule(
  rawSettings: LegacyTaskReminderSettings | null | undefined,
  taskDueAt?: Date | string | null,
): string {
  const settings = normalizeTaskReminderSettings(rawSettings);
  if (!settings.enabled) return "Reminders off";

  const unitLabel = TASK_REMINDER_UNIT_LABELS[settings.unit].toLowerCase();
  const valueLabel = `${settings.value} ${settings.value === 1 ? unitLabel.replace(/s$/, "") : unitLabel}`;
  const channels = settings.channels.join(", ");
  const atTimeSuffix =
    settings.atTime && (settings.unit === "days" || settings.unit === "weeks")
      ? ` at ${settings.atTime}`
      : "";
  const weekdaySuffix =
    settings.unit === "weeks"
      ? (() => {
          const label = formatTaskReminderWeekdays(settings.weekdays);
          return label ? ` on ${label}` : "";
        })()
      : "";

  if (settings.mode === "before_due") {
    const due = normalizeDueAt(taskDueAt);
    const dueSuffix = due ? ` (due ${due.toLocaleString()})` : "";
    if (settings.repeatUntilDue) {
      return `Every ${valueLabel} until deadline${weekdaySuffix}${atTimeSuffix}${dueSuffix} via ${channels}`;
    }
    return `${valueLabel} before deadline${dueSuffix} via ${channels}`;
  }

  if (settings.mode === "ongoing") {
    return `Throughout project — every ${valueLabel}${weekdaySuffix}${atTimeSuffix} until all parts are done via ${channels}`;
  }

  if (settings.mode === "on_dates") {
    const count = normalizeScheduledDateStrings(settings.scheduledDates).length;
    const yearlySuffix = settings.repeatYearlyOnDates ? " (repeats every year)" : "";
    return `${count} specific date${count === 1 ? "" : "s"}${yearlySuffix} via ${channels}`;
  }

  return `${TASK_REMINDER_MODE_LABELS.every} ${valueLabel}${weekdaySuffix}${atTimeSuffix} via ${channels}`;
}

/**
 * Validate reminder settings against task context (pure, for Zod/UI reuse).
 *
 * @param settings - Normalized reminder settings.
 * @param taskDueAt - Task due date when known.
 * @returns Error message or null when valid.
 */
export function validateTaskReminderSettings(
  settings: ITaskReminderSettings,
  taskDueAt?: Date | string | null,
): string | null {
  if (!settings.enabled) return null;

  if (settings.mode === "on_dates") {
    if (normalizeScheduledDateStrings(settings.scheduledDates).length === 0) {
      return "Add at least one reminder date.";
    }
    return null;
  }

  if (settings.mode === "before_due" && !normalizeDueAt(taskDueAt)) {
    return "Deadline-relative reminders require a due date.";
  }

  if (settings.unit === "weeks" && normalizeTaskReminderWeekdays(settings.weekdays, []).length === 0) {
    return "Select at least one weekday for week-based reminders.";
  }

  if (
    settings.mode !== "on_dates" &&
    (settings.unit === "days" || settings.unit === "weeks") &&
    settings.atTime &&
    !parseTaskReminderAtTime(settings.atTime)
  ) {
    return "Clock time must use HH:mm format.";
  }

  if (settings.mode === "on_dates") {
    return null;
  }

  const limits = TASK_REMINDER_UNIT_LIMITS[settings.unit];
  if (settings.value < limits.min || settings.value > limits.max) {
    return `Reminder amount must be between ${limits.min} and ${limits.max} ${settings.unit}.`;
  }

  return null;
}
