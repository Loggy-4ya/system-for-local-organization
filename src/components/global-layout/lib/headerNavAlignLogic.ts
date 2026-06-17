/**
 * @fileoverview Header nav alignment helpers for global layout chrome.
 *
 * Tests: `tests/global-layout/lib/headerNavAlignLogic.test.ts` — `npm run test:global-layout-align`
 *
 * @module src/components/global-layout/lib/headerNavAlignLogic
 */

import type { HeaderCategory, HeaderNavAlign, HeaderNavGap } from "@shared/constants/globalLayout";

/** Category count at which desktop header nav switches to a full-width grid band. */
export const DENSE_HEADER_NAV_CATEGORY_COUNT = 5;

/** Desktop nav zones derived from category alignment. */
export type HeaderNavAlignZone = HeaderNavAlign;

/** Categories grouped by resolved desktop alignment zone. */
export interface HeaderCategoriesByAlign {
  /** Left-aligned categories. */
  start: HeaderCategory[];
  /** Center-aligned categories. */
  center: HeaderCategory[];
  /** Right-aligned categories. */
  end: HeaderCategory[];
}

/**
 * Resolve the desktop alignment for one category.
 *
 * @param category - Header category config.
 * @param defaultAlign - Layout default when the category has no override.
 * @returns Effective alignment zone.
 */
export function resolveCategoryAlign(
  category: HeaderCategory,
  defaultAlign: HeaderNavAlign,
): HeaderNavAlign {
  return category.align ?? defaultAlign;
}

/**
 * Group visible categories into left, center, and right desktop nav zones.
 *
 * @param categories - Categories in display order.
 * @param defaultAlign - Layout default alignment.
 * @returns Categories partitioned by resolved alignment.
 */
export function groupHeaderCategoriesByAlign(
  categories: readonly HeaderCategory[],
  defaultAlign: HeaderNavAlign,
): HeaderCategoriesByAlign {
  const grouped: HeaderCategoriesByAlign = {
    start: [],
    center: [],
    end: [],
  };

  for (const category of categories) {
    const align = resolveCategoryAlign(category, defaultAlign);
    grouped[align].push(category);
  }

  return grouped;
}

/**
 * Human-readable label for an alignment value in admin UI badges.
 *
 * @param align - Alignment token.
 * @returns Display label.
 */
export function formatHeaderNavAlignLabel(align: HeaderNavAlign): string {
  if (align === "center") {
    return "Center";
  }

  if (align === "end") {
    return "Right";
  }

  return "Left";
}

/**
 * Whether desktop header navigation should use compact grid cells (5+ categories).
 *
 * Keeps categories in a single header row; only tightens horizontal grid spacing.
 *
 * @param categories - Visible header categories.
 * @returns `true` when the category count is at or above the compact threshold.
 */
export function shouldUseDenseHeaderNav(categories: readonly HeaderCategory[]): boolean {
  return categories.length >= DENSE_HEADER_NAV_CATEGORY_COUNT;
}

/**
 * CSS gap value for header nav clusters from the layout gap token.
 *
 * @param gap - Header layout gap token.
 * @returns CSS length for `gap` / `--site-header-nav-gap`.
 */
export function headerNavGapCssValue(gap?: HeaderNavGap): string {
  if (gap === "sm") {
    return "0.5rem";
  }

  if (gap === "lg") {
    return "1.5rem";
  }

  if (gap === "xl") {
    return "2.25rem";
  }

  if (gap === "2xl") {
    return "3rem";
  }

  return "1rem";
}

export default groupHeaderCategoriesByAlign;
