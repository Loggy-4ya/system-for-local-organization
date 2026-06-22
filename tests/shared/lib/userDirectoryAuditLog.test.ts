/**
 * Run: npm run test:user-directory-audit
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for user directory audit summary helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeUserDirectoryPatch } from "@shared/lib/userDirectoryAuditLog";

describe("summarizeUserDirectoryPatch", () => {
  it("builds success summaries from changed field keys", () => {
    assert.equal(
      summarizeUserDirectoryPatch(["accessLevelIndex", "delegatedPermissions"], true),
      "Updated: accessLevelIndex, delegatedPermissions",
    );
  });

  it("builds rejection summaries when fields are empty", () => {
    assert.equal(summarizeUserDirectoryPatch([], false), "User directory update rejected.");
  });
});

describe("buildUserDirectoryAuditMetadata", () => {
  it("stores level transition metadata without PII", async () => {
    const { buildUserDirectoryAuditMetadata } = await import(
      "@shared/lib/userDirectoryAuditLog"
    );

    const metadata = buildUserDirectoryAuditMetadata(
      { accessLevelIndex: 2, delegatedPermissions: ["users.view_directory"] },
      4,
    );

    assert.equal(metadata.accessLevelIndex, 2);
    assert.equal(metadata.previousAccessLevelIndex, 4);
    assert.equal(metadata.delegatedPermissionsCount, 1);
    assert.equal("email" in metadata, false);
  });
});
