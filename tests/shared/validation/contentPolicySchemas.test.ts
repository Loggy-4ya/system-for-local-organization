/**
 * @fileoverview Unit tests for content-policy field kind exclusions.
 *
 * Module under test: shared/validation/contentPolicySchemas.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:content-policy`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getContentPolicyFieldError,
  shouldSkipContentPolicyPlainText,
} from "@shared/validation/contentPolicySchemas";

describe("shouldSkipContentPolicyPlainText", () => {
  it("skips empty values", () => {
    assert.equal(shouldSkipContentPolicyPlainText(""), true);
    assert.equal(shouldSkipContentPolicyPlainText(null), true);
  });

  it("skips numeric-only strings", () => {
    assert.equal(shouldSkipContentPolicyPlainText("42"), true);
    assert.equal(shouldSkipContentPolicyPlainText(" 007 "), true);
  });

  it("does not skip prose", () => {
    assert.equal(shouldSkipContentPolicyPlainText("Software Engineering"), false);
  });
});

describe("getContentPolicyFieldError", () => {
  it("never flags numeric field kind", () => {
    assert.equal(getContentPolicyFieldError("oh shit", "numeric"), null);
  });

  it("never flags tel field kind", () => {
    assert.equal(getContentPolicyFieldError("anything", "tel"), null);
  });

  it("flags plain-text violations", () => {
    assert.ok(getContentPolicyFieldError("what the fuck", "plain-text"));
  });

  it("skips numeric-only values even on plain-text kind", () => {
    assert.equal(getContentPolicyFieldError("42", "plain-text"), null);
  });
});
