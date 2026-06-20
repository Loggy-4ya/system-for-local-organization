/**
 * @fileoverview Unit tests for password strength assessment.
 *
 * Module under test: shared/lib/passwordStrength.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:password-strength`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessPasswordStrength, getPasswordStrengthError } from "@shared/lib/passwordStrength";

describe("assessPasswordStrength", () => {
  it("flags short passwords as weak", () => {
    const result = assessPasswordStrength("abc");
    assert.equal(result.isWeak, true);
    assert.ok(result.issues.some((issue) => issue.includes("8 characters")));
  });

  it("flags passwords that match login", () => {
    const result = assessPasswordStrength("student.nexus", "student.nexus");
    assert.equal(result.isWeak, true);
    assert.ok(result.issues.some((issue) => issue.includes("login")));
  });

  it("accepts mixed-character passwords with adequate length", () => {
    const result = assessPasswordStrength("River-2026!");
    assert.equal(result.isWeak, false);
    assert.equal(getPasswordStrengthError("River-2026!"), null);
  });
});
