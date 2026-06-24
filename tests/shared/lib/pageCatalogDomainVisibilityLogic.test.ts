/**
 * @fileoverview Tests for pages catalog domain visibility helpers.
 *
 * Run: `npm run test:page-catalog-domain-visibility-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/pageCatalogDomainVisibilityLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPageCatalogVisibilitySelectOptions,
  canViewerSeePageCatalogDomainSection,
  decodePageCatalogVisibilitySelectValue,
  encodePageCatalogVisibilitySelectValue,
  normalizePageCatalogDomainVisibility,
} from "../../../shared/lib/pageCatalogDomainVisibilityLogic";

describe("normalizePageCatalogDomainVisibility", () => {
  it("defaults to public visibility", () => {
    assert.deepEqual(normalizePageCatalogDomainVisibility(undefined), {
      catalogVisibility: "public",
      catalogVisibleThroughLevel: 6,
    });
  });

  it("preserves hidden and level modes", () => {
    assert.deepEqual(
      normalizePageCatalogDomainVisibility({
        catalogVisibility: "hidden",
        catalogVisibleThroughLevel: 2,
      }),
      {
        catalogVisibility: "hidden",
        catalogVisibleThroughLevel: 2,
      },
    );
    assert.deepEqual(
      normalizePageCatalogDomainVisibility({
        catalogVisibility: "level",
        catalogVisibleThroughLevel: 3,
      }),
      {
        catalogVisibility: "level",
        catalogVisibleThroughLevel: 3,
      },
    );
  });
});

describe("encode/decodePageCatalogVisibilitySelectValue", () => {
  it("round-trips public, hidden, and level values", () => {
    assert.equal(encodePageCatalogVisibilitySelectValue({ catalogVisibility: "public" }), "public");
    assert.equal(encodePageCatalogVisibilitySelectValue({ catalogVisibility: "hidden" }), "hidden");
    assert.equal(
      encodePageCatalogVisibilitySelectValue({
        catalogVisibility: "level",
        catalogVisibleThroughLevel: 2,
      }),
      "level:2",
    );

    assert.deepEqual(decodePageCatalogVisibilitySelectValue("public"), {
      catalogVisibility: "public",
      catalogVisibleThroughLevel: 6,
    });
    assert.deepEqual(decodePageCatalogVisibilitySelectValue("hidden"), {
      catalogVisibility: "hidden",
      catalogVisibleThroughLevel: 6,
    });
    assert.deepEqual(decodePageCatalogVisibilitySelectValue("level:1"), {
      catalogVisibility: "level",
      catalogVisibleThroughLevel: 1,
    });
  });
});

describe("canViewerSeePageCatalogDomainSection", () => {
  it("hides hidden sections from everyone", () => {
    assert.equal(
      canViewerSeePageCatalogDomainSection({ catalogVisibility: "hidden" }, 0),
      false,
    );
    assert.equal(
      canViewerSeePageCatalogDomainSection({ catalogVisibility: "hidden" }, null),
      false,
    );
  });

  it("shows public sections to anonymous visitors", () => {
    assert.equal(
      canViewerSeePageCatalogDomainSection({ catalogVisibility: "public" }, null),
      true,
    );
  });

  it("gates level sections by hierarchy index", () => {
    const fields = {
      catalogVisibility: "level" as const,
      catalogVisibleThroughLevel: 3 as const,
    };

    assert.equal(canViewerSeePageCatalogDomainSection(fields, null), false);
    assert.equal(canViewerSeePageCatalogDomainSection(fields, 4), false);
    assert.equal(canViewerSeePageCatalogDomainSection(fields, 3), true);
    assert.equal(canViewerSeePageCatalogDomainSection(fields, 0), true);
  });
});

describe("buildPageCatalogVisibilitySelectOptions", () => {
  it("includes public, hidden, and hierarchy tiers", () => {
    const options = buildPageCatalogVisibilitySelectOptions();
    assert.ok(options.some((option) => option.value === "public" && option.label === "Everyone"));
    assert.ok(options.some((option) => option.value === "hidden" && option.label === "Hidden"));
    assert.ok(options.some((option) => option.value === "level:0" && option.label.includes("Sys admin")));
  });
});
