/**
 * @fileoverview Unit tests for page categories hub logic.
 *
 * Module under test: shared/lib/pageCategoriesHubLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-categories-hub-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDefaultHubSectionsForDomains,
  buildNewsCatalogPageCard,
  collectPublicationImageUrls,
  listAutoPublishedPagePathsUnderDomain,
  listUnusedPagePathDomains,
  normalizePageCategoryHubSections,
  normalizePageGalleryImages,
  resolveEffectiveHubSectionPagePaths,
  resolveHubSectionDisplayLabel,
} from "@shared/lib/pageCategoriesHubLogic";

describe("collectPublicationImageUrls", () => {
  it("orders cover first then gallery without duplicates", () => {
    assert.deepEqual(
      collectPublicationImageUrls("/cover.jpg", ["/gallery-1.jpg", "/cover.jpg", "/gallery-2.jpg"]),
      ["/cover.jpg", "/gallery-1.jpg", "/gallery-2.jpg"],
    );
  });
});

describe("normalizePageCategoryHubSections", () => {
  it("accepts only domains present in the visible domain catalog", () => {
    const sections = normalizePageCategoryHubSections(
      [
        {
          id: "a",
          domain: "news",
          pagePaths: ["/news/fair", "/surveys/poll"],
          cardLayout: "featured-grid",
          imagesPerCard: 2,
        },
        {
          id: "b",
          domain: "unknown",
          pagePaths: ["/other"],
        },
      ],
      ["news", "surveys"],
    );

    assert.equal(sections.length, 1);
    assert.equal(sections[0]?.domain, "news");
    assert.deepEqual(sections[0]?.pagePaths, ["/news/fair"]);
    assert.equal(sections[0]?.cardLayout, "featured-grid");
    assert.equal(sections[0]?.imagesPerCard, 2);
  });

  it("migrates legacy categoryLabel rows when they match a domain segment", () => {
    const sections = normalizePageCategoryHubSections(
      [
        {
          id: "legacy",
          categoryLabel: "News",
          pagePaths: ["/news/fair"],
        },
      ],
      ["news"],
    );

    assert.equal(sections.length, 1);
    assert.equal(sections[0]?.domain, "news");
  });
});

describe("listUnusedPagePathDomains", () => {
  it("excludes domains already assigned to a section", () => {
    const unused = listUnusedPagePathDomains(["news", "surveys"], [
      {
        id: "a",
        domain: "news",
        pagePaths: [],
        cardLayout: "uniform-grid",
        imagesPerCard: 1,
      },
    ]);

    assert.deepEqual(unused, ["surveys"]);
  });
});

describe("resolveHubSectionDisplayLabel", () => {
  it("prefers the domain root page title", () => {
    assert.equal(resolveHubSectionDisplayLabel("news", "Institutional News"), "Institutional News");
  });

  it("capitalises the domain when no root title exists", () => {
    assert.equal(resolveHubSectionDisplayLabel("surveys", null), "Surveys");
  });
});

describe("listAutoPublishedPagePathsUnderDomain", () => {
  it("lists published child pages newest first and skips the domain root", () => {
    const paths = listAutoPublishedPagePathsUnderDomain(
      [
        {
          path: "/news",
          title: "News",
          published: true,
          publishAt: "2026-06-01T00:00:00.000Z",
        },
        {
          path: "/news/older",
          title: "Older",
          published: true,
          publishAt: "2026-06-01T00:00:00.000Z",
        },
        {
          path: "/news/newer",
          title: "Newer",
          published: true,
          publishAt: "2026-06-20T00:00:00.000Z",
        },
        {
          path: "/news/draft",
          title: "Draft",
          published: false,
          publishAt: null,
        },
      ],
      "news",
    );

    assert.deepEqual(paths, ["/news/newer", "/news/older"]);
  });
});

describe("resolveEffectiveHubSectionPagePaths", () => {
  it("prefers curated paths when present", () => {
    const known = new Set(["/news/a", "/news/b"]);
    const pages = [
      { path: "/news/a", title: "A", published: true, publishAt: null },
      { path: "/news/b", title: "B", published: true, publishAt: null },
    ];

    const resolved = resolveEffectiveHubSectionPagePaths(
      { domain: "news", pagePaths: ["/news/b", "/news/a"] },
      pages,
      known,
    );

    assert.deepEqual(resolved, ["/news/b", "/news/a"]);
  });

  it("auto-discovers published pages when curation is empty", () => {
    const known = new Set(["/news/item"]);
    const pages = [{ path: "/news/item", title: "Item", published: true, publishAt: null }];

    const resolved = resolveEffectiveHubSectionPagePaths(
      { domain: "news", pagePaths: [] },
      pages,
      known,
    );

    assert.deepEqual(resolved, ["/news/item"]);
  });
});

describe("buildDefaultHubSectionsForDomains", () => {
  it("creates one default section per domain", () => {
    const sections = buildDefaultHubSectionsForDomains(["news", "surveys"]);
    assert.equal(sections.length, 2);
    assert.equal(sections[0]?.domain, "news");
    assert.equal(sections[1]?.domain, "surveys");
  });
});

describe("buildNewsCatalogPageCard", () => {
  it("limits images to imagesPerCard", () => {
    const card = buildNewsCatalogPageCard(
      {
        path: "/news/fair",
        title: "Spring Fair",
        description: "Details",
        coverImage: "/1.jpg",
        galleryImages: ["/2.jpg", "/3.jpg"],
        categories: ["News"],
        publishAt: "2026-06-20T12:00:00.000Z",
      },
      2,
    );

    assert.ok(card);
    assert.deepEqual(card?.images, ["/1.jpg", "/2.jpg"]);
  });
});

describe("normalizePageGalleryImages", () => {
  it("caps gallery uploads at three entries", () => {
    assert.deepEqual(
      normalizePageGalleryImages(["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"]),
      ["/a.jpg", "/b.jpg", "/c.jpg"],
    );
  });
});
