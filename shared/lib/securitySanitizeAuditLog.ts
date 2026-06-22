/**
 * @fileoverview Persist and log security sanitization audit events.
 *
 * @module shared/lib/securitySanitizeAuditLog
 *
 * Tests: `npm run test:security-sanitize-audit`
 * Registry: `.ai/docs/testing.md`
 */

import type { PuckSanitizeReport } from "@shared/lib/puckContentSanitizeReport";
import SecuritySanitizeAudit, {
  type SecuritySanitizeSource,
} from "@shared/models/SecuritySanitizeAudit";

/** Parameters for recording a Puck save sanitization audit. */
export interface RecordPuckSanitizeAuditParams {
  /** Saved page path (e.g. `/news`). */
  pagePath: string;
  /** Authenticated editor user id, when available. */
  actorUserId?: string;
  /** Sanitization diff report from {@link sanitizePuckDataForStorageWithReport}. */
  report: PuckSanitizeReport;
}

/**
 * Write structured logs and optionally persist sanitization mutations.
 *
 * Always emits a `console.warn` when events are present. Persists a MongoDB
 * document when `SECURITY_SANITIZE_AUDIT_PERSIST` is not `false`.
 *
 * @param params - Puck save context and sanitization report.
 * @returns Promise resolving when logging/persistence completes.
 */
export async function recordPuckSanitizeAudit(
  params: RecordPuckSanitizeAuditParams,
): Promise<void> {
  const { pagePath, actorUserId, report } = params;
  if (report.events.length === 0) return;

  const payload = {
    source: "puck_save" as SecuritySanitizeSource,
    pagePath,
    actorUserId: actorUserId ?? null,
    eventCount: report.events.length,
    events: report.events,
  };

  console.warn("[SecuritySanitize] Puck content sanitized before save.", payload);

  const persistFlag = process.env.SECURITY_SANITIZE_AUDIT_PERSIST?.trim().toLowerCase();
  if (persistFlag === "false" || persistFlag === "0") {
    return;
  }

  await SecuritySanitizeAudit.create({
    source: payload.source,
    pagePath: payload.pagePath,
    actorUserId: payload.actorUserId ?? undefined,
    eventCount: payload.eventCount,
    events: payload.events,
  });
}
