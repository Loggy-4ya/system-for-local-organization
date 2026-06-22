/**
 * @fileoverview Unit tests for institutional task category settings helpers.
 *
 * Run: `npm run test:task-categories-settings-logic`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findTaskCategoryById,
  normalizeTaskCategories,
  slugifyTaskCategoryId,
} from "@shared/lib/taskCategoriesSettingsLogic";

describe("normalizeTaskCategories", () => {
  it("seeds defaults when empty", () => {
    const rows = normalizeTaskCategories([]);
    assert.ok(rows.length >= 1);
    assert.equal(rows[0]?.id, "standard");
  });

  it("dedupes by id", () => {
    const rows = normalizeTaskCategories([
      {
        id: "custom",
        label: "Custom",
        baseScoreMin: 10,
        baseScoreMax: 90,
        defaultQualityPercent: 100,
        defaultTimePercent: 100,
        enabled: true,
      },
      {
        id: "custom",
        label: "Duplicate",
        baseScoreMin: 1,
        baseScoreMax: 50,
        defaultQualityPercent: 80,
        defaultTimePercent: 80,
        enabled: true,
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.label, "Custom");
  });
});

describe("findTaskCategoryById", () => {
  it("returns a category by slug", () => {
    const rows = normalizeTaskCategories([]);
    assert.ok(findTaskCategoryById(rows, "standard"));
  });
});

describe("slugifyTaskCategoryId", () => {
  it("creates kebab-case ids", () => {
    assert.equal(slugifyTaskCategoryId("Media Team"), "media-team");
  });
});
