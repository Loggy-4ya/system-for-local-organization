/**
 * @fileoverview Pure helpers for task performer scoring: final = B × Q% × T%.
 *
 * @module shared/lib/taskScoreLogic
 *
 * Tests: `npm run test:task-score-logic`
 * Registry: `.ai/docs/testing.md`
 */

import type { TaskCategoryDefinition } from "@shared/constants/taskCategoryDefaults";
import {
  TASK_COEFFICIENT_PERCENT_DEFAULT,
  TASK_COEFFICIENT_PERCENT_MAX,
  TASK_COEFFICIENT_PERCENT_MIN,
  TASK_SCORE_MAX,
  TASK_SCORE_MIN,
} from "@shared/constants/taskSettings";

/** Inputs for computing one performer's final task score. */
export interface TaskPerformerScoreInput {
  /** Base score (B) set by the task author for this assignment. */
  baseScore: number;
  /** Quality coefficient in percent (Q, 0–200). */
  qualityPercent: number;
  /** Time coefficient in percent (T, 0–200). */
  timePercent: number;
}

/**
 * Clamp a Q/T coefficient percentage into the allowed institutional range.
 *
 * @param value - Raw percent.
 * @returns Clamped percent.
 */
export function clampTaskCoefficientPercent(value: number): number {
  if (!Number.isFinite(value)) return TASK_COEFFICIENT_PERCENT_DEFAULT;
  return Math.min(
    TASK_COEFFICIENT_PERCENT_MAX,
    Math.max(TASK_COEFFICIENT_PERCENT_MIN, value),
  );
}

/**
 * Whether a base score is within a category's allowed range.
 *
 * @param baseScore - Proposed base score (B).
 * @param category - Task category definition.
 * @returns True when valid.
 */
export function isBaseScoreAllowedForCategory(
  baseScore: number,
  category: Pick<TaskCategoryDefinition, "baseScoreMin" | "baseScoreMax">,
): boolean {
  return baseScore >= category.baseScoreMin && baseScore <= category.baseScoreMax;
}

/**
 * Compute the final performer score: `B × (Q/100) × (T/100)`.
 *
 * @param input - Base score and coefficient percents.
 * @returns Rounded final score.
 */
export function computeTaskPerformerFinalScore(input: TaskPerformerScoreInput): number {
  const baseScore = Math.max(TASK_SCORE_MIN, input.baseScore);
  const qualityPercent = clampTaskCoefficientPercent(input.qualityPercent);
  const timePercent = clampTaskCoefficientPercent(input.timePercent);
  const raw = baseScore * (qualityPercent / 100) * (timePercent / 100);
  return Math.round(Math.min(TASK_SCORE_MAX, Math.max(TASK_SCORE_MIN, raw)));
}

/**
 * Whether a task status allows the assigner to enter scores.
 *
 * @param status - Task lifecycle status.
 * @returns True when scoring actions are permitted.
 */
export function isTaskStatusScoreable(status: string): boolean {
  return (
    status === "acknowledged" ||
    status === "in_progress" ||
    status === "submitted" ||
    status === "overdue" ||
    status === "completed"
  );
}
