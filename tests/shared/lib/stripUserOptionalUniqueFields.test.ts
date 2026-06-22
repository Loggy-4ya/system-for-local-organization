/**
 * @fileoverview Unit tests for optional unique User field stripping.
 *
 * Module under test: shared/lib/stripUserOptionalUniqueFields.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:strip-user-optional-unique-fields`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldUnsetUserOptionalUniqueField,
  stripUserOptionalUniqueFields,
} from "@shared/lib/stripUserOptionalUniqueFields";

describe("shouldUnsetUserOptionalUniqueField", () => {
  it("unsets null, undefined, and blank strings", () => {
    assert.equal(shouldUnsetUserOptionalUniqueField(null), true);
    assert.equal(shouldUnsetUserOptionalUniqueField(undefined), true);
    assert.equal(shouldUnsetUserOptionalUniqueField(""), true);
    assert.equal(shouldUnsetUserOptionalUniqueField("   "), true);
  });

  it("keeps non-empty strings", () => {
    assert.equal(shouldUnsetUserOptionalUniqueField("student@school.edu"), false);
  });
});

describe("stripUserOptionalUniqueFields", () => {
  it("removes null email/login from create payloads", () => {
    const payload: Record<string, unknown> = {
      login: "ivan.petrenko",
      email: null,
      name: "Ivan",
    };

    stripUserOptionalUniqueFields(payload);

    assert.equal("email" in payload, false);
    assert.equal(payload.login, "ivan.petrenko");
  });
});
