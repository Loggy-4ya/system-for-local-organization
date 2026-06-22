/**
 * @fileoverview Normalize persisted task delegation limits from General Rules.
 *
 * @module shared/lib/taskDelegationLimitsLogic
 *
 * Tests: `npm run test:task-delegation-limits-logic`
 * Registry: `.ai/docs/testing.md`
 */

import type { AccessLevelIndex } from "@shared/constants/accessControl";
import { DEFAULT_ACCESS_LEVELS } from "@shared/constants/accessControl";
import { DEFAULT_TASK_DELEGATION_LIMITS } from "@shared/constants/taskSettings";

/** Raw delegation limits map from MongoDB or admin API. */
export type TaskDelegationLimitsInput = Record<string, number | null | undefined> | null | undefined;

/**
 * Merge stored delegation limits with code defaults.
 *
 * @param stored - Partial map from General Rules (keys `"0"`–`"6"` or numeric).
 * @returns Complete limits record keyed by {@link AccessLevelIndex}.
 */
export function normalizeTaskDelegationLimits(
  stored: TaskDelegationLimitsInput,
): Record<AccessLevelIndex, number | null> {
  const output: Record<AccessLevelIndex, number | null> = { ...DEFAULT_TASK_DELEGATION_LIMITS };

  if (!stored || typeof stored !== "object") {
    return output;
  }

  for (const level of DEFAULT_ACCESS_LEVELS) {
    const raw = stored[String(level.index)] ?? stored[level.index as unknown as string];
    if (raw === null) {
      output[level.index] = null;
    } else if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      output[level.index] = Math.floor(raw);
    }
  }

  return output;
}

/**
 * Serialize limits for admin JSON payloads (string keys for stable API shape).
 *
 * @param limits - Normalized limits map.
 * @returns String-keyed record for API responses.
 */
export function serializeTaskDelegationLimits(
  limits: Record<AccessLevelIndex, number | null>,
): Record<string, number | null> {
  return Object.fromEntries(
    DEFAULT_ACCESS_LEVELS.map((level) => [String(level.index), limits[level.index] ?? null]),
  );
}
