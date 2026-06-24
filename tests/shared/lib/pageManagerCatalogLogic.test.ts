/**
 * @fileoverview Tests for Page Manager catalog drag and domain-move helpers.
 *
 * Run: `npm run test:page-manager-catalog-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * Tests: `shared/lib/pageManagerCatalogLogic.ts`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePagePathForDomainMove,
  moveManagerCatalogPage,
  reorderManagerCatalogSections,
  resolveManagerEditorHubSections,
} from "@shared/lib/pageManagerCatalogLogic";
import { PAGE_CATALOG_UNCATEGORIZED_DOMAIN } from "@shared/constants/pageCategoriesHub";
import type { ManagerCatalogSection } from "@shared/constants/pageCategoriesHub";

const sampleSections: ManagerCatalogSection[] = [
  {
    id: "news",
    domain: "news",
    sectionLabel: "News",
    pages: [
      {
        path: "/news/a",
        href: "/news/a",
        title: "A",
        description: "",
        images: [],
        cardVariant: "tile",
        publishDate: "",
        authorDisplayName: null,
        categories: [],
        published: true,
      },
      {
        path: "/news/b",
        href: "/news/b",
        title: "B",
        description: "",
        images: [],
        cardVariant: "tile",
        publishDate: "",
        authorDisplayName: null,
        categories: [],
        published: false,
      },
    ],
  },
  {
    id: "surveys",
    domain: "surveys",
    sectionLabel: "Surveys",
    pages: [],
  },
];

describe("pageManagerCatalogLogic", () => {
  it("reorders pages within a section", () => {
    const result = moveManagerCatalogPage(
      sampleSections,
      { sectionId: "news", pageIndex: 0 },
      { sectionId: "news", pageIndex: 1, position: "after" },
      ["news", "surveys"],
    );

    assert.equal(result.crossDomainMove, null);
    assert.deepEqual(result.sections[0]?.pages.map((page) => page.path), ["/news/b", "/news/a"]);
  });

  it("returns cross-domain confirmation when domains differ", () => {
    const result = moveManagerCatalogPage(
      sampleSections,
      { sectionId: "news", pageIndex: 0 },
      { sectionId: "surveys", pageIndex: 0, position: "before" },
      ["news", "surveys"],
    );

    assert.ok(result.crossDomainMove);
    assert.equal(result.crossDomainMove?.newPath, "/surveys/a");
  });

  it("computes destination paths for domain moves", () => {
    assert.equal(
      computePagePathForDomainMove("/news/spring-fair", "surveys", ["news", "surveys"]),
      "/surveys/spring-fair",
    );
  });

  it("reorders domain sections", () => {
    const next = reorderManagerCatalogSections(sampleSections, 0, 1, "after");
    assert.equal(next[0]?.id, "surveys");
    assert.equal(next[1]?.id, "news");
  });
});

describe("resolveManagerEditorHubSections", () => {
  it("does not auto-insert empty path domains for the editor", () => {
    const sections = resolveManagerEditorHubSections(
      [{ id: "news", domain: "news", pagePaths: [] }],
      ["news", "surveys"],
      [],
    );
    assert.equal(sections.length, 1);
    assert.equal(sections[0]?.domain, "news");
  });

  it("auto-inserts domains that already have pages", () => {
    const sections = resolveManagerEditorHubSections(
      [{ id: "news", domain: "news", pagePaths: [] }],
      ["news", "surveys"],
      [{ path: "/surveys/q1", title: "Q1", published: true }],
    );
    assert.equal(sections.some((section) => section.domain === "surveys"), true);
  });

  it("appends uncategorized when flat pages exist", () => {
    const sections = resolveManagerEditorHubSections(
      [{ id: "news", domain: "news", pagePaths: [] }],
      ["news"],
      [{ path: "/first-page", title: "First", published: true }],
    );
    assert.equal(sections.some((section) => section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN), true);
  });
});
