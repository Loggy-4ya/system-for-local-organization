/**
 * @fileoverview Default header nav seeding and one-time migration fingerprints.
 *
 * Tests: `tests/shared/lib/globalLayoutHeaderSeedLogic.test.ts` — `npm run test:global-layout-header-seed`
 *
 * @module shared/lib/globalLayoutHeaderSeedLogic
 */

import {
  DEFAULT_HEADER_CATEGORIES,
  type HeaderCategory,
  type HeaderNavItem,
} from "../constants/globalLayout";

/**
 * Build a stable fingerprint for comparing stored nav seeds (ids + hrefs only).
 *
 * @param categories - Header categories to fingerprint.
 * @returns Sorted `categoryId:itemId@href` tokens.
 */
export function headerCategoryFingerprint(categories: HeaderCategory[]): string {
  return categories
    .map((category) => {
      const itemTokens = category.items
        .map((item) => `${item.id}@${item.href}`)
        .sort()
        .join(",");
      return `${category.id}[${itemTokens}]`;
    })
    .sort()
    .join("|");
}

/**
 * Detect the removed factory header nav seed so existing deployments can migrate once.
 *
 * @param categories - Stored header categories from MongoDB.
 * @returns True when categories still match the old Explore/Manage preset exactly.
 */
export function isLegacyFactoryHeaderCategories(categories: HeaderCategory[]): boolean {
  if (categories.length !== 2) {
    return false;
  }

  const explore = categories.find((category) => category.id === "explore");
  const manage = categories.find((category) => category.id === "manage");

  if (!explore || !manage) {
    return false;
  }

  const exploreItemIds = categoryItemIds(explore.items);
  const manageItemIds = categoryItemIds(manage.items);

  return (
    explore.label === "Explore" &&
    exploreItemIds === "council-apply,news,pages-catalog,propose-activity" &&
    manage.label === "Manage" &&
    manage.align === "end" &&
    manage.adminOnly === true &&
    manageItemIds === "admin,pages"
  );
}

/**
 * Detect the interim two-category seed (Explore + Manage) shipped before Workspace/Administration.
 *
 * @param categories - Stored header categories from MongoDB.
 * @returns True when categories match the superseded seed exactly.
 */
export function isSupersededTwoCategoryHeaderSeed(categories: HeaderCategory[]): boolean {
  if (categories.length !== 2) {
    return false;
  }

  const explore = categories.find((category) => category.id === "explore");
  const manage = categories.find((category) => category.id === "manage");

  if (!explore || !manage) {
    return false;
  }

  return (
    explore.label === "Explore" &&
    categoryItemIds(explore.items) === "home,news,pages-catalog,tasks" &&
    manage.label === "Manage" &&
    manage.align === "end" &&
    manage.adminOnly === true &&
    categoryItemIds(manage.items) === "admin,page-manager"
  );
}

/**
 * Detect the early single Explore-only stub some instances kept before premade categories.
 *
 * @param categories - Stored header categories from MongoDB.
 * @returns True when only one Explore category is present.
 */
export function isExploreOnlyHeaderStub(categories: HeaderCategory[]): boolean {
  return categories.length === 1 && categories[0]?.id === "explore";
}

/**
 * Whether stored categories already match the current premade default seed.
 *
 * @param categories - Stored header categories from MongoDB.
 * @returns True when ids and hrefs match {@link DEFAULT_HEADER_CATEGORIES}.
 */
export function isCurrentDefaultHeaderCategories(categories: HeaderCategory[]): boolean {
  return headerCategoryFingerprint(categories) === headerCategoryFingerprint(DEFAULT_HEADER_CATEGORIES);
}

/**
 * Whether stored header categories should be replaced with {@link DEFAULT_HEADER_CATEGORIES}.
 *
 * Applies when navigation was never configured, still uses a retired seed, or has not yet
 * received the current premade Explore / Workspace / Administration categories.
 *
 * @param categories - Stored header categories from MongoDB.
 * @returns True when the singleton should receive the current default seed.
 */
export function shouldApplyDefaultHeaderCategories(categories: HeaderCategory[]): boolean {
  if (isCurrentDefaultHeaderCategories(categories)) {
    return false;
  }

  if (!categories.length) {
    return true;
  }

  return (
    isLegacyFactoryHeaderCategories(categories) ||
    isSupersededTwoCategoryHeaderSeed(categories) ||
    isExploreOnlyHeaderStub(categories)
  );
}

/**
 * Deep-clone the canonical default header categories for MongoDB writes.
 *
 * @returns Fresh copy of {@link DEFAULT_HEADER_CATEGORIES}.
 */
export function cloneDefaultHeaderCategories(): HeaderCategory[] {
  return structuredClone(DEFAULT_HEADER_CATEGORIES);
}

/**
 * @param items - Nav items inside a category.
 * @returns Sorted comma-separated item ids.
 */
function categoryItemIds(items: HeaderNavItem[]): string {
  return items.map((item) => item.id).sort().join(",");
}
