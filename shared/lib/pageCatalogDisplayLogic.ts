/**
 * @fileoverview Pure layout helpers for the Page Manager catalog carousel and pagination.
 *
 * Tests: `npm run test:page-catalog-display-logic`
 *
 * @module shared/lib/pageCatalogDisplayLogic
 */

import {
  PAGE_CATALOG_CAROUSEL_BREAKPOINTS,
  PAGE_CATALOG_CAROUSEL_MIN_PAGES,
  PAGE_CATALOG_GRID_PAGE_SIZE,
} from "../constants/pageCatalogDisplay";

/**
 * Resolve how many catalog cards are visible in the carousel viewport.
 *
 * @param viewportWidth - Browser viewport width in pixels.
 * @returns Visible card count (1, 2, or 3).
 */
export function resolvePageCatalogVisibleCardCount(viewportWidth: number): number {
  if (viewportWidth >= PAGE_CATALOG_CAROUSEL_BREAKPOINTS.desktop) return 3;
  if (viewportWidth >= PAGE_CATALOG_CAROUSEL_BREAKPOINTS.tablet) return 2;
  return 1;
}

/**
 * Whether a section should render the auto-carousel instead of a static grid.
 *
 * @param pageCount - Total cards in the section.
 * @returns True when carousel mode applies.
 */
export function shouldUsePageCatalogCarousel(pageCount: number): boolean {
  return pageCount >= PAGE_CATALOG_CAROUSEL_MIN_PAGES;
}

/**
 * Slice catalog pages for offset pagination in static grid mode.
 *
 * @param pages - Full ordered page list.
 * @param page - 1-based page index.
 * @param pageSize - Cards per page.
 * @returns Window slice for the requested page.
 */
export function paginateCatalogPages<T>(
  pages: readonly T[],
  page: number,
  pageSize = PAGE_CATALOG_GRID_PAGE_SIZE,
): T[] {
  if (pages.length === 0) return [];
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(pages.length / safePageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * safePageSize;
  return pages.slice(start, start + safePageSize);
}

/**
 * Resolve total pagination pages for a static grid section.
 *
 * @param pageCount - Total cards in the section.
 * @param pageSize - Cards per page.
 * @returns Number of pagination pages (minimum 1).
 */
export function resolvePageCatalogGridPageCount(
  pageCount: number,
  pageSize = PAGE_CATALOG_GRID_PAGE_SIZE,
): number {
  if (pageCount <= 0) return 1;
  return Math.max(1, Math.ceil(pageCount / Math.max(1, pageSize)));
}

/**
 * Resolve carousel pagination dot count for a section.
 *
 * @param pageCount - Total cards in the section.
 * @param visibleCount - Cards visible per viewport.
 * @returns Dot count for carousel navigation.
 */
export function resolvePageCatalogCarouselPageCount(
  pageCount: number,
  visibleCount: number,
): number {
  if (pageCount <= 0) return 1;
  const visible = Math.max(1, visibleCount);
  if (pageCount <= visible) return 1;
  return Math.max(1, Math.ceil((pageCount - visible) / visible) + 1);
}

/**
 * Clamp a carousel dot index after viewport or data changes.
 *
 * @param activePage - Current 0-based carousel page.
 * @param pageCount - Total carousel pagination pages.
 * @returns Clamped page index.
 */
export function clampPageCatalogCarouselPage(activePage: number, pageCount: number): number {
  const safeCount = Math.max(1, pageCount);
  return Math.min(Math.max(0, activePage), safeCount - 1);
}
