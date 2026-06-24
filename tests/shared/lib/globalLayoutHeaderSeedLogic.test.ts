/**
 * @fileoverview Unit tests for default global layout header seeding fingerprints.
 *
 * Module under test: shared/lib/globalLayoutHeaderSeedLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:global-layout-header-seed`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_HEADER_CATEGORIES } from "@shared/constants/globalLayout";
import {
  cloneDefaultHeaderCategories,
  isCurrentDefaultHeaderCategories,
  isLegacyFactoryHeaderCategories,
  isSupersededTwoCategoryHeaderSeed,
  shouldApplyDefaultHeaderCategories,
} from "@shared/lib/globalLayoutHeaderSeedLogic";

describe("globalLayoutHeaderSeedLogic", () => {
  it("detects the retired factory Explore/Manage preset", () => {
    assert.equal(
      isLegacyFactoryHeaderCategories([
        {
          id: "explore",
          label: "Explore",
          items: [
            { id: "pages-catalog", href: "/pages/categories", label: "Pages" },
            { id: "news", href: "/news", label: "News" },
            { id: "council-apply", href: "/council-apply", label: "Council Apply" },
            { id: "propose-activity", href: "/propose-activity", label: "Propose Activity" },
          ],
        },
        {
          id: "manage",
          label: "Manage",
          align: "end",
          adminOnly: true,
          items: [
            { id: "pages", href: "/pages", label: "Create Page" },
            { id: "admin", href: "/admin", label: "Administration", adminOnly: true },
          ],
        },
      ]),
      true,
    );
  });

  it("detects the superseded two-category seed", () => {
    assert.equal(
      isSupersededTwoCategoryHeaderSeed([
        {
          id: "explore",
          label: "Explore",
          items: [
            { id: "home", href: "/", label: "Home" },
            { id: "pages-catalog", href: "/pages", label: "Browse Pages" },
            { id: "news", href: "/news", label: "News" },
            { id: "tasks", href: "/tasks", label: "Tasks" },
          ],
        },
        {
          id: "manage",
          label: "Manage",
          align: "end",
          adminOnly: true,
          items: [
            { id: "page-manager", href: "/pages/edit", label: "Page Manager" },
            { id: "admin", href: "/admin", label: "Administration", adminOnly: true },
          ],
        },
      ]),
      true,
    );
  });

  it("migrates Explore-only stubs and empty categories", () => {
    assert.equal(shouldApplyDefaultHeaderCategories([]), true);
    assert.equal(
      shouldApplyDefaultHeaderCategories([
        {
          id: "explore",
          label: "Explore",
          items: [{ id: "news", href: "/pages/category", label: "News" }],
        },
      ]),
      true,
    );
  });

  it("does not treat customized navigation as legacy", () => {
    assert.equal(
      shouldApplyDefaultHeaderCategories([
        {
          id: "custom",
          label: "Custom",
          items: [{ id: "home", href: "/", label: "Home" }],
        },
      ]),
      false,
    );
  });

  it("recognizes the current premade default seed", () => {
    assert.equal(isCurrentDefaultHeaderCategories(DEFAULT_HEADER_CATEGORIES), true);
    assert.equal(shouldApplyDefaultHeaderCategories(DEFAULT_HEADER_CATEGORIES), false);
  });

  it("clones the current premade default categories", () => {
    const cloned = cloneDefaultHeaderCategories();

    assert.equal(cloned.length, 3);
    assert.equal(cloned[0]?.id, "explore");
    assert.equal(cloned[1]?.id, "workspace");
    assert.equal(cloned[2]?.id, "administration");
    assert.notEqual(cloned, DEFAULT_HEADER_CATEGORIES);
  });
});
