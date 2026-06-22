/**
 * @fileoverview Default institutional task categories for scoring arrangement.
 *
 * @module shared/constants/taskCategoryDefaults
 */

/** Maximum configurable task categories in general rules. */
export const MAX_TASK_CATEGORIES = 40;

/** Slug pattern for task category ids. */
export const TASK_CATEGORY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Default task categories seeded into general rules. */
export const DEFAULT_TASK_CATEGORIES = [
  {
    id: "standard",
    label: "Standard assignment",
    baseScoreMin: 1,
    baseScoreMax: 100,
    defaultQualityPercent: 100,
    defaultTimePercent: 100,
    enabled: true,
  },
  {
    id: "event",
    label: "Event / outreach",
    baseScoreMin: 5,
    baseScoreMax: 80,
    defaultQualityPercent: 100,
    defaultTimePercent: 100,
    enabled: true,
  },
  {
    id: "creative",
    label: "Creative deliverable",
    baseScoreMin: 10,
    baseScoreMax: 150,
    defaultQualityPercent: 100,
    defaultTimePercent: 100,
    enabled: true,
  },
  {
    id: "fabrication",
    label: "Fabrication / 3D print",
    baseScoreMin: 20,
    baseScoreMax: 200,
    defaultQualityPercent: 100,
    defaultTimePercent: 100,
    enabled: true,
  },
] as const;

/** Institutional task category row stored in general rules. */
export type TaskCategoryDefinition = {
  /** Stable slug referenced by tasks (`categoryId`). */
  id: string;
  /** Human-readable label for pickers and admin filters. */
  label: string;
  /** Minimum allowed base score (B) for tasks in this category. */
  baseScoreMin: number;
  /** Maximum allowed base score (B) for tasks in this category. */
  baseScoreMax: number;
  /** Default quality coefficient % (Q) for new performer score rows. */
  defaultQualityPercent: number;
  /** Default time coefficient % (T) for new performer score rows. */
  defaultTimePercent: number;
  /** When false, hidden from task create picker but preserved for legacy tasks. */
  enabled: boolean;
};
