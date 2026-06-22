/**
 * @fileoverview Pure helpers for offset-based list pagination UI.
 *
 * Tests: `tests/shared/lib/listPaginationLogic.test.ts` — `npm run test:list-pagination`
 *
 * @module shared/lib/listPaginationLogic
 */

import { MAX_LIST_PAGE_SIZE } from "@shared/constants/listPagination";

/** Single page control in a pagination bar. */
export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Clamp a requested page size to the institutional maximum.
 *
 * @param limit - Requested limit or undefined.
 * @param fallback - Default when limit is undefined.
 * @returns Safe limit between 1 and {@link MAX_LIST_PAGE_SIZE}.
 */
export function clampListPageSize(limit: number | undefined, fallback: number): number {
  const raw = limit ?? fallback;
  return Math.min(MAX_LIST_PAGE_SIZE, Math.max(1, Math.floor(raw)));
}

/**
 * Compute total pages from a document count and page size.
 *
 * @param totalCount - Matching documents.
 * @param limit - Rows per page.
 * @returns At least 1 page even when empty.
 */
export function computeTotalPages(totalCount: number, limit: number): number {
  if (limit <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, totalCount) / limit));
}

/**
 * Clamp a page index into `[1, totalPages]`.
 *
 * @param page - Requested 1-based page.
 * @param totalPages - Known page count.
 * @returns Clamped page.
 */
export function clampPageIndex(page: number, totalPages: number): number {
  const safeTotal = Math.max(1, totalPages);
  return Math.min(safeTotal, Math.max(1, Math.floor(page)));
}

/**
 * MongoDB `skip` offset for a 1-based page index.
 *
 * @param page - 1-based page.
 * @param limit - Rows per page.
 * @returns Skip count.
 */
export function pageToSkip(page: number, limit: number): number {
  return (clampPageIndex(page, Number.MAX_SAFE_INTEGER) - 1) * limit;
}

/**
 * Inclusive 1-based row range labels for the current page.
 *
 * @param page - Current page.
 * @param limit - Page size.
 * @param totalCount - Total matches.
 * @returns `{ from, to }` for display; both zero when empty.
 */
export function computePageRowRange(
  page: number,
  limit: number,
  totalCount: number,
): { from: number; to: number } {
  if (totalCount <= 0) return { from: 0, to: 0 };
  const from = (clampPageIndex(page, computeTotalPages(totalCount, limit)) - 1) * limit + 1;
  const to = Math.min(totalCount, from + limit - 1);
  return { from, to };
}

/**
 * Build page number items for a Shadcn-style pagination control.
 *
 * @param currentPage - Active 1-based page.
 * @param totalPages - Total pages.
 * @returns Sequence of page numbers and ellipsis markers.
 */
export function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const safeTotal = Math.max(1, totalPages);
  const current = clampPageIndex(currentPage, safeTotal);

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];

  if (current > 3) {
    items.push("ellipsis-start");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(safeTotal - 1, current + 1);

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (current < safeTotal - 2) {
    items.push("ellipsis-end");
  }

  items.push(safeTotal);
  return items;
}
