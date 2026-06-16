/**
 * @fileoverview Tests for Puck page edit FAB visibility rules.
 *
 * Module under test: src/lib/pageEditAccess.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-edit-access`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Session } from "next-auth";

import {
  canEditPages,
  isPuckManagedPagePath,
  resolvePageEditHref,
  shouldShowPageEditFab,
} from "@/lib/pageEditAccess";

function sessionWithRole(role: string): Session {
  return {
    user: {
      id: "user-1",
      role,
      name: "Editor",
      email: "editor@test.local",
    },
    expires: "2099-01-01",
  };
}

describe("canEditPages", () => {
  it("allows Admin and StudentCouncil", () => {
    assert.equal(canEditPages("Admin"), true);
    assert.equal(canEditPages("StudentCouncil"), true);
  });

  it("denies Student and missing role", () => {
    assert.equal(canEditPages("Student"), false);
    assert.equal(canEditPages(undefined), false);
    assert.equal(canEditPages(null), false);
  });
});

describe("isPuckManagedPagePath", () => {
  it("matches any Puck slug except the code-only homepage", () => {
    assert.equal(isPuckManagedPagePath("/news"), true);
    assert.equal(isPuckManagedPagePath("/news/spring-festival"), true);
    assert.equal(isPuckManagedPagePath("/about"), true);
    assert.equal(isPuckManagedPagePath("/council/apply"), true);
  });

  it("rejects the homepage and empty path", () => {
    assert.equal(isPuckManagedPagePath("/"), false);
    assert.equal(isPuckManagedPagePath(""), false);
  });
});

describe("shouldShowPageEditFab", () => {
  it("shows on published Puck pages for editors", () => {
    assert.equal(
      shouldShowPageEditFab(sessionWithRole("Admin"), "/news", false),
      true,
    );
    assert.equal(
      shouldShowPageEditFab(sessionWithRole("StudentCouncil"), "/about", false),
      true,
    );
  });

  it("hides in edit mode, on the homepage, and for students", () => {
    assert.equal(
      shouldShowPageEditFab(sessionWithRole("Admin"), "/news", true),
      false,
    );
    assert.equal(
      shouldShowPageEditFab(sessionWithRole("Admin"), "/", false),
      false,
    );
    assert.equal(
      shouldShowPageEditFab(sessionWithRole("Student"), "/news", false),
      false,
    );
    assert.equal(shouldShowPageEditFab(null, "/news", false), false);
  });
});

describe("resolvePageEditHref", () => {
  it("returns edit URL for Puck pages when the user can edit", () => {
    assert.equal(resolvePageEditHref("/news", true), "/news/edit");
    assert.equal(resolvePageEditHref("/about/team", true), "/about/team/edit");
  });

  it("returns null when editing is not allowed or path is excluded", () => {
    assert.equal(resolvePageEditHref("/news", false), null);
    assert.equal(resolvePageEditHref("/", true), null);
    assert.equal(resolvePageEditHref("/news/edit", true), null);
    assert.equal(resolvePageEditHref("", true), null);
  });
});
