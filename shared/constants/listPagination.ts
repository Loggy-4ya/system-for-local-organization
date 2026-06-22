/**
 * @fileoverview Shared defaults for paginated admin and dashboard list APIs.
 *
 * Every collection endpoint and client list shell should cap page size using these
 * constants to avoid rendering freezes and MongoDB overload.
 *
 * @module shared/constants/listPagination
 */

/** Default rows per page for admin directory-style lists. */
export const DEFAULT_LIST_PAGE_SIZE = 10;

/** Hard cap for any list `limit` query parameter. */
export const MAX_LIST_PAGE_SIZE = 50;

/** Smaller default for audit/log feeds where rows are taller. */
export const DEFAULT_AUDIT_LIST_PAGE_SIZE = 15;

/**
 * Paginated list metadata returned alongside row arrays.
 */
export interface PaginatedListMeta {
  /** Current 1-based page index. */
  page: number;
  /** Rows requested for this page. */
  limit: number;
  /** Total matching documents in the collection query. */
  totalCount: number;
  /** Derived total page count. */
  totalPages: number;
}
