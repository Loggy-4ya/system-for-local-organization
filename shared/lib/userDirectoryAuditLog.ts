/**
 * @fileoverview Persist User Directory admin audit events.
 *
 * Tests: `tests/shared/lib/userDirectoryAuditLog.test.ts` — `npm run test:user-directory-audit`
 *
 * @module shared/lib/userDirectoryAuditLog
 */

import UserDirectoryAudit, {
  type UserDirectoryAuditAction,
} from "@shared/models/UserDirectoryAudit";

/** Parameters for recording a user directory admin audit row. */
export interface RecordUserDirectoryAuditParams {
  /** Mutation kind. */
  action: UserDirectoryAuditAction;
  /** Whether the operation succeeded. */
  success: boolean;
  /** Acting admin user id. */
  actorUserId: string;
  /** Acting admin login handle when available. */
  actorLogin?: string | null;
  /** Target user id. */
  targetUserId: string;
  /** Target display name at action time. */
  targetDisplayName?: string | null;
  /** Short summary for admin logs UI. */
  summary: string;
  /** Field keys or domains touched. */
  changedFields?: string[];
  /** Failure code when unsuccessful. */
  errorCode?: string | null;
  /** Safe structured metadata (no PII). */
  metadata?: Record<string, unknown>;
}

/**
 * Write a console info/warn line and persist a user directory audit document.
 *
 * Skips MongoDB persistence when `USER_DIRECTORY_AUDIT_PERSIST=false`.
 *
 * @param params - Audit event payload.
 */
export async function recordUserDirectoryAudit(
  params: RecordUserDirectoryAuditParams,
): Promise<void> {
  const payload = {
    action: params.action,
    success: params.success,
    actorUserId: params.actorUserId,
    actorLogin: params.actorLogin ?? null,
    targetUserId: params.targetUserId,
    targetDisplayName: params.targetDisplayName ?? null,
    summary: params.summary,
    changedFields: params.changedFields ?? [],
    errorCode: params.errorCode ?? null,
    metadata: params.metadata ?? {},
  };

  const logFn = payload.success ? console.info : console.warn;
  logFn("[UserDirectoryAudit]", payload);

  const persistFlag = process.env.USER_DIRECTORY_AUDIT_PERSIST?.trim().toLowerCase();
  if (persistFlag === "false" || persistFlag === "0") {
    return;
  }

  await UserDirectoryAudit.create(payload);
}

/**
 * Build a short summary string from changed patch keys.
 *
 * @param changedFields - Keys present on the admin PATCH body.
 * @param success - Whether the mutation succeeded.
 * @returns Human-readable summary.
 */
export function summarizeUserDirectoryPatch(changedFields: string[], success: boolean): string {
  if (changedFields.length === 0) {
    return success ? "User directory update recorded." : "User directory update rejected.";
  }

  const verb = success ? "Updated" : "Rejected update for";
  return `${verb}: ${changedFields.join(", ")}`;
}

/**
 * Build safe metadata from an admin PATCH body (no PII values).
 *
 * @param patch - Validated admin update payload.
 * @param previousAccessLevelIndex - Target level before mutation.
 * @returns Metadata object for audit storage.
 */
export function buildUserDirectoryAuditMetadata(
  patch: Record<string, unknown>,
  previousAccessLevelIndex?: number,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  if (patch.accessLevelIndex !== undefined) {
    metadata.accessLevelIndex = patch.accessLevelIndex;
    if (previousAccessLevelIndex !== undefined) {
      metadata.previousAccessLevelIndex = previousAccessLevelIndex;
    }
  }
  if (Array.isArray(patch.delegatedPermissions)) {
    metadata.delegatedPermissionsCount = patch.delegatedPermissions.length;
  }
  if (Array.isArray(patch.sociumRoles)) {
    metadata.sociumRolesCount = patch.sociumRoles.length;
  }
  if (Array.isArray(patch.socialGroupActivities)) {
    metadata.socialGroupActivitiesCount = patch.socialGroupActivities.length;
  }
  if (Array.isArray(patch.organizations)) {
    metadata.organizationsCount = patch.organizations.length;
  }

  return metadata;
}
