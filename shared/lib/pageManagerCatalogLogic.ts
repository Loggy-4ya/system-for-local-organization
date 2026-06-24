/**
 * @fileoverview Pure helpers for the unified Page Manager catalog (drag, domain moves).
 *
 * Tests: `npm run test:page-manager-catalog-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pageManagerCatalogLogic
 */

import type {
  ManagerCatalogPageCard,
  ManagerCatalogSection,
  PageCategoryHubSection,
} from "@shared/constants/pageCategoriesHub";
import { MAX_PAGES_PER_HUB_SECTION } from "@shared/constants/pageCategoriesHub";
import {
  buildManagerCatalogPageCard,
  ensureHubSectionsCoverDomains,
  mergeCuratedAndAutoHubPagePaths,
  resolvePageCatalogSectionLabel,
  type PageCategoryHubPageSource,
} from "@shared/lib/pageCategoriesHubLogic";
import { normalizePageCatalogDomainVisibility } from "@shared/lib/pageCatalogDomainVisibilityLogic";
import {
  PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
} from "@shared/constants/pageCategoriesHub";
import {
  composePageAddress,
  formatPageDomainLabel,
  normalizePageDomainSegment,
  normalizePagePath,
  pagePathBelongsToDomain,
  pagePathToSlug,
  splitPageAddress,
} from "@shared/lib/pagePathLogic";

/** Drop position relative to a sibling row. */
export type PageManagerDropPosition = "before" | "after";

/** Drag source for a page card inside the manager catalog. */
export interface PageManagerCatalogDragSource {
  /** Hub section id containing the dragged card. */
  sectionId: string;
  /** Index of the card inside the section. */
  pageIndex: number;
}

/** Drop target for a page card inside the manager catalog. */
export interface PageManagerCatalogDragTarget {
  /** Destination hub section id. */
  sectionId: string;
  /** Hovered card index inside the destination section. */
  pageIndex: number;
  /** Insert before or after the hovered card. */
  position: PageManagerDropPosition;
}

/**
 * Reorder a list by moving one index before/after another row.
 *
 * @param items - Source list (not mutated).
 * @param fromIndex - Index being dragged.
 * @param overIndex - Index currently hovered.
 * @param position - Insert before or after the hovered row.
 * @returns New list with the item moved, or the original reference when unchanged.
 */
function reorderList<T>(
  items: readonly T[],
  fromIndex: number,
  overIndex: number,
  position: PageManagerDropPosition,
): T[] {
  let destinationIndex = overIndex;
  if (position === "after") destinationIndex += 1;
  if (fromIndex < destinationIndex) destinationIndex -= 1;
  if (fromIndex === destinationIndex) return items as T[];

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(destinationIndex, 0, moved);
  return next;
}

/** Pending cross-domain move surfaced to the confirmation dialog. */
export interface PageManagerCrossDomainMove {
  /** Current absolute page path. */
  pagePath: string;
  /** Source path domain segment. */
  fromDomain: string;
  /** Target path domain segment. */
  toDomain: string;
  /** Proposed absolute path after the move. */
  newPath: string;
  /** Resolved drag source for applying the move after confirmation. */
  source: PageManagerCatalogDragSource;
  /** Resolved drop target for applying the move after confirmation. */
  target: PageManagerCatalogDragTarget;
}

/** Result of attempting a page drag across manager catalog sections. */
export interface PageManagerCatalogDragResult {
  /** Updated sections when the drag can be applied immediately. */
  sections: ManagerCatalogSection[];
  /** When set, the UI must confirm before applying a URL domain change. */
  crossDomainMove: PageManagerCrossDomainMove | null;
}

/**
 * List all child page paths under a domain for the Page Manager (includes drafts).
 *
 * @param pages - Candidate page rows under the domain.
 * @param domain - Path domain segment.
 * @returns Sorted paths (newest `updatedAt` first), excluding the domain root page.
 */
export function listUncategorizedManagerPagePaths(
  pages: readonly PageCategoryHubPageSource[],
  knownDomains: readonly string[],
): string[] {
  return pages
    .filter((page) => {
      const path = normalizePagePath(page.path);
      if (!path || path === "/") return false;
      return !knownDomains.some((domain) =>
        pagePathBelongsToDomain(path, domain, knownDomains),
      );
    })
    .sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      return left.path.localeCompare(right.path, undefined, { sensitivity: "base" });
    })
    .map((page) => normalizePagePath(page.path))
    .slice(0, MAX_PAGES_PER_HUB_SECTION);
}

/**
 * Default hub section row for pages outside `/domain/*` paths.
 *
 * @returns Uncategorized section config.
 */
export function buildUncategorizedHubSection(): PageCategoryHubSection {
  return {
    id: "section-uncategorized",
    domain: PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
    pagePaths: [],
  };
}

/**
 * Path domains that have at least one page row in MongoDB.
 *
 * @param pageSources - Loaded page rows.
 * @param availableDomains - Known domain segments for address parsing.
 * @returns Sorted domain labels with content.
 */
export function listDomainsWithPages(
  pageSources: readonly PageCategoryHubPageSource[],
  availableDomains: readonly string[],
): string[] {
  const found = new Set<string>();

  for (const row of pageSources) {
    const path = normalizePagePath(row.path);
    if (!path || path === "/") continue;

    for (const domain of availableDomains) {
      const normalized = normalizePageDomainSegment(domain);
      if (!normalized) continue;
      if (pagePathBelongsToDomain(path, normalized, availableDomains)) {
        found.add(normalized);
      }
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Resolve hub section rows for the Page Manager editor (`/pages/edit`).
 *
 * Auto-inserts hub rows for path domains that already have pages (but not empty
 * domains with no content). Public `/pages` uses {@link ensureHubSectionsCoverDomains}
 * via {@link PageCategoriesDomain.resolveCatalogHubSections}.
 * Appends an uncategorized row when flat pages exist but no section covers them.
 *
 * @param sections - Normalized hub sections from MongoDB.
 * @param availableDomains - Visible path domain segments.
 * @param pageSources - Loaded page rows for uncategorized detection.
 * @returns Section rows for the publisher editor.
 */
export function resolveManagerEditorHubSections(
  sections: readonly PageCategoryHubSection[],
  availableDomains: readonly string[],
  pageSources: readonly PageCategoryHubPageSource[],
): PageCategoryHubSection[] {
  const domainsWithPages = listDomainsWithPages(pageSources, availableDomains);
  let resolved = ensureHubSectionsCoverDomains(sections, domainsWithPages);

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
 * List all child page paths under a domain for the Page Manager (includes drafts).
 *
 * @param pages - Candidate page rows under the domain.
 * @param domain - Path domain segment.
 * @returns Sorted paths (newest `updatedAt` first), excluding the domain root page.
 */
export function listAutoManagerPagePathsUnderDomain(
  pages: readonly PageCategoryHubPageSource[],
  domain: string,
): string[] {
  const normalizedDomain = normalizePageDomainSegment(domain);
  if (!normalizedDomain) return [];

  const domainRootPath = formatPageDomainLabel(normalizedDomain);

  return pages
    .filter((page) => pagePathBelongsToDomain(page.path, normalizedDomain))
    .filter((page) => normalizePagePath(page.path) !== domainRootPath)
    .sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      return left.path.localeCompare(right.path, undefined, { sensitivity: "base" });
    })
    .map((page) => normalizePagePath(page.path));
}

/**
 * Resolve manager catalog page paths (curated order or auto-discovery with drafts).
 *
 * @param section - Hub section settings row.
 * @param pages - Page rows loaded for the section domain.
 * @param knownPaths - Paths that exist in MongoDB.
 * @returns Ordered paths for card hydration.
 */
export function resolveManagerSectionPagePaths(
  section: Pick<PageCategoryHubSection, "domain" | "pagePaths">,
  pages: readonly PageCategoryHubPageSource[],
  knownPaths: ReadonlySet<string>,
  knownDomains: readonly string[] = [],
): string[] {
  const auto =
    section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN
      ? listUncategorizedManagerPagePaths(pages, knownDomains)
      : listAutoManagerPagePathsUnderDomain(pages, section.domain);
  return mergeCuratedAndAutoHubPagePaths(section.pagePaths, auto, knownPaths);
}

/**
 * Hydrate manager catalog sections from hub config and page sources.
 *
 * @param sections - Normalized hub sections.
 * @param pageSources - Loaded page rows.
 * @param labelByDomain - Optional domain root titles for section headings.
 * @returns Resolved manager sections with cards.
 */
export function buildManagerCatalogSections(
  sections: readonly PageCategoryHubSection[],
  pageSources: readonly PageCategoryHubPageSource[],
  labelByDomain: ReadonlyMap<string, string>,
  knownDomains: readonly string[] = [],
  options: { includeEmptySections?: boolean } = {},
): ManagerCatalogSection[] {
  const pageByPath = new Map(
    pageSources.map((row) => [normalizePagePath(row.path), row] as const),
  );
  const knownPaths = new Set(pageSources.map((row) => normalizePagePath(row.path)));

  const built = sections.map((section) => {
    const domainPages =
      section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN
        ? pageSources.filter((row) => {
            const path = normalizePagePath(row.path);
            if (!path || path === "/") return false;
            return !knownDomains.some((domain) =>
              pagePathBelongsToDomain(path, domain, knownDomains),
            );
          })
        : pageSources.filter((row) =>
            pagePathBelongsToDomain(row.path, section.domain, knownDomains),
          );
    const pagePaths = resolveManagerSectionPagePaths(
      section,
      domainPages,
      knownPaths,
      knownDomains,
    );
    const pages = pagePaths
      .map((pagePath) => {
        const source = pageByPath.get(pagePath);
        if (!source) return null;
        return buildManagerCatalogPageCard(source);
      })
      .filter((card): card is ManagerCatalogPageCard => card != null);

    const sectionLabel = resolvePageCatalogSectionLabel(section, labelByDomain);

    return {
      id: section.id,
      domain: section.domain,
      sectionLabel,
      pages,
      ...normalizePageCatalogDomainVisibility(section),
    };
  });

  if (options.includeEmptySections) {
    return built;
  }

  return built.filter((section) => section.pages.length > 0);
}

/**
 * Convert manager catalog sections back into hub config rows.
 *
 * @param sections - Current manager UI sections.
 * @returns Serializable hub section rows preserving display order.
 */
export function managerSectionsToHubConfig(
  sections: readonly ManagerCatalogSection[],
): PageCategoryHubSection[] {
  return sections.map((section) => ({
    id: section.id,
    domain: section.domain,
    pagePaths: section.pages.map((page) => page.path),
    sectionLabel: section.sectionLabel.trim() || undefined,
    ...normalizePageCatalogDomainVisibility(section),
  }));
}

/**
 * Compute the destination path when a page moves to another path domain.
 *
 * @param pagePath - Current absolute page path.
 * @param targetDomain - Destination domain segment.
 * @param knownDomains - Known domain segments for address parsing.
 * @returns Normalized absolute path or empty string when invalid.
 */
export function computePagePathForDomainMove(
  pagePath: string,
  targetDomain: string,
  knownDomains: readonly string[],
): string {
  const normalizedTarget = normalizePageDomainSegment(targetDomain);
  if (!normalizedTarget) return "";

  const address = splitPageAddress(pagePathToSlug(pagePath), knownDomains);
  const pageSlug = address.pageSlug || address.pageSlug === "" ? address.pageSlug : address.domain;
  if (!pageSlug) return "";

  const domainRoot = formatPageDomainLabel(normalizedTarget);
  const nextPath = normalizePagePath(composePageAddress(normalizedTarget, pageSlug));
  if (nextPath === domainRoot) return "";
  return nextPath;
}

/**
 * Move one page card within or across manager catalog sections.
 *
 * Cross-domain drops that would change the page URL return {@link PageManagerCrossDomainMove}
 * for confirmation instead of mutating {@link ManagerCatalogSection.pages} immediately.
 *
 * @param sections - Current manager catalog sections.
 * @param source - Drag source card.
 * @param target - Drop target card.
 * @param knownDomains - Known path domains for URL parsing.
 * @returns Updated sections and optional cross-domain confirmation payload.
 */
export function moveManagerCatalogPage(
  sections: readonly ManagerCatalogSection[],
  source: PageManagerCatalogDragSource,
  target: PageManagerCatalogDragTarget,
  knownDomains: readonly string[],
): PageManagerCatalogDragResult {
  const sourceSection = sections.find((section) => section.id === source.sectionId);
  const targetSection = sections.find((section) => section.id === target.sectionId);
  if (!sourceSection || !targetSection) {
    return { sections: [...sections], crossDomainMove: null };
  }

  const movingPage = sourceSection.pages[source.pageIndex];
  if (!movingPage) {
    return { sections: [...sections], crossDomainMove: null };
  }

  const belongsToTarget = pagePathBelongsToDomain(movingPage.path, targetSection.domain, knownDomains);

  if (source.sectionId !== target.sectionId && !belongsToTarget) {
    const newPath = computePagePathForDomainMove(movingPage.path, targetSection.domain, knownDomains);
    if (!newPath || newPath === movingPage.path) {
      return { sections: [...sections], crossDomainMove: null };
    }

    return {
      sections: [...sections],
      crossDomainMove: {
        pagePath: movingPage.path,
        fromDomain: sourceSection.domain,
        toDomain: targetSection.domain,
        newPath,
        source,
        target,
      },
    };
  }

  const nextSections = sections.map((section) => ({
    ...section,
    pages: [...section.pages],
  }));

  const nextSource = nextSections.find((section) => section.id === source.sectionId);
  const nextTarget = nextSections.find((section) => section.id === target.sectionId);
  if (!nextSource || !nextTarget) {
    return { sections: [...sections], crossDomainMove: null };
  }

  if (source.sectionId === target.sectionId) {
    const reordered = reorderList(
      nextSource.pages,
      source.pageIndex,
      target.pageIndex,
      target.position,
    );
    nextSource.pages = reordered;
    return { sections: nextSections, crossDomainMove: null };
  }

  const [removed] = nextSource.pages.splice(source.pageIndex, 1);
  if (!removed) {
    return { sections: [...sections], crossDomainMove: null };
  }

  const insertIndex = Math.max(
    0,
    Math.min(
      target.position === "before" ? target.pageIndex : target.pageIndex + 1,
      nextTarget.pages.length,
    ),
  );
  nextTarget.pages.splice(insertIndex, 0, removed);

  return { sections: nextSections, crossDomainMove: null };
}

/**
 * Reorder hub domain sections in the manager catalog.
 *
 * @param sections - Current manager sections.
 * @param fromIndex - Dragged section index.
 * @param overIndex - Hovered section index.
 * @param position - Insert before or after the hovered section.
 * @returns Reordered sections.
 */
export function reorderManagerCatalogSections(
  sections: readonly ManagerCatalogSection[],
  fromIndex: number,
  overIndex: number,
  position: PageManagerDropPosition,
): ManagerCatalogSection[] {
  return reorderList(sections, fromIndex, overIndex, position);
}

/**
 * Apply a confirmed cross-domain move using the renamed page path.
 *
 * @param sections - Current manager sections.
 * @param pending - Confirmed cross-domain move metadata.
 * @returns Sections with the page removed from the source and inserted at the target.
 */
export function applyConfirmedCrossDomainMove(
  sections: readonly ManagerCatalogSection[],
  pending: PageManagerCrossDomainMove,
): ManagerCatalogSection[] {
  const movingCard = sections
    .flatMap((section) => section.pages)
    .find((page) => page.path === pending.pagePath);
  if (!movingCard) return [...sections];

  const movedCard: ManagerCatalogPageCard = {
    ...movingCard,
    path: pending.newPath,
    href: pending.newPath,
  };

  const withoutSource = sections.map((section) => ({
    ...section,
    pages: section.pages.filter((page) => page.path !== pending.pagePath),
  }));

  return withoutSource.map((section) => {
    if (section.id !== pending.target.sectionId) return section;

    const pages = [...section.pages];
    const insertIndex = Math.max(
      0,
      Math.min(
        pending.target.position === "before"
          ? pending.target.pageIndex
          : pending.target.pageIndex + 1,
        pages.length,
      ),
    );
    pages.splice(insertIndex, 0, movedCard);
    return { ...section, pages };
  });
}
