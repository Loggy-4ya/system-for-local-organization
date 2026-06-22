/**
 * @fileoverview Pure helpers for institutional yearly calendar scheduling.
 *
 * Tests: `npm run test:institutional-calendar-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/institutionalCalendarLogic
 */

import {
  MAX_INSTITUTIONAL_YEARLY_ANCHORS,
  type InstitutionalYearlyAnchor,
} from "@shared/constants/institutionalCalendar";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import type { SociumRoleKind } from "@shared/models/userTypes";
import {
  addCalendarYears,
  applyTaskReminderAtTime,
  nextOccurrenceAfter,
  parseTaskReminderAtTime,
} from "@shared/lib/taskReminderLogic";

/** Minimal user slice for calendar rule recipient matching. */
export interface InstitutionalCalendarUserSlice {
  userId: string;
  accessLevelIndex: AccessLevelIndex;
  sociumRoles: Array<{ kind: SociumRoleKind; roleKey: string }>;
}

/** Targeting filters on an institutional calendar rule. */
export interface InstitutionalCalendarTargetSlice {
  targetSociumKinds: SociumRoleKind[];
  targetSociumRoleKeys: string[];
  targetAccessLevelIndexes: AccessLevelIndex[];
}

/**
 * Normalize yearly anchors — dedupe, validate, cap count.
 *
 * @param raw - Incoming anchor rows.
 * @returns Validated anchors sorted by month/day/time.
 */
export function normalizeYearlyAnchors(
  raw: InstitutionalYearlyAnchor[] | null | undefined,
): InstitutionalYearlyAnchor[] {
  if (!raw?.length) return [];

  const seen = new Set<string>();
  const output: InstitutionalYearlyAnchor[] = [];

  for (const row of raw) {
    const month = Math.floor(Number(row.month));
    const day = Math.floor(Number(row.day));
    const atTime = typeof row.atTime === "string" && row.atTime.trim() ? row.atTime.trim() : "09:00";
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    if (!parseTaskReminderAtTime(atTime)) continue;

    const key = `${month}-${day}-${atTime}`;
    if (seen.has(key)) continue;
    seen.add(key);

    output.push({ month, day, atTime });
  }

  output.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    if (a.day !== b.day) return a.day - b.day;
    return a.atTime.localeCompare(b.atTime);
  });

  return output.slice(0, MAX_INSTITUTIONAL_YEARLY_ANCHORS);
}

/**
 * Build a concrete Date for one yearly anchor in a given year.
 *
 * @param anchor - Month/day/time anchor.
 * @param year - Calendar year.
 * @returns Local fire instant.
 */
export function yearlyAnchorToDate(anchor: InstitutionalYearlyAnchor, year: number): Date {
  const base = new Date(year, anchor.month - 1, anchor.day, 0, 0, 0, 0);
  return applyTaskReminderAtTime(base, anchor.atTime);
}

/**
 * Compute the next fire instant across all yearly anchors.
 *
 * @param anchors - Normalized yearly anchors.
 * @param afterDate - Do not schedule on or before this instant.
 * @returns Earliest next fire, or null when no anchors exist.
 */
export function computeNextYearlyAnchorAt(
  anchors: InstitutionalYearlyAnchor[],
  afterDate: Date,
): Date | null {
  if (anchors.length === 0) return null;

  const startYear = afterDate.getFullYear();
  let next: Date | null = null;

  for (const anchor of anchors) {
    const candidate = nextOccurrenceAfter(yearlyAnchorToDate(anchor, startYear), afterDate, true);
    if (!candidate) continue;
    if (!next || candidate.getTime() < next.getTime()) {
      next = candidate;
    }
  }

  return next;
}

/**
 * Whether a user matches institutional calendar targeting filters.
 *
 * Socium and access filters combine with AND when both sides are non-empty.
 *
 * @param user - Candidate user slice.
 * @param target - Rule targeting filters.
 * @returns True when the user should receive the fire.
 */
export function userMatchesInstitutionalCalendarTarget(
  user: InstitutionalCalendarUserSlice,
  target: InstitutionalCalendarTargetSlice,
): boolean {
  const hasSociumFilter =
    target.targetSociumKinds.length > 0 || target.targetSociumRoleKeys.length > 0;
  const hasAccessFilter = target.targetAccessLevelIndexes.length > 0;

  if (!hasSociumFilter && !hasAccessFilter) return false;

  const sociumMatch =
    !hasSociumFilter ||
    user.sociumRoles.some(
      (role) =>
        target.targetSociumKinds.includes(role.kind) ||
        target.targetSociumRoleKeys.includes(role.roleKey),
    );

  const accessMatch =
    !hasAccessFilter || target.targetAccessLevelIndexes.includes(user.accessLevelIndex);

  return sociumMatch && accessMatch;
}

/**
 * Replace `{year}` tokens in institutional calendar copy.
 *
 * @param template - Title or description template.
 * @param year - Fire year.
 * @returns Interpolated string.
 */
export function interpolateInstitutionalCalendarTemplate(template: string, year: number): string {
  return template.replaceAll("{year}", String(year));
}

/**
 * Validate that a rule has at least one target dimension configured.
 *
 * @param target - Targeting filters.
 * @returns Error message or null.
 */
export function validateInstitutionalCalendarTarget(
  target: InstitutionalCalendarTargetSlice,
): string | null {
  if (
    target.targetSociumKinds.length === 0 &&
    target.targetSociumRoleKeys.length === 0 &&
    target.targetAccessLevelIndexes.length === 0
  ) {
    return "Select at least one socium role or access level.";
  }
  return null;
}

/**
 * Advance yearly anchors by one year from a fired instant (for display only).
 *
 * @param firedAt - Last fire instant.
 * @returns Same calendar slot next year.
 */
export function nextYearSameInstant(firedAt: Date): Date {
  return addCalendarYears(firedAt, 1);
}
