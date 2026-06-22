/**
 * Run: npm run test:security-sanitize-domain
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for SecuritySanitizeDomain row mapping helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("SecuritySanitizeDomain exports", () => {
  it("exposes listAudits on the domain object", async () => {
    const { SecuritySanitizeDomain } = await import(
      "@shared/domains/SecuritySanitizeDomain"
    );
    assert.equal(typeof SecuritySanitizeDomain.listAudits, "function");
  });
});
