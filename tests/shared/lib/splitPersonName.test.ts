/**
 * @fileoverview Unit tests for OAuth full-name splitting.
 *
 * Module under test: shared/lib/splitPersonName.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:split-person-name`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitPersonName } from "@shared/lib/splitPersonName";

describe("splitPersonName", () => {
  it("splits first and remaining tokens into surname", () => {
    const result = splitPersonName("Ivan Petrenko");
    assert.equal(result.name, "Ivan");
    assert.equal(result.surname, "Petrenko");
  });

  it("returns surname null for single-token names", () => {
    const result = splitPersonName("Ivan");
    assert.equal(result.name, "Ivan");
    assert.equal(result.surname, null);
  });
});
