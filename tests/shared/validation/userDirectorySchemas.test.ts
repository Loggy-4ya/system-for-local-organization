/**
 * @fileoverview Unit tests for User Directory admin validation schemas.
 *
 * Module under test: shared/validation/userDirectorySchemas.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:user-directory-schemas`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminUserUpdateSchema } from "@shared/validation/userDirectorySchemas";

describe("adminUserUpdateSchema", () => {
  it("accepts approved-style specialty code and numeric group", () => {
    const parsed = adminUserUpdateSchema.safeParse({
      specialty: "se",
      group: "42",
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.specialty, "SE");
      assert.equal(parsed.data.group, "42");
    }
  });

  it("rejects numeric specialty codes", () => {
    const parsed = adminUserUpdateSchema.safeParse({ specialty: "42" });
    assert.equal(parsed.success, false);
  });

  it("rejects non-numeric group values", () => {
    const parsed = adminUserUpdateSchema.safeParse({ group: "SE-42" });
    assert.equal(parsed.success, false);
  });

  it("accepts phone updates alongside academic fields", () => {
    const parsed = adminUserUpdateSchema.safeParse({
      specialty: "KN",
      group: "12",
      phone: "+380501234567",
    });

    assert.equal(parsed.success, true);
  });

  it("strips markup from phone values before validation", () => {
    const parsed = adminUserUpdateSchema.safeParse({
      phone: "+380501234567<script>alert(1)</script>",
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.phone, "+380501234567");
      assert.doesNotMatch(parsed.data.phone ?? "", /script|alert/i);
    }
  });

  it("maps markup-only phone patches to null", () => {
    const parsed = adminUserUpdateSchema.safeParse({
      phone: "<script>alert(1)</script>",
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.phone, null);
    }
  });

  it("still accepts access-control patch fields", () => {
    const parsed = adminUserUpdateSchema.safeParse({
      accessLevelIndex: 4,
      delegatedPermissions: ["tasks.receive"],
    });

    assert.equal(parsed.success, true);
  });
});
