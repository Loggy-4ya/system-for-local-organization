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
  formatAcademicGroupSpecialtyLabel,
  isApprovedAcademicLabel,
  isValidAcademicGroupNumber,
  isValidAcademicSpecialtyCode,
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

  it("formats specialty-group profile subtitle", () => {
    assert.equal(formatAcademicGroupSpecialtyLabel("SE", "42"), "SE-42");
    assert.equal(formatAcademicGroupSpecialtyLabel("SE", null), "SE");
    assert.equal(formatAcademicGroupSpecialtyLabel(null, "42"), "42");
    assert.equal(formatAcademicGroupSpecialtyLabel(null, null), null);
  });

  it("validates specialty letter codes and numeric groups", () => {
    assert.equal(isValidAcademicSpecialtyCode("SE"), true);
    assert.equal(isValidAcademicSpecialtyCode("42"), false);
    assert.equal(isValidAcademicGroupNumber("42"), true);
    assert.equal(isValidAcademicGroupNumber("SE"), false);
  });
});
