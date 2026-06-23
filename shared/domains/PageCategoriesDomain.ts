/**
 * @fileoverview Consolidated domain engine for the page categories hub / news catalog.
 *
 * @module shared/domains/PageCategoriesDomain
 *
 * Tests: `npm run test:page-categories-hub-logic`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import {
  PAGE_CATEGORIES_SETTINGS_ID,
  type NewsCatalogHubPayload,
  type PageCategoriesHubConfig,
  type PageCategoryHubSection,
  type PagePathDomainCatalogEntry,
} from "@shared/constants/pageCategoriesHub";
import {
  buildDefaultHubSectionsForDomains,
  buildNewsCatalogPageCard,
  normalizePageCategoryHubSections,
  resolveEffectiveHubSectionPagePaths,
  resolveHubSectionDisplayLabel,
  type PageCategoryHubPageSource,
  type PageCategoryHubSectionInput,
} from "@shared/lib/pageCategoriesHubLogic";
import { isPagePubliclyVisible } from "@shared/lib/pagePublicationLogic";
import {
  formatPageDomainLabel,
  normalizePageDomainSegment,
  pagePathBelongsToDomain,
} from "@shared/lib/pagePathLogic";
import Page from "@shared/models/Page";
import PageCategoriesSettings, {
  type IPageCategoriesSettings,
} from "@shared/models/PageCategoriesSettings";
import User from "@shared/models/User";
import { PageDomain } from "@shared/domains/PageDomain";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";

/** Partial update payload from admin POST. */
export interface PageCategoriesHubUpdateInput {
  sections?: Array<PageCategoryHubSectionInput>;
}

/**
 * Page Categories Hub domain engine.
 */
export class PageCategoriesDomain {
  /**
   * Load or seed the singleton hub settings document.
   *
   * Uses an atomic upsert so concurrent callers (e.g. parallel page/API requests)
   * cannot trigger duplicate-key errors on the singleton `_id`.
   *
   * @returns Persisted settings row.
   */
  public static async loadOrSeed(): Promise<IPageCategoriesSettings> {
    await connectDB();

    const doc = await PageCategoriesSettings.findOneAndUpdate(
      { _id: PAGE_CATEGORIES_SETTINGS_ID },
      {
        $setOnInsert: {
          sections: [],
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();

    if (doc) {
      return doc;
    }

    const fallback = await PageCategoriesSettings.findById(PAGE_CATEGORIES_SETTINGS_ID).exec();
    if (!fallback) {
      throw new Error("Failed to load or seed page categories hub settings.");
    }

    return fallback;
  }

  /**
   * Convert a MongoDB document into the public admin config DTO.
   *
   * @param doc - Persisted settings document.
   * @returns Serializable config for the admin editor.
   */
  public static toPublicConfig(doc: IPageCategoriesSettings): PageCategoriesHubConfig {
    return {
      sections: (doc.sections ?? []).map((section) => {
        const legacyLabel = (section as PageCategoryHubSection & { categoryLabel?: string })
          .categoryLabel;
        return {
          id: section.id,
          domain: normalizePageDomainSegment(section.domain || legacyLabel || ""),
          pagePaths: [...(section.pagePaths ?? [])],
          cardLayout: section.cardLayout,
          imagesPerCard: section.imagesPerCard,
        };
      }),
    };
  }

  /**
   * List visible path domains with domain root page titles for the hub editor.
   *
   * @returns Sorted domain catalog rows.
   */
  public static async listHubDomainCatalog(): Promise<PagePathDomainCatalogEntry[]> {
    await connectDB();

    const domains = await PageDomain.listPagePathDomains();
    if (domains.length === 0) return [];

    const domainPaths = domains.map((domain) => formatPageDomainLabel(domain));
    const rootPages = await Page.find(
      { path: { $in: domainPaths } },
      { path: 1, title: 1 },
    ).lean();
    const titleByPath = new Map(
      rootPages.map((row) => [row.path, (row.title ?? "").trim() || "Untitled Page"]),
    );

    return domains.map((domain) => {
      const domainPath = formatPageDomainLabel(domain);
      return {
        domain,
        domainPath,
        title: titleByPath.get(domainPath) ?? resolveHubSectionDisplayLabel(domain),
      };
    });
  }

  /**
   * Persist admin hub section updates.
   *
   * @param input - Partial config from the admin editor.
   * @returns Updated settings document.
   */
  public static async update(input: PageCategoriesHubUpdateInput): Promise<IPageCategoriesSettings> {
    await connectDB();

    const availableDomains = await PageDomain.listPagePathDomains();
    const normalizedSections = normalizePageCategoryHubSections(input.sections, availableDomains);

    const doc = await PageCategoriesSettings.findByIdAndUpdate(
      PAGE_CATEGORIES_SETTINGS_ID,
      { $set: { sections: normalizedSections } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();

    if (!doc) {
      throw new Error("Failed to persist page categories hub settings.");
    }

    return doc;
  }

  /**
   * Resolve the public news catalog payload for `/pages/categories`, the hub API, and Puck.
   *
   * Curated `pagePaths` win when present; otherwise all published child pages under each
   * domain are listed automatically (newest first).
   *
   * @returns Sections with hydrated page cards.
   */
  public static async resolveHubPayload(): Promise<NewsCatalogHubPayload> {
    await connectDB();

    const doc = await PageCategoriesDomain.loadOrSeed();
    const availableDomains = await PageDomain.listPagePathDomains();
    let sections = normalizePageCategoryHubSections(doc.sections, availableDomains);

    if (sections.length === 0) {
      sections = buildDefaultHubSectionsForDomains(availableDomains);
    }

    if (sections.length === 0) {
      return { sections: [] };
    }

    const domainPaths = sections.map((section) => formatPageDomainLabel(section.domain));
    const domainRegexes = sections.map((section) => {
      const escaped = section.domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`^/${escaped}(/|$)`);
    });

    const pageDocs = await Page.find(
      {
        $or: [
          { path: { $in: domainPaths } },
          ...domainRegexes.map((pattern) => ({ path: { $regex: pattern } })),
        ],
      },
      {
        path: 1,
        title: 1,
        description: 1,
        coverImage: 1,
        galleryImages: 1,
        categories: 1,
        authorUserId: 1,
        publishAt: 1,
        published: 1,
      },
    ).lean();

    const authorIds = [
      ...new Set(
        pageDocs
          .map((docRow) => (docRow.authorUserId ? String(docRow.authorUserId) : ""))
          .filter(Boolean),
      ),
    ];
    const authors = authorIds.length
      ? await User.find({ _id: { $in: authorIds } }).lean()
      : [];
    const authorNameById = new Map(
      authors.map((user) => [String(user._id), resolveUserDisplayLabel(user)]),
    );

    const pageSources: PageCategoryHubPageSource[] = pageDocs.map((docRow) => ({
      path: docRow.path,
      title: docRow.title,
      description: docRow.description,
      coverImage: docRow.coverImage,
      galleryImages: docRow.galleryImages ?? [],
      categories: docRow.categories ?? [],
      authorDisplayName: docRow.authorUserId
        ? authorNameById.get(String(docRow.authorUserId)) ?? null
        : null,
      publishAt: docRow.publishAt,
      published: docRow.published,
    }));

    const pageByPath = new Map(pageSources.map((row) => [row.path, row]));
    const knownPaths = new Set(pageSources.map((row) => row.path));
    const domainRootTitleByDomain = new Map<string, string>();

    for (const docRow of pageDocs) {
      const domain = normalizePageDomainSegment(docRow.path.replace(/^\//, "").split("/")[0] ?? "");
      const isDomainRoot =
        domain && formatPageDomainLabel(domain) === docRow.path;
      if (isDomainRoot) {
        domainRootTitleByDomain.set(domain, (docRow.title ?? "").trim());
      }
    }

    const resolvedSections = sections.map((section) => {
      const domainPages = pageSources.filter((row) =>
        pagePathBelongsToDomain(row.path, section.domain, availableDomains),
      );
      const pagePaths = resolveEffectiveHubSectionPagePaths(section, domainPages, knownPaths);
      const pages = pagePaths
        .map((pagePath) => {
          const source = pageByPath.get(pagePath);
          if (!source) return null;
          if (
            !isPagePubliclyVisible({
              published: source.published ?? false,
              publishAt: source.publishAt ?? null,
            })
          ) {
            return null;
          }
          return buildNewsCatalogPageCard(source, section.imagesPerCard);
        })
        .filter((card): card is NonNullable<typeof card> => card != null);

      return {
        id: section.id,
        domain: section.domain,
        sectionLabel: resolveHubSectionDisplayLabel(
          section.domain,
          domainRootTitleByDomain.get(section.domain),
        ),
        cardLayout: section.cardLayout,
        imagesPerCard: section.imagesPerCard,
        pages,
      };
    });

    return { sections: resolvedSections.filter((section) => section.pages.length > 0) };
  }
}

export default PageCategoriesDomain;
