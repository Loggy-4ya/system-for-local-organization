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
  type ManagerCatalogPayload,
  type PageCategoriesHubConfig,
  type PageCategoryHubSection,
  type PagePathDomainCatalogEntry,
} from "@shared/constants/pageCategoriesHub";
import {
  buildDefaultHubSectionsForDomains,
  buildNewsCatalogPageCard,
  ensureHubSectionsCoverDomains,
  normalizeNewsCatalogImagesPerCard,
  normalizeNewsCatalogPageCardVariant,
  normalizePageCategoryHubSections,
  resolveEffectiveHubSectionPagePaths,
  resolveHubSectionDisplayLabel,
  resolvePageCatalogSectionLabel,
  type PageCategoryHubPageSource,
  type PageCategoryHubSectionInput,
} from "@shared/lib/pageCategoriesHubLogic";
import {
  buildManagerCatalogSections,
  buildUncategorizedHubSection,
  resolveManagerEditorHubSections,
} from "@shared/lib/pageManagerCatalogLogic";
import { canViewerSeePageCatalogDomainSection } from "@shared/lib/pageCatalogDomainVisibilityLogic";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import {
  PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
  PAGE_CATALOG_UNCATEGORIZED_LABEL,
} from "@shared/constants/pageCategoriesHub";
import { isPagePubliclyVisible } from "@shared/lib/pagePublicationLogic";
import {
  formatPageDomainLabel,
  normalizePageDomainSegment,
  normalizePagePath,
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
   * Load all Puck pages (except homepage) for catalog hydration.
   *
   * @returns Page source rows and author display names.
   */
  private static async loadCatalogPageSources(): Promise<{
    pageSources: PageCategoryHubPageSource[];
    domainRootTitleByDomain: Map<string, string>;
  }> {
    const pageDocs = await Page.find(
      { path: { $ne: "/" } },
      {
        path: 1,
        title: 1,
        description: 1,
        coverImage: 1,
        galleryImages: 1,
        catalogImagesPerCard: 1,
        catalogCardVariant: 1,
        categories: 1,
        authorUserId: 1,
        publishAt: 1,
        published: 1,
        updatedAt: 1,
      },
    )
      .sort({ updatedAt: -1 })
      .lean();

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
      catalogImagesPerCard: normalizeNewsCatalogImagesPerCard(docRow.catalogImagesPerCard),
      catalogCardVariant: normalizeNewsCatalogPageCardVariant(docRow.catalogCardVariant),
      categories: docRow.categories ?? [],
      authorDisplayName: docRow.authorUserId
        ? authorNameById.get(String(docRow.authorUserId)) ?? null
        : null,
      publishAt: docRow.publishAt,
      published: docRow.published,
      updatedAt: docRow.updatedAt,
    }));

    const domainRootTitleByDomain = new Map<string, string>();
    for (const docRow of pageDocs) {
      const domain = normalizePageDomainSegment(docRow.path.replace(/^\//, "").split("/")[0] ?? "");
      const isDomainRoot =
        domain && formatPageDomainLabel(domain) === docRow.path;
      if (isDomainRoot) {
        domainRootTitleByDomain.set(domain, (docRow.title ?? "").trim());
      }
    }

    return { pageSources, domainRootTitleByDomain };
  }

  /**
   * Resolve hub section rows for catalog rendering (all domains + uncategorized when needed).
   *
   * @param doc - Hub settings document.
   * @param availableDomains - Visible path domains.
   * @param pageSources - All loaded pages.
   * @returns Section config rows for hydration.
   */
  private static resolveCatalogHubSections(
    sections: PageCategoryHubSection[],
    availableDomains: readonly string[],
    pageSources: readonly PageCategoryHubPageSource[],
  ): PageCategoryHubSection[] {
    let resolved = ensureHubSectionsCoverDomains(sections, availableDomains);
    if (resolved.length === 0) {
      resolved = buildDefaultHubSectionsForDomains(availableDomains);
    }

    const hasUncategorized = pageSources.some((row) => {
      const path = normalizePagePath(row.path);
      if (!path || path === "/") return false;
      return !availableDomains.some((domain) =>
        pagePathBelongsToDomain(path, domain, availableDomains),
      );
    });

    if (
      hasUncategorized &&
      !resolved.some((section) => section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN)
    ) {
      resolved = [...resolved, buildUncategorizedHubSection()];
    }

    return resolved;
  }

  /**
   * Resolve the public news catalog payload for `/pages`, the hub API, and Puck.
   *
   * Curated `pagePaths` win when present; otherwise all published child pages under each
   * domain are listed automatically (newest first).
   *
   * @param options - Optional viewer access level for catalog visibility filtering.
   * @returns Sections with hydrated page cards.
   */
  public static async resolveHubPayload(options?: {
    viewerAccessLevelIndex?: AccessLevelIndex | null;
  }): Promise<NewsCatalogHubPayload> {
    await connectDB();

    const doc = await PageCategoriesDomain.loadOrSeed();
    const allDomains = await PageDomain.listAllMergedPagePathDomains();
    const normalized = normalizePageCategoryHubSections(doc.sections, allDomains);
    const { pageSources, domainRootTitleByDomain } =
      await PageCategoriesDomain.loadCatalogPageSources();

    const sections = PageCategoriesDomain.resolveCatalogHubSections(
      normalized,
      allDomains,
      pageSources,
    ).filter((section) =>
      canViewerSeePageCatalogDomainSection(section, options?.viewerAccessLevelIndex ?? null),
    );

    if (sections.length === 0) {
      return { sections: [] };
    }

    const pageByPath = new Map(pageSources.map((row) => [normalizePagePath(row.path), row]));
    const knownPaths = new Set(pageSources.map((row) => normalizePagePath(row.path)));

    const resolvedSections = sections.map((section) => {
      const domainPages =
        section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN
          ? pageSources.filter((row) => {
              const path = normalizePagePath(row.path);
              if (!path || path === "/") return false;
              return !allDomains.some((domain) =>
                pagePathBelongsToDomain(path, domain, allDomains),
              );
            })
          : pageSources.filter((row) =>
              pagePathBelongsToDomain(row.path, section.domain, allDomains),
            );
      const pagePaths = resolveEffectiveHubSectionPagePaths(
        section,
        domainPages,
        knownPaths,
        allDomains,
      );
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
          return buildNewsCatalogPageCard(source);
        })
        .filter((card): card is NonNullable<typeof card> => card != null);

      const sectionLabel = resolvePageCatalogSectionLabel(section, domainRootTitleByDomain);

      return {
        id: section.id,
        domain: section.domain,
        sectionLabel,
        pages,
        catalogVisibility: section.catalogVisibility,
        catalogVisibleThroughLevel: section.catalogVisibleThroughLevel,
      };
    });

    return { sections: resolvedSections.filter((section) => section.pages.length > 0) };
  }

  /**
   * Resolve the Page Manager catalog payload for `/pages` (includes drafts).
   *
   * @returns Sections with hydrated manager cards for publishers.
   */
  public static async resolveManagerPayload(): Promise<ManagerCatalogPayload> {
    await connectDB();

    const doc = await PageCategoriesDomain.loadOrSeed();
    const allDomains = await PageDomain.listAllMergedPagePathDomains();
    const normalized = normalizePageCategoryHubSections(doc.sections, allDomains);
    const { pageSources, domainRootTitleByDomain } =
      await PageCategoriesDomain.loadCatalogPageSources();

    const sections = resolveManagerEditorHubSections(
      normalized,
      allDomains,
      pageSources,
    );

    if (sections.length === 0) {
      return { sections: [] };
    }

    const labelByDomain = new Map<string, string>();
    for (const section of sections) {
      if (section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN) continue;
      labelByDomain.set(
        section.domain,
        resolveHubSectionDisplayLabel(
          section.domain,
          domainRootTitleByDomain.get(section.domain),
        ),
      );
    }

    return {
      sections: buildManagerCatalogSections(
        sections,
        pageSources,
        labelByDomain,
        allDomains,
        { includeEmptySections: true },
      ),
    };
  }

  /**
   * List every path domain for the catalog editor (includes institution-hidden labels).
   *
   * @returns Sorted domain segments.
   */
  public static async listAllCatalogDomains(): Promise<string[]> {
    return PageDomain.listAllMergedPagePathDomains();
  }

  /**
   * Remove a catalog path domain: relocate pages to uncategorized paths, hide the
   * domain label, and drop its hub section from MongoDB.
   *
   * @param domain - Path domain segment to delete (not `uncategorized`).
   * @param actorUserId - Admin user performing the removal.
   * @returns Updated visible domains, moved page count, and hub config snapshot.
   */
  public static async removeCatalogDomain(
    domain: string,
    actorUserId: string,
  ): Promise<{
    domains: string[];
    movedCount: number;
    config: PageCategoriesHubConfig;
  }> {
    await connectDB();

    const normalized = normalizePageDomainSegment(domain);
    if (!normalized || normalized === PAGE_CATALOG_UNCATEGORIZED_DOMAIN) {
      throw new Error("Invalid catalog domain.");
    }

    const { movedPages, domains } = await PageDomain.removeCatalogPagePathDomain(
      normalized,
      actorUserId,
    );

    const pathMap = new Map(
      movedPages.map((entry) => [
        normalizePagePath(entry.fromPath),
        normalizePagePath(entry.toPath),
      ]),
    );

    const doc = await PageCategoriesDomain.loadOrSeed();
    const nextSectionsRaw = (doc.sections ?? [])
      .filter((section) => normalizePageDomainSegment(String(section.domain ?? "")) !== normalized)
      .map((section) => ({
        ...section,
        pagePaths: (section.pagePaths ?? []).map((entry) => {
          const key = normalizePagePath(String(entry));
          return pathMap.get(key) ?? String(entry);
        }),
      }));

    const availableDomains = await PageDomain.listPagePathDomains();
    const nextSections = normalizePageCategoryHubSections(nextSectionsRaw, availableDomains);
    const updatedDoc = await PageCategoriesDomain.update({ sections: nextSections });

    const movedCount = movedPages.filter((entry) => entry.fromPath !== entry.toPath).length;

    return {
      domains,
      movedCount,
      config: PageCategoriesDomain.toPublicConfig(updatedDoc),
    };
  }
}

export default PageCategoriesDomain;
