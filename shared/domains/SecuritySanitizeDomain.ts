/**
 * @fileoverview Domain engine for security sanitization audit records.
 *
 * @module shared/domains/SecuritySanitizeDomain
 *
 * Tests: `npm run test:security-sanitize-domain`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import { DEFAULT_AUDIT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import {
  clampListPageSize,
  clampPageIndex,
  computeTotalPages,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";
import { mongooseDocToPlain } from "@shared/lib/mongoosePlainObject";
import type { PuckSanitizeFieldEvent } from "@shared/lib/puckContentSanitizeReport";
import SecuritySanitizeAudit, {
  type SecuritySanitizeSource,
} from "@shared/models/SecuritySanitizeAudit";

/** Serializable audit row for admin API and UI. */
export interface SecuritySanitizeAuditRow {
  /** MongoDB document id. */
  id: string;
  /** Pipeline that emitted the audit. */
  source: SecuritySanitizeSource;
  /** Affected page path when source is `puck_save`. */
  pagePath: string;
  /** Editor user id when authenticated. */
  actorUserId?: string;
  /** Number of mutated fields in this pass. */
  eventCount: number;
  /** Per-field sanitization metadata. */
  events: PuckSanitizeFieldEvent[];
  /** ISO timestamp when the audit was recorded. */
  createdAt: string;
}

/** Paginated list of sanitization audits. */
export interface SecuritySanitizeAuditListResult {
  /** Audit rows newest first. */
  items: SecuritySanitizeAuditRow[];
  /** Current 1-based page index. */
  page: number;
  /** Rows per page. */
  limit: number;
  /** Total matching documents. */
  totalCount: number;
  /** Derived page count. */
  totalPages: number;
}

/** Query options for listing audits. */
export interface ListSecuritySanitizeAuditsParams {
  /** 1-based page index (default 1). */
  page?: number;
  /** Page size (default {@link DEFAULT_AUDIT_LIST_PAGE_SIZE}). */
  limit?: number;
  /** Optional filter by page path prefix. */
  pagePathPrefix?: string;
}

/**
 * Map a MongoDB audit document to a public row DTO.
 *
 * @param doc - Mongoose audit document or plain object.
 * @returns Serializable audit row.
 */
function toAuditRow(doc: Record<string, unknown>): SecuritySanitizeAuditRow {
  const plain = mongooseDocToPlain(doc as never);
  const id = String(plain._id ?? plain.id ?? "");
  return {
    id,
    source: plain.source as SecuritySanitizeSource,
    pagePath: String(plain.pagePath ?? ""),
    actorUserId: plain.actorUserId ? String(plain.actorUserId) : undefined,
    eventCount: Number(plain.eventCount ?? 0),
    events: (plain.events as PuckSanitizeFieldEvent[]) ?? [],
    createdAt:
      plain.createdAt instanceof Date
        ? plain.createdAt.toISOString()
        : String(plain.createdAt ?? ""),
  };
}

/**
 * List recent security sanitization audit records (newest first).
 *
 * @param params - Pagination and optional path filter.
 * @returns Paginated audit rows.
 */
export async function listSecuritySanitizeAudits(
  params: ListSecuritySanitizeAuditsParams = {},
): Promise<SecuritySanitizeAuditListResult> {
  await connectDB();

  const limit = clampListPageSize(params.limit, DEFAULT_AUDIT_LIST_PAGE_SIZE);
  const filter: Record<string, unknown> = {};

  if (params.pagePathPrefix?.trim()) {
    filter.pagePath = {
      $regex: `^${params.pagePathPrefix.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    };
  }

  const totalCount = await SecuritySanitizeAudit.countDocuments(filter);
  const totalPages = computeTotalPages(totalCount, limit);
  const page = clampPageIndex(params.page ?? 1, totalPages);
  const skip = pageToSkip(page, limit);

  const docs = await SecuritySanitizeAudit.find(filter)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const items = docs.map((doc) => toAuditRow(doc as Record<string, unknown>));

  return { items, page, limit, totalCount, totalPages };
}

/** Consolidated domain export for security sanitization audits. */
export const SecuritySanitizeDomain = {
  listAudits: listSecuritySanitizeAudits,
};
