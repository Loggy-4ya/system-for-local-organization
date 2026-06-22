/**
 * Run: npm run test:user-directory-audit-domain
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for UserDirectoryAuditDomain exports.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("UserDirectoryAuditDomain exports", () => {
  it("exposes listAudits and record helpers on the domain object", async () => {
    const { UserDirectoryAuditDomain } = await import(
      "@shared/domains/UserDirectoryAuditDomain"
    );
    assert.equal(typeof UserDirectoryAuditDomain.listAudits, "function");
    assert.equal(typeof UserDirectoryAuditDomain.recordSuccessfulUpdate, "function");
    assert.equal(typeof UserDirectoryAuditDomain.recordSuccessfulDelete, "function");
    assert.equal(typeof UserDirectoryAuditDomain.recordFailure, "function");
  });
});
