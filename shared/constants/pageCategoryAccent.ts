/**
 * @fileoverview Accent palette for page category badges — stable hues at medium weight.
 *
 * Categories are free-form strings; color is derived deterministically from the
 * normalized label so the same tag always renders the same accent across catalog
 * cards, Puck editor chips, and future filters.
 *
 * @module shared/constants/pageCategoryAccent
 */

/**
 * CSS custom-property tokens for page category badge accents.
 *
 * All entries use the **medium** accent tier so many categories stay visually
 * cohesive while remaining distinguishable by hue.
 */
export const PAGE_CATEGORY_ACCENT_TOKENS = [
  "accent-blue-medium",
  "accent-green-medium",
  "accent-purple-medium",
  "accent-yellow-medium",
  "accent-red-medium",
  "accent-blue-soft",
  "accent-green-soft",
  "accent-purple-soft",
  "accent-yellow-soft",
  "accent-red-soft",
] as const;

/** One entry from {@link PAGE_CATEGORY_ACCENT_TOKENS}. */
export type PageCategoryAccentToken = (typeof PAGE_CATEGORY_ACCENT_TOKENS)[number];

/** Number of distinct accent slots in the category palette. */
export const PAGE_CATEGORY_ACCENT_COUNT = PAGE_CATEGORY_ACCENT_TOKENS.length;

/**
 * CSS modifier suffix for a palette index (`badge-page-category--0`, etc.).
 *
 * @param index - Zero-based palette index (should be modulo {@link PAGE_CATEGORY_ACCENT_COUNT}).
 * @returns Modifier class token without the base badge class.
 */
export function pageCategoryAccentModifierClass(index: number): string {
  const safe = ((index % PAGE_CATEGORY_ACCENT_COUNT) + PAGE_CATEGORY_ACCENT_COUNT) % PAGE_CATEGORY_ACCENT_COUNT;
  return `badge-page-category--${safe}`;
}
