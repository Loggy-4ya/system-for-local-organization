/**
 * @fileoverview Unit tests for task performer scoring helpers.
 *
 * Run: `npm run test:task-score-logic`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeTaskPerformerFinalScore,
  isBaseScoreAllowedForCategory,
  isTaskStatusScoreable,
} from "@shared/lib/taskScoreLogic";

describe("computeTaskPerformerFinalScore", () => {
  it("computes B × Q% × T%", () => {
    const score = computeTaskPerformerFinalScore({
      baseScore: 100,
      qualityPercent: 80,
      timePercent: 50,
    });
    assert.equal(score, 40);
  });

  it("allows coefficients above 100%", () => {
    const score = computeTaskPerformerFinalScore({
      baseScore: 50,
      qualityPercent: 150,
      timePercent: 120,
    });
    assert.equal(score, 90);
  });
});

describe("isBaseScoreAllowedForCategory", () => {
  it("validates base score within category bounds", () => {
    const category = { baseScoreMin: 20, baseScoreMax: 200 };
    assert.equal(isBaseScoreAllowedForCategory(100, category), true);
    assert.equal(isBaseScoreAllowedForCategory(10, category), false);
    assert.equal(isBaseScoreAllowedForCategory(250, category), false);
  });
});

describe("isTaskStatusScoreable", () => {
  it("allows scoring after acknowledgement and through completion", () => {
    assert.equal(isTaskStatusScoreable("in_progress"), true);
    assert.equal(isTaskStatusScoreable("submitted"), true);
    assert.equal(isTaskStatusScoreable("dispatched"), false);
  });
});
