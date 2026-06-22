/**
 * @fileoverview Unit tests for institutional calendar scheduling helpers.
 *
 * Run: `npm run test:institutional-calendar-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/institutionalCalendarLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeNextYearlyAnchorAt,
  normalizeYearlyAnchors,
  userMatchesInstitutionalCalendarTarget,
  interpolateInstitutionalCalendarTemplate,
} from "@shared/lib/institutionalCalendarLogic";

describe("institutionalCalendarLogic", () => {
  it("normalizes yearly anchors", () => {
    const anchors = normalizeYearlyAnchors([
      { month: 6, day: 1, atTime: "09:00" },
      { month: 6, day: 1, atTime: "09:00" },
      { month: 12, day: 25, atTime: "10:00" },
    ]);
    assert.equal(anchors.length, 2);
    assert.equal(anchors[0].month, 6);
  });

  it("computes next yearly fire after reference date", () => {
    const anchors = normalizeYearlyAnchors([{ month: 6, day: 15, atTime: "09:00" }]);
    const after = new Date("2026-03-01T12:00:00Z");
    const next = computeNextYearlyAnchorAt(anchors, after);
    assert.ok(next);
    assert.equal(next!.getFullYear(), 2026);
    assert.equal(next!.getMonth(), 5);
    assert.equal(next!.getDate(), 15);
  });

  it("matches socium and access filters together", () => {
    const user = {
      userId: "u1",
      accessLevelIndex: 2 as const,
      sociumRoles: [{ kind: "self_government_head" as const, roleKey: "head" }],
    };
    assert.equal(
      userMatchesInstitutionalCalendarTarget(user, {
        targetSociumKinds: ["self_government_head"],
        targetSociumRoleKeys: [],
        targetAccessLevelIndexes: [2],
      }),
      true,
    );
    assert.equal(
      userMatchesInstitutionalCalendarTarget(user, {
        targetSociumKinds: ["self_government_head"],
        targetSociumRoleKeys: [],
        targetAccessLevelIndexes: [6],
      }),
      false,
    );
  });

  it("interpolates year token in templates", () => {
    assert.equal(
      interpolateInstitutionalCalendarTemplate("Report {year}", 2026),
      "Report 2026",
    );
  });
});
