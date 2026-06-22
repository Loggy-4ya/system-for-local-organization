/**
 * @fileoverview Domain engine for User Directory admin audit records.
 *
 * @module shared/domains/UserDirectoryAuditDomain
 *
 * Tests: `tests/shared/domains/userDirectoryAuditDomain.test.ts` — `npm run test:user-directory-audit-domain`
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
import {
  recordUserDirectoryAudit,
  summarizeUserDirectoryPatch,
  buildUserDirectoryAuditMetadata,
  type RecordUserDirectoryAuditParams,
} from "@shared/lib/userDirectoryAuditLog";
import { mongooseDocToPlain } from "@shared/lib/mongoosePlainObject";
import { formatUserFullName } from "@shared/lib/userSociumHelpers";
import UserDirectoryAudit, {
  type UserDirectoryAuditAction,
} from "@shared/models/UserDirectoryAudit";
import type { IUser } from "@shared/models/User";

/** Serializable audit row for admin API and UI. */
export interface UserDirectoryAuditRow {
  /** MongoDB document id. */
  id: string;
  /** Mutation kind. */
  action: UserDirectoryAuditAction;
  /** Whether the operation succeeded. */
  success: boolean;
  /** Acting admin user id. */
  actorUserId: string;
  /** Acting admin login handle. */
  actorLogin: string | null;
  /** Target user id. */
  targetUserId: string;
  /** Target display name snapshot. */
  targetDisplayName: string | null;
  /** Short summary line. */
  summary: string;
  /** Changed field keys. */
  changedFields: string[];
  /** Failure code when unsuccessful. */
  errorCode: string | null;
  /** Safe metadata object. */
  metadata: Record<string, unknown>;
  /** ISO timestamp. */
  createdAt: string;
}

/** Paginated list result. */
export interface UserDirectoryAuditListResult {
  items: UserDirectoryAuditRow[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/** List query parameters. */
export interface ListUserDirectoryAuditsParams {
  page?: number;
  limit?: number;
  targetUserId?: string;
  successOnly?: boolean;
}

/**
 * Map a MongoDB audit document to a public row DTO.
 *
 * @param doc - Lean document or plain object.
 * @returns Serializable audit row.
 */
function toAuditRow(doc: Record<string, unknown>): UserDirectoryAuditRow {
  const plain = mongooseDocToPlain(doc as never);
  return {
    id: String(plain._id ?? plain.id ?? ""),
    action: plain.action as UserDirectoryAuditAction,
    success: Boolean(plain.success),
    actorUserId: String(plain.actorUserId ?? ""),
    actorLogin: plain.actorLogin ? String(plain.actorLogin) : null,
    targetUserId: String(plain.targetUserId ?? ""),
    targetDisplayName: plain.targetDisplayName ? String(plain.targetDisplayName) : null,
    summary: String(plain.summary ?? ""),
    changedFields: Array.isArray(plain.changedFields)
      ? plain.changedFields.map((field) => String(field))
      : [],
    errorCode: plain.errorCode ? String(plain.errorCode) : null,
    metadata:
      plain.metadata && typeof plain.metadata === "object"
        ? (plain.metadata as Record<string, unknown>)
        : {},
    createdAt:
      plain.createdAt instanceof Date
        ? plain.createdAt.toISOString()
        : String(plain.createdAt ?? ""),
  };
}

/** Consolidated domain export for user directory admin audits. */
export const UserDirectoryAuditDomain = {
  /**
   * Persist an audit row.
   *
   * @param params - Audit payload.
   */
  async record(params: RecordUserDirectoryAuditParams): Promise<void> {
    await recordUserDirectoryAudit(params);
  },

  /**
   * Record a successful user update from the access-control domain.
   *
   * @param actor - Acting admin.
   * @param target - Target user before save.
   * @param patch - Applied patch keys and safe metadata source.
   */
  async recordSuccessfulUpdate(
    actor: IUser,
    target: IUser,
    patch: Record<string, unknown>,
    previousAccessLevelIndex?: number,
  ): Promise<void> {
    const changedFields = Object.keys(patch).filter((key) => patch[key] !== undefined);
    await recordUserDirectoryAudit({
      action: "user_update",
      success: true,
      actorUserId: actor._id.toString(),
      actorLogin: actor.login,
      targetUserId: target._id.toString(),
      targetDisplayName: formatUserFullName(target.name, target.surname),
      summary: summarizeUserDirectoryPatch(changedFields, true),
      changedFields,
      metadata: buildUserDirectoryAuditMetadata(patch, previousAccessLevelIndex),
    });
  },

  /**
   * Record a successful user deletion.
   *
   * @param actor - Acting admin.
   * @param target - Target user before deletion.
   */
  async recordSuccessfulDelete(actor: IUser, target: IUser): Promise<void> {
    await recordUserDirectoryAudit({
      action: "user_delete",
      success: true,
      actorUserId: actor._id.toString(),
      actorLogin: actor.login,
      targetUserId: target._id.toString(),
      targetDisplayName: formatUserFullName(target.name, target.surname),
      summary: "Deleted user account.",
      changedFields: ["account"],
      metadata: {
        accessLevelIndex: target.accessLevelIndex,
      },
    });
  },

  /**
   * Record a failed user directory mutation attempt.
   *
   * @param params - Failure context.
   */
  async recordFailure(params: {
    actor: IUser;
    targetUserId: string;
    targetDisplayName?: string | null;
    action: UserDirectoryAuditAction;
    errorCode: string;
    changedFields?: string[];
    summary?: string;
  }): Promise<void> {
    const changedFields = params.changedFields ?? [];
    await recordUserDirectoryAudit({
      action: params.action,
      success: false,
      actorUserId: params.actor._id.toString(),
      actorLogin: params.actor.login,
      targetUserId: params.targetUserId,
      targetDisplayName: params.targetDisplayName ?? null,
      summary:
        params.summary ??
        summarizeUserDirectoryPatch(changedFields, false),
      changedFields,
      errorCode: params.errorCode,
    });
  },

  /**
   * List recent user directory audit records (newest first).
   *
   * @param params - Pagination and optional filters.
   * @returns Paginated audit rows.
   */
  async listAudits(
    params: ListUserDirectoryAuditsParams = {},
  ): Promise<UserDirectoryAuditListResult> {
    await connectDB();

    const limit = clampListPageSize(params.limit, DEFAULT_AUDIT_LIST_PAGE_SIZE);
    const filter: Record<string, unknown> = {};

    if (params.targetUserId?.trim()) {
      filter.targetUserId = params.targetUserId.trim();
    }
    if (params.successOnly) {
      filter.success = true;
    }

    const totalCount = await UserDirectoryAudit.countDocuments(filter);
    const totalPages = computeTotalPages(totalCount, limit);
    const page = clampPageIndex(params.page ?? 1, totalPages);
    const skip = pageToSkip(page, limit);

    const docs = await UserDirectoryAudit.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const items = docs.map((doc) => toAuditRow(doc as Record<string, unknown>));

    return { items, page, limit, totalCount, totalPages };
  },
};
