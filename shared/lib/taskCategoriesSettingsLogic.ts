/**
 * @fileoverview Normalize and validate institutional task categories from general rules.
 *
 * @module shared/lib/taskCategoriesSettingsLogic
 *
 * Tests: `npm run test:task-categories-settings-logic`
 * Registry: `.ai/docs/testing.md`
 */

import {
  DEFAULT_TASK_CATEGORIES,
  MAX_TASK_CATEGORIES,
  TASK_CATEGORY_ID_PATTERN,
  type TaskCategoryDefinition,
} from "@shared/constants/taskCategoryDefaults";
import {
  TASK_COEFFICIENT_PERCENT_DEFAULT,
  TASK_COEFFICIENT_PERCENT_MAX,
  TASK_COEFFICIENT_PERCENT_MIN,
  TASK_SCORE_MAX,
} from "@shared/constants/taskSettings";

/**
 * Build default task categories for first deploy seeding.
 *
 * @returns Fresh category rows.
 */
export function buildDefaultTaskCategories(): TaskCategoryDefinition[] {
  return DEFAULT_TASK_CATEGORIES.map((row) => ({ ...row }));
}

/**
 * Normalize a slug id from a label when admins create categories.
 *
 * @param label - Display label.
 * @returns Kebab-case slug.
 */
export function slugifyTaskCategoryId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Normalize persisted task category rows.
 *
 * @param raw - Stored categories from MongoDB.
 * @returns Deduped, validated categories.
 */
export function normalizeTaskCategories(
  raw: Array<Partial<TaskCategoryDefinition>> | null | undefined,
): TaskCategoryDefinition[] {
  if (!raw?.length) return buildDefaultTaskCategories();

  const seen = new Set<string>();
  const output: TaskCategoryDefinition[] = [];

  for (const row of raw) {
    const id = String(row.id ?? "").trim().toLowerCase();
    const label = String(row.label ?? "").trim();
    if (!id || !label || !TASK_CATEGORY_ID_PATTERN.test(id) || seen.has(id)) continue;
    seen.add(id);

    let baseScoreMin = clampBaseScore(row.baseScoreMin, 1);
    let baseScoreMax = clampBaseScore(row.baseScoreMax, 100);
    if (baseScoreMax < baseScoreMin) {
      [baseScoreMin, baseScoreMax] = [baseScoreMax, baseScoreMin];
    }

    output.push({
      id,
      label: label.slice(0, 80),
      baseScoreMin,
      baseScoreMax,
      defaultQualityPercent: clampPercent(row.defaultQualityPercent, TASK_COEFFICIENT_PERCENT_DEFAULT),
      defaultTimePercent: clampPercent(row.defaultTimePercent, TASK_COEFFICIENT_PERCENT_DEFAULT),
      enabled: row.enabled !== false,
    });

    if (output.length >= MAX_TASK_CATEGORIES) break;
  }

  return output.length > 0 ? output : buildDefaultTaskCategories();
}

/**
 * Find a category by id.
 *
 * @param categories - Normalized category list.
 * @param categoryId - Task category slug.
 * @returns Category row or null.
 */
export function findTaskCategoryById(
  categories: TaskCategoryDefinition[],
  categoryId: string | null | undefined,
): TaskCategoryDefinition | null {
  if (!categoryId?.trim()) return null;
  return categories.find((row) => row.id === categoryId.trim()) ?? null;
}

/**
 * List categories available for new task assignment pickers.
 *
 * @param categories - Normalized category list.
 * @returns Enabled categories only.
 */
export function listEnabledTaskCategories(
  categories: TaskCategoryDefinition[],
): TaskCategoryDefinition[] {
  return categories.filter((row) => row.enabled);
}

/**
 * @param value - Raw base score bound.
 * @param fallback - Default when invalid.
 * @returns Clamped integer bound.
 */
function clampBaseScore(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(TASK_SCORE_MAX, Math.max(0, Math.round(numeric)));
}

/**
 * @param value - Raw percent.
 * @param fallback - Default when invalid.
 * @returns Clamped percent.
 */
function clampPercent(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(TASK_COEFFICIENT_PERCENT_MAX, Math.max(TASK_COEFFICIENT_PERCENT_MIN, numeric));
}
