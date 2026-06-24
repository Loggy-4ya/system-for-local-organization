/**
 * @fileoverview Unit tests for Puck page path helpers.
 *
 * Module under test: shared/lib/pagePathLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-path-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composePageAddress,
  composeNewPageAddressSlug,
  computePagePathForUncategorizedMove,
  derivePageSlugFromTitle,
  filterPagePathCatalog,
  formatPageDomainLabel,
  formatPagePathLabel,
  discoverPagePathDomainsFromPaths,
  mergePagePathDomains,
  normalizePagePath,
  pagePathBelongsToDomain,
  pagePathToSlug,
  slugifyPageTitleToSlugSegment,
  splitPageAddress,
  toPagePathCatalogEntries,
} from "@shared/lib/pagePathLogic";
import {
  applyPagePathDomainVisibility,
  appendCustomPagePathDomain,
  appendHiddenPagePathDomain,
  validatePagePathDomainSegment,
} from "@shared/lib/pagePathDomainListLogic";

describe("normalizePagePath", () => {
  it("normalises slug fragments", () => {
    assert.equal(normalizePagePath("News"), "/news");
    assert.equal(normalizePagePath("/Surveys/Q1"), "/surveys/q1");
  });

  it("returns homepage path for empty input", () => {
    assert.equal(normalizePagePath(""), "/");
  });
});

describe("formatPagePathLabel", () => {
  it("returns badge labels with leading slash", () => {
    assert.equal(formatPagePathLabel("/news"), "/news");
    assert.equal(formatPagePathLabel("surveys"), "/surveys");
  });
});

describe("pagePathToSlug", () => {
  it("strips the leading slash", () => {
    assert.equal(pagePathToSlug("/news"), "news");
    assert.equal(pagePathToSlug("/"), "");
  });
});

describe("page address parts", () => {
  it("composes and splits domain + page slug", () => {
    assert.equal(composePageAddress("news", "spring-fair"), "news/spring-fair");
    assert.deepEqual(splitPageAddress("news/spring-fair", ["news", "surveys"]), {
      domain: "news",
      pageSlug: "spring-fair",
    });
  });

  it("treats known single segments as domain-only paths", () => {
    assert.deepEqual(splitPageAddress("news", ["news", "surveys"]), {
      domain: "news",
      pageSlug: "",
    });
  });

  it("keeps legacy flat slugs as page slug only", () => {
    assert.deepEqual(splitPageAddress("test1", ["news", "surveys"]), {
      domain: "",
      pageSlug: "test1",
    });
  });

  it("formats domain badge labels", () => {
    assert.equal(formatPageDomainLabel("news"), "/news");
  });

  it("slugifies titles into page slug segments", () => {
    assert.equal(slugifyPageTitleToSlugSegment("Spring Fair 2026"), "spring-fair-2026");
    assert.equal(slugifyPageTitleToSlugSegment("  "), "");
  });

  it("derives combined slugs from titles while preserving domain", () => {
    assert.equal(
      derivePageSlugFromTitle("Spring Fair", "news/old-title", ["news", "surveys"]),
      "news/spring-fair",
    );
    assert.equal(derivePageSlugFromTitle("About Us", "legacy-slug", ["news"]), "about-us");
  });

  it("merges default and discovered domains", () => {
    assert.deepEqual(mergePagePathDomains(["events", "news"]), ["events", "news", "surveys"]);
  });

  it("discovers domains only from multi-segment paths", () => {
    assert.deepEqual(
      discoverPagePathDomainsFromPaths(["/news", "/news/spring-fair", "/the-page", "/surveys/q1"]),
      ["news", "surveys"],
    );
    assert.deepEqual(discoverPagePathDomainsFromPaths(["/the-page", "/about"]), []);
  });
});

describe("page path domain visibility", () => {
  it("hides domains unless the active page still needs them", () => {
    assert.deepEqual(
      applyPagePathDomainVisibility(["events", "news", "surveys"], ["surveys"], ["surveys"]),
      ["events", "news", "surveys"],
    );
    assert.deepEqual(
      applyPagePathDomainVisibility(["events", "news", "surveys"], ["surveys"], []),
      ["events", "news"],
    );
  });

  it("appends hidden domains without duplicates", () => {
    assert.deepEqual(appendHiddenPagePathDomain(["news"], "Surveys"), ["news", "surveys"]);
    assert.deepEqual(appendHiddenPagePathDomain(["news", "surveys"], "news"), ["news", "surveys"]);
  });

  it("appends custom domains without duplicates", () => {
    assert.deepEqual(appendCustomPagePathDomain(["news"], "Events"), ["events", "news"]);
  });

  it("rejects reserved domain segments", () => {
    const adminResult = validatePagePathDomainSegment("admin");
    assert.equal(adminResult.valid, false);
    assert.match(adminResult.error ?? "", /reserved/i);

    const usersResult = validatePagePathDomainSegment("users");
    assert.equal(usersResult.valid, false);
    assert.match(usersResult.error ?? "", /reserved/i);
  });
});

describe("pagePathBelongsToDomain", () => {
  it("matches domain root and child paths", () => {
    assert.equal(pagePathBelongsToDomain("/news", "news"), true);
    assert.equal(pagePathBelongsToDomain("/news/spring-fair", "news"), true);
    assert.equal(pagePathBelongsToDomain("/surveys/poll", "news"), false);
  });
});

describe("composeNewPageAddressSlug", () => {
  it("builds domain child paths and flat slugs", () => {
    assert.equal(composeNewPageAddressSlug("news", "spring-fair"), "news/spring-fair");
    assert.equal(composeNewPageAddressSlug("", "spring-fair"), "spring-fair");
  });
});

describe("computePagePathForUncategorizedMove", () => {
  it("flattens child pages and keeps domain root slug", () => {
    const domains = ["news", "surveys"];
    assert.equal(
      computePagePathForUncategorizedMove("/news/spring-fair", "news", domains),
      "/spring-fair",
    );
    assert.equal(computePagePathForUncategorizedMove("/news", "news", domains), "/news");
    assert.equal(
      computePagePathForUncategorizedMove("/surveys/poll", "news", domains),
      "",
    );
  });
});

describe("filterPagePathCatalog", () => {
  const catalog = toPagePathCatalogEntries([
    { _id: { toString: () => "1" }, path: "/news", title: "News" },
    { _id: { toString: () => "2" }, path: "/surveys", title: "Surveys" },
  ]);

  it("filters by title and excludes paths", () => {
    const rows = filterPagePathCatalog("survey", catalog, ["/surveys"]);
    assert.equal(rows.length, 0);
    const matches = filterPagePathCatalog("survey", catalog);
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.path, "/surveys");
  });
});

describe("toPagePathCatalogEntries", () => {
  it("skips homepage rows", () => {
    const rows = toPagePathCatalogEntries([
      { _id: { toString: () => "1" }, path: "/", title: "Home" },
      { _id: { toString: () => "2" }, path: "/news", title: "News" },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.label, "/news");
  });
});
