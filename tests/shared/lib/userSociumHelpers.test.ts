/**
 * @fileoverview Unit tests for user socium profile helpers.
 *
 * Module under test: shared/lib/userSociumHelpers.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:user-socium`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInitialStudentSociumState,
  canPublishCommunityContent,
  ensureQualityScoresInitialized,
  formatUserFullName,
  resolveUserDisplayLabel,
  syncSociumRolesFromStudentTitle,
  buildSociumRoleAssignment,
} from "@shared/lib/userSociumHelpers";

describe("formatUserFullName", () => {
  it("combines name and surname", () => {
    assert.equal(formatUserFullName("Ada", "Lovelace"), "Ada Lovelace");
  });

  it("returns name only when surname is null", () => {
    assert.equal(formatUserFullName("Ada", null), "Ada");
  });
});

describe("resolveUserDisplayLabel", () => {
  it("prefers full name over login", () => {
    assert.equal(
      resolveUserDisplayLabel({ name: "Ada", surname: "Lovelace", login: "alovelace" }),
      "Ada Lovelace",
    );
  });

  it("falls back to login when name parts are empty", () => {
    assert.equal(resolveUserDisplayLabel({ name: " ", surname: null, login: "alovelace" }), "alovelace");
  });
});

describe("syncSociumRolesFromStudentTitle", () => {
  it("adds starosta role for Starosta chip", () => {
    const roles = syncSociumRolesFromStudentTitle([], "Starosta");
    assert.ok(roles.some((role) => role.kind === "starosta"));
    assert.ok(roles.some((role) => role.kind === "student"));
  });

  it("adds group_deputy role for Deputy chip", () => {
    const roles = syncSociumRolesFromStudentTitle([], "Deputy");
    assert.ok(roles.some((role) => role.kind === "group_deputy"));
  });

  it("preserves admin-assigned self-government roles", () => {
    const adminRole = buildSociumRoleAssignment({
      roleKey: "self_government_member",
      roleLabel: "Self-Government Member",
      kind: "self_government_member",
      source: "admin",
    });
    const roles = syncSociumRolesFromStudentTitle([adminRole], "Starosta");
    assert.ok(roles.some((role) => role.kind === "self_government_member" && role.source === "admin"));
  });
});

describe("ensureQualityScoresInitialized", () => {
  it("returns null when user is not a self-government member", () => {
    const roles = syncSociumRolesFromStudentTitle([], "Neither");
    assert.equal(ensureQualityScoresInitialized(roles, null), null);
  });

  it("initializes scores for self-government member", () => {
    const roles = [
      buildSociumRoleAssignment({
        roleKey: "self_government_member",
        roleLabel: "Self-Government Member",
        kind: "self_government_member",
        source: "admin",
      }),
    ];
    const scores = ensureQualityScoresInitialized(roles, null);
    assert.ok(scores);
    assert.equal(scores?.averageScore, 0);
    assert.equal(scores?.ratingCount, 0);
  });
});

describe("canPublishCommunityContent", () => {
  it("allows StudentCouncil system role", () => {
    assert.equal(
      canPublishCommunityContent({
        name: "Test",
        surname: null,
        role: "StudentCouncil",
        studentTitle: null,
        sociumRoles: [],
        qualityScores: null,
      }),
      true,
    );
  });

  it("allows self-government socium role", () => {
    assert.equal(
      canPublishCommunityContent({
        name: "Test",
        surname: null,
        role: "Student",
        studentTitle: null,
        sociumRoles: [
          buildSociumRoleAssignment({
            roleKey: "self_government_deputy",
            roleLabel: "Deputy",
            kind: "self_government_deputy",
            source: "admin",
          }),
        ],
        qualityScores: null,
      }),
      true,
    );
  });
});

describe("buildInitialStudentSociumState", () => {
  it("seeds baseline student socium roles on registration", () => {
    const state = buildInitialStudentSociumState("Neither");
    assert.ok(state.sociumRoles.some((role) => role.kind === "student"));
    assert.equal(state.qualityScores, null);
  });
});
