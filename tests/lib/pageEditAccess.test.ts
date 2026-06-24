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
  canUserEditPageDoc,
  canViewUnpublishedPage,
  isPuckManagedPagePath,
  resolvePageEditHref,
  resolveUnauthorizedEditorRedirectPath,
  shouldShowPageEditFab,
} from "@/lib/pageEditAccess";
import { isPuckEditorRoutePath } from "@/components/puck/lib/pageSlugValidation";

function sessionWithRole(role: string, id = "user-1"): Session {
  return {
    user: {
      id,
      role,
      name: "Editor",
      email: "editor@test.local",
    },
    expires: "2099-01-01",
  };
}

describe("isPuckManagedPagePath", () => {
  it("matches any Puck slug except the code-only homepage", () => {
    assert.equal(isPuckManagedPagePath("/news"), true);
    assert.equal(isPuckManagedPagePath("/"), false);
  });
});

describe("canUserEditPageDoc", () => {
  it("allows global admins on any page", () => {
    const session = sessionWithRole("Admin");
    assert.equal(
      canUserEditPageDoc(session, ["pages.edit_own"], {
        authorUserId: "other",
        delegatedEditorUserIds: [],
      }),
      true,
    );
  });

  it("allows authors with pages.edit_own", () => {
    const session = sessionWithRole("Student", "author-1");
    assert.equal(
      canUserEditPageDoc(session, ["pages.edit_own"], {
        authorUserId: "author-1",
        delegatedEditorUserIds: [],
      }),
      true,
    );
  });
});

describe("canViewUnpublishedPage", () => {
  it("allows editors and global admins to preview drafts", () => {
    const admin = sessionWithRole("Admin");
    assert.equal(canViewUnpublishedPage(admin, false), true);
    assert.equal(canViewUnpublishedPage(null, true), true);
    assert.equal(canViewUnpublishedPage(null, false), false);
  });
});

describe("shouldShowPageEditFab", () => {
  it("shows when canEdit and hides in edit mode", () => {
    assert.equal(shouldShowPageEditFab(true, "/news", false), true);
    assert.equal(shouldShowPageEditFab(true, "/news", true), false);
    assert.equal(shouldShowPageEditFab(false, "/news", false), false);
  });
});

describe("resolvePageEditHref", () => {
  it("returns edit URL for Puck pages when the user can edit", () => {
    assert.equal(resolvePageEditHref("/news", true), "/news/edit");
  });
});

describe("resolveUnauthorizedEditorRedirectPath", () => {
  it("returns the viewer path without the edit suffix", () => {
    assert.equal(resolveUnauthorizedEditorRedirectPath("/news"), "/news");
    assert.equal(resolveUnauthorizedEditorRedirectPath("/about/team"), "/about/team");
  });
});

describe("isPuckEditorRoutePath", () => {
  it("hides chrome only on Puck CMS editor routes", () => {
    assert.equal(isPuckEditorRoutePath("/news/edit"), true);
    assert.equal(isPuckEditorRoutePath("/pages/edit"), false);
    assert.equal(isPuckEditorRoutePath("/pages/categories/edit"), false);
    assert.equal(isPuckEditorRoutePath("/pages/categories"), false);
  });
});
