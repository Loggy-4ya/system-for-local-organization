/**
 * @fileoverview Unit tests for academic catalog label helpers.
 *
 * Module under test: shared/lib/academicCatalogLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:academic-catalog`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isApprovedAcademicLabel,
  normalizeAcademicLabel,
  slugifyAcademicCatalogLabel,
} from "@shared/lib/academicCatalogLogic";

describe("academicCatalogLogic", () => {
  it("slugifies labels for catalog keys", () => {
    assert.equal(slugifyAcademicCatalogLabel("Software Engineering"), "software-engineering");
  });

  it("detects approved labels case-insensitively", () => {
    assert.equal(isApprovedAcademicLabel("se-42", ["SE-42", "SE-41"]), true);
    assert.equal(isApprovedAcademicLabel("SE-99", ["SE-42"]), false);
  });

  it("normalizes empty labels to null", () => {
    assert.equal(normalizeAcademicLabel("   "), null);
    assert.equal(normalizeAcademicLabel(" SE-42 "), "SE-42");
  });
});
