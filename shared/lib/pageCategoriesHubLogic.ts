/**
 * @fileoverview Pure helpers for page category hub settings and news catalog cards.
 *
 * Tests: `npm run test:page-categories-hub-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pageCategoriesHubLogic
 */

import {
  MAX_PAGE_CATEGORY_HUB_SECTIONS,
  MAX_PAGE_GALLERY_IMAGES,
  MAX_PAGE_PUBLICATION_IMAGES,
  MAX_PAGES_PER_HUB_SECTION,
  NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS,
  NEWS_CATALOG_PAGE_CARD_VARIANTS,
  PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
  PAGE_CATALOG_UNCATEGORIZED_LABEL,
  type ManagerCatalogPageCard,
  type NewsCatalogImagesPerCard,
  type NewsCatalogPageCard,
  type NewsCatalogPageCardVariant,
  type PageCategoryHubSection,
} from "@shared/constants/pageCategoriesHub";
import { normalizePageCatalogDomainVisibility } from "@shared/lib/pageCatalogDomainVisibilityLogic";
import { isPagePubliclyVisible, normalizePublishAt } from "@shared/lib/pagePublicationLogic";
import {
  formatPageDomainLabel,
  normalizePageDomainSegment,
  normalizePagePath,
  pagePathBelongsToDomain,
} from "@shared/lib/pagePathLogic";
/**
 * Format a publish timestamp for news catalog cards (DD.MM.YYYY).
 *
 * @param publishAt - ISO string, Date, or null.
 * @returns Date label or empty string.
 */
export function formatCatalogHubDate(publishAt: string | Date | null | undefined): string {
  if (!publishAt) return "";
  const parsed = parseCatalogHubTimestamp(publishAt);
  if (!parsed) return String(publishAt).trim();
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format a publish timestamp for catalog card badges (DD.MM.YYYY HH:mm, local time).
 *
 * @param publishAt - ISO string, Date, or null.
 * @returns Date + time label or empty string.
 */
export function formatCatalogHubDateTime(publishAt: string | Date | null | undefined): string {
  if (!publishAt) return "";
  const parsed = parseCatalogHubTimestamp(publishAt);
  if (!parsed) return String(publishAt).trim();
  const date = formatCatalogHubDate(parsed);
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${date} ${hours}:${minutes}`;
}

/**
 * Normalise a catalog timestamp to ISO-8601 for `<time dateTime>`.
 *
 * @param publishAt - ISO string, Date, or null.
 * @returns ISO string or empty when unavailable.
 */
export function formatCatalogHubDateTimeIso(publishAt: string | Date | null | undefined): string {
  const parsed = parseCatalogHubTimestamp(publishAt);
  return parsed ? parsed.toISOString() : "";
}

/**
 * Parse a hub/catalog timestamp into a valid Date.
 *
 * @param value - Raw timestamp from MongoDB or API.
 * @returns Parsed date or null.
 */
function parseCatalogHubTimestamp(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Resolve the timestamp shown on catalog card previews.
 *
 * Immediate publishes often store `publishAt: null` while `published` is true;
 * fall back to `updatedAt` so cards still show a meaningful date.
 *
 * @param page - Hub page source row.
 * @returns Raw date for {@link formatCatalogHubDate}, or null when unavailable.
 */
export function resolveCatalogCardPublishAt(
  page: Pick<PageCategoryHubPageSource, "publishAt" | "updatedAt">,
): string | Date | null {
  if (normalizePublishAt(page.publishAt)) {
    return page.publishAt ?? null;
  }
  if (page.updatedAt) {
    return page.updatedAt;
  }
  return null;
}

/** Minimal page row for hub card resolution. */
export interface PageCategoryHubPageSource {
  path: string;
  title: string;
  description?: string;
  coverImage?: string;
  galleryImages?: string[];
  categories?: string[];
  authorDisplayName?: string | null;
  publishAt?: string | Date | null;
  published?: boolean;
  /** Per-page catalog preview image count (Page Publication settings). */
  catalogImagesPerCard?: NewsCatalogImagesPerCard;
  /** Per-page catalog card size variant. */
  catalogCardVariant?: NewsCatalogPageCardVariant;
  /** Last update timestamp for manager auto-ordering. */
  updatedAt?: string | Date | null;
}

/**
 * Collect ordered publication image URLs (cover first, then gallery).
 *
 * @param coverImage - Primary cover URL.
 * @param galleryImages - Additional gallery URLs.
 * @returns Up to {@link MAX_PAGE_PUBLICATION_IMAGES} unique URLs.
 */
export function collectPublicationImageUrls(
  coverImage: string | undefined,
  galleryImages: readonly string[] | undefined,
): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined) => {
    const trimmed = (raw ?? "").trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    output.push(trimmed);
  };

  push(coverImage);
  for (const url of galleryImages ?? []) {
    push(url);
    if (output.length >= MAX_PAGE_PUBLICATION_IMAGES) break;
  }

  return output.slice(0, MAX_PAGE_PUBLICATION_IMAGES);
}

/**
 * Normalize gallery image URLs for MongoDB storage.
 *
 * @param raw - Raw gallery array from API or Puck props.
 * @returns Trimmed unique URLs capped at {@link MAX_PAGE_GALLERY_IMAGES}.
 */
export function normalizePageGalleryImages(raw: readonly string[] | null | undefined): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw ?? []) {
    const trimmed = String(entry ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    output.push(trimmed);
    if (output.length >= MAX_PAGE_GALLERY_IMAGES) break;
  }

  return output;
}

/**
 * Normalize a per-page catalog card variant.
 *
 * @param value - Raw variant value.
 * @returns Supported variant or `tile`.
 */
export function normalizeNewsCatalogPageCardVariant(value: unknown): NewsCatalogPageCardVariant {
  const raw = String(value ?? "").trim() as NewsCatalogPageCardVariant;
  return NEWS_CATALOG_PAGE_CARD_VARIANTS.includes(raw) ? raw : "tile";
}

/**
 * Normalize images-per-card count.
 *
 * @param value - Raw numeric value.
 * @returns Clamped supported count.
 */
export function normalizeNewsCatalogImagesPerCard(value: unknown): NewsCatalogImagesPerCard {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 1;
  const rounded = Math.round(numeric);
  return NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS.includes(rounded as NewsCatalogImagesPerCard)
    ? (rounded as NewsCatalogImagesPerCard)
    : 1;
}

/**
 * Resolve the tab label for a hub section from the domain root page title.
 *
 * @param domain - Path domain segment.
 * @param domainRootTitle - Title of the `/domain` page when present.
 * @returns Display label for catalog tabs.
 */
export function resolveHubSectionDisplayLabel(
  domain: string,
  domainRootTitle?: string | null,
): string {
  const trimmed = (domainRootTitle ?? "").trim();
  if (trimmed) return trimmed;

  const segment = normalizePageDomainSegment(domain);
  if (!segment) return "";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Normalise an optional catalog section heading override from hub settings.
 *
 * @param raw - Stored label from MongoDB or the editor.
 * @returns Trimmed label or `undefined` when empty.
 */
export function normalizeHubSectionLabel(raw: string | null | undefined): string | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 120);
}

/**
 * Resolve the visible catalog heading for a hub section row.
 *
 * Prefers a persisted {@link PageCategoryHubSection.sectionLabel} override, then the
 * domain root page title, then a capitalised domain segment.
 *
 * @param section - Hub section config row.
 * @param labelByDomain - Domain root titles keyed by segment.
 * @returns Heading shown on `/pages` and `/pages/edit`.
 */
export function resolvePageCatalogSectionLabel(
  section: Pick<PageCategoryHubSection, "domain" | "sectionLabel">,
  labelByDomain: ReadonlyMap<string, string> = new Map(),
): string {
  const custom = normalizeHubSectionLabel(section.sectionLabel);
  if (custom) return custom;

  if (section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN) {
    return PAGE_CATALOG_UNCATEGORIZED_LABEL;
  }

  return resolveHubSectionDisplayLabel(
    section.domain,
    labelByDomain.get(section.domain),
  );
}

/**
 * Normalize curated page paths for a hub section.
 *
 * @param raw - Raw path list.
 * @param domain - Optional domain filter — keeps only paths under this domain.
 * @param knownDomains - Domain list for path parsing.
 * @returns Unique normalized absolute paths.
 */
export function normalizeHubSectionPagePaths(
  raw: readonly string[] | null | undefined,
  domain?: string,
  knownDomains?: readonly string[],
): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  const normalizedDomain = domain ? normalizePageDomainSegment(domain) : "";

  for (const entry of raw ?? []) {
    const normalized = normalizePagePath(String(entry ?? ""));
    if (!normalized || normalized === "/" || seen.has(normalized)) continue;
    if (
      normalizedDomain &&
      !pagePathBelongsToDomain(normalized, normalizedDomain, knownDomains)
    ) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
    if (output.length >= MAX_PAGES_PER_HUB_SECTION) break;
  }

  return output;
}

/** Raw hub section row before normalization (supports legacy `categoryLabel`). */
export type PageCategoryHubSectionInput = Partial<PageCategoryHubSection> & {
  /** @deprecated Legacy Obsidian tag key — migrated to {@link PageCategoryHubSection.domain}. */
  categoryLabel?: string;
};

/**
 * Normalize admin hub sections against visible path domains.
 *
 * @param raw - Stored sections from MongoDB.
 * @param availableDomains - Visible domain segments from {@link PageDomain.listPagePathDomains}.
 * @returns Validated sections keyed by domain.
 */
export function normalizePageCategoryHubSections(
  raw: Array<PageCategoryHubSectionInput> | null | undefined,
  availableDomains: readonly string[],
): PageCategoryHubSection[] {
  const catalogByLower = new Map<string, string>();
  for (const domain of availableDomains) {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) continue;
    catalogByLower.set(normalized.toLowerCase(), normalized);
  }

  const seenDomains = new Set<string>();
  const output: PageCategoryHubSection[] = [];

  for (const row of raw ?? []) {
    const id = String(row.id ?? "").trim();
    const rawDomain = String(row.domain ?? row.categoryLabel ?? "").trim();
    const domain = normalizePageDomainSegment(rawDomain);
    if (!id || !domain) continue;

    if (domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN) {
      output.push({
        id,
        domain: PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
        pagePaths: normalizeHubSectionPagePaths(row.pagePaths, undefined, availableDomains),
        sectionLabel: normalizeHubSectionLabel(row.sectionLabel),
        ...normalizePageCatalogDomainVisibility(row),
      });
      if (output.length >= MAX_PAGE_CATEGORY_HUB_SECTIONS) break;
      continue;
    }

    const catalogDomain = catalogByLower.get(domain.toLowerCase());
    if (!catalogDomain) continue;

    const domainKey = catalogDomain.toLowerCase();
    if (seenDomains.has(domainKey)) continue;
    seenDomains.add(domainKey);

    output.push({
      id,
      domain: catalogDomain,
      pagePaths: normalizeHubSectionPagePaths(row.pagePaths, catalogDomain, availableDomains),
      sectionLabel: normalizeHubSectionLabel(row.sectionLabel),
      ...normalizePageCatalogDomainVisibility(row),
    });

    if (output.length >= MAX_PAGE_CATEGORY_HUB_SECTIONS) break;
  }

  return output;
}

/**
 * Path domains from the page catalog that are not yet assigned to a hub section.
 *
 * @param availableDomains - Visible domain segments.
 * @param sections - Current hub sections.
 * @returns Domains eligible for a new section.
 */
export function listUnusedPagePathDomains(
  availableDomains: readonly string[],
  sections: readonly PageCategoryHubSection[],
): string[] {
  const used = new Set(sections.map((section) => section.domain.toLowerCase()));
  const output: string[] = [];
  const seen = new Set<string>();

  for (const domain of availableDomains) {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (used.has(key) || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }

  return output.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Build default hub sections for every visible path domain.
 *
 * @param domains - Visible domain segments.
 * @returns One section per domain with catalog defaults.
 */
export function buildDefaultHubSectionsForDomains(
  domains: readonly string[],
): PageCategoryHubSection[] {
  const output: PageCategoryHubSection[] = [];

  for (const domain of domains) {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) continue;

    output.push({
      id: `domain-${normalized}`,
      domain: normalized,
      pagePaths: [],
    });

    if (output.length >= MAX_PAGE_CATEGORY_HUB_SECTIONS) break;
  }

  return output;
}

/**
 * List published child page paths under a domain when no manual curation exists.
 *
 * @param pages - Candidate page rows under the domain.
 * @param domain - Path domain segment.
 * @returns Sorted paths (newest publish date first), excluding the domain root page.
 */
export function listAutoPublishedPagePathsUnderDomain(
  pages: readonly PageCategoryHubPageSource[],
  domain: string,
): string[] {
  const normalizedDomain = normalizePageDomainSegment(domain);
  if (!normalizedDomain) return [];

  const domainRootPath = formatPageDomainLabel(normalizedDomain);

  return pages
    .filter((page) => pagePathBelongsToDomain(page.path, normalizedDomain))
    .filter((page) => normalizePagePath(page.path) !== domainRootPath)
    .filter((page) =>
      isPagePubliclyVisible({
        published: page.published ?? false,
        publishAt: page.publishAt ?? null,
      }),
    )
    .sort((left, right) => {
      const leftTime = left.publishAt ? new Date(left.publishAt).getTime() : 0;
      const rightTime = right.publishAt ? new Date(right.publishAt).getTime() : 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      return left.path.localeCompare(right.path, undefined, { sensitivity: "base" });
    })
    .map((page) => normalizePagePath(page.path))
    .slice(0, MAX_PAGES_PER_HUB_SECTION);
}

/**
 * Resolve the page paths shown in a hub section (curated order or auto-discovery).
 *
 * @param section - Hub section settings row.
 * @param pages - Page rows loaded for the section domain.
 * @param knownPaths - Paths that exist in MongoDB.
 * @returns Ordered paths for card hydration.
 */
export function resolveEffectiveHubSectionPagePaths(
  section: Pick<PageCategoryHubSection, "domain" | "pagePaths">,
  pages: readonly PageCategoryHubPageSource[],
  knownPaths: ReadonlySet<string>,
  knownDomains: readonly string[] = [],
): string[] {
  const auto =
    section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN
      ? listUncategorizedPublishedPagePaths(pages, knownDomains)
      : listAutoPublishedPagePathsUnderDomain(pages, section.domain);
  return mergeCuratedAndAutoHubPagePaths(section.pagePaths, auto, knownPaths);
}

/**
 * Build a news catalog card from a page document slice.
 *
 * Image count is capped by both the page's catalog preview setting and the
 * number of publication images available on the page.
 *
 * @param page - Source page row.
 * @returns Card DTO or null when the page should not appear publicly.
 */
export function buildNewsCatalogPageCard(page: PageCategoryHubPageSource): NewsCatalogPageCard | null {
  const path = normalizePagePath(page.path);
  if (!path || path === "/") return null;

  const imagesPerCard = normalizeNewsCatalogImagesPerCard(page.catalogImagesPerCard);
  const availableImages = collectPublicationImageUrls(page.coverImage, page.galleryImages);
  const images = availableImages.slice(0, Math.min(imagesPerCard, availableImages.length));

  const resolvedPublishAt = resolveCatalogCardPublishAt(page);

  return {
    path,
    href: path,
    title: (page.title ?? "").trim() || "Untitled Page",
    description: (page.description ?? "").trim(),
    images,
    cardVariant: normalizeNewsCatalogPageCardVariant(page.catalogCardVariant),
    publishDate: formatCatalogHubDateTime(resolvedPublishAt),
    publishDateTime: formatCatalogHubDateTimeIso(resolvedPublishAt),
    authorDisplayName: page.authorDisplayName ?? null,
    categories: (page.categories ?? []).map((entry) => entry.trim()).filter(Boolean),
  };
}

/**
 * Build a manager catalog card from a page document slice (includes draft state).
 *
 * @param page - Source page row.
 * @returns Card DTO or null when the path is invalid.
 */
export function buildManagerCatalogPageCard(
  page: PageCategoryHubPageSource,
): ManagerCatalogPageCard | null {
  const base = buildNewsCatalogPageCard(page);
  if (!base) return null;

  return {
    ...base,
    published: isPagePubliclyVisible({
      published: page.published ?? false,
      publishAt: page.publishAt ?? null,
    }),
  };
}

/**
 * Filter page paths to those that exist in the provided page map.
 *
 * @param pagePaths - Curated paths from admin settings.
 * @param knownPaths - Set of valid MongoDB page paths.
 * @returns Paths that still exist, preserving order.
 */
export function filterKnownHubPagePaths(
  pagePaths: readonly string[],
  knownPaths: ReadonlySet<string>,
): string[] {
  return pagePaths.filter((entry) => knownPaths.has(normalizePagePath(entry)));
}

/**
 * Merge curated hub paths with auto-discovered paths (curated order wins).
 *
 * @param curatedPaths - Hand-picked paths from hub settings.
 * @param autoPaths - Auto-discovered paths for the section domain.
 * @param knownPaths - Paths that exist in MongoDB.
 * @returns Combined unique list capped at {@link MAX_PAGES_PER_HUB_SECTION}.
 */
export function mergeCuratedAndAutoHubPagePaths(
  curatedPaths: readonly string[],
  autoPaths: readonly string[],
  knownPaths: ReadonlySet<string>,
): string[] {
  const curated = filterKnownHubPagePaths(curatedPaths, knownPaths);
  if (curated.length === 0) {
    return autoPaths.slice(0, MAX_PAGES_PER_HUB_SECTION);
  }

  const seen = new Set(curated);
  const merged = [...curated];
  for (const path of autoPaths) {
    if (seen.has(path)) continue;
    seen.add(path);
    merged.push(path);
    if (merged.length >= MAX_PAGES_PER_HUB_SECTION) break;
  }
  return merged;
}

/**
 * Ensure hub settings include a section row for every visible path domain.
 *
 * @param sections - Normalized hub sections from MongoDB.
 * @param availableDomains - Visible domains from {@link PageDomain.listPagePathDomains}.
 * @returns Sections plus any missing domain rows (empty `pagePaths`).
 */
export function ensureHubSectionsCoverDomains(
  sections: readonly PageCategoryHubSection[],
  availableDomains: readonly string[],
): PageCategoryHubSection[] {
  const merged: PageCategoryHubSection[] = [...sections];
  const seen = new Set(merged.map((section) => section.domain.toLowerCase()));

  for (const domain of availableDomains) {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: `domain-${normalized}`,
      domain: normalized,
      pagePaths: [],
    });
    if (merged.length >= MAX_PAGE_CATEGORY_HUB_SECTIONS) break;
  }

  return merged;
}

/**
 * Published pages that do not belong to any known path domain.
 *
 * @param pages - All loaded page rows.
 * @param knownDomains - Visible path domain segments.
 * @returns Sorted published flat paths.
 */
export function listUncategorizedPublishedPagePaths(
  pages: readonly PageCategoryHubPageSource[],
  knownDomains: readonly string[],
): string[] {
  return pages
    .filter((page) => {
      const path = normalizePagePath(page.path);
      if (!path || path === "/") return false;
      if (knownDomains.some((domain) => pagePathBelongsToDomain(path, domain, knownDomains))) {
        return false;
      }
      return isPagePubliclyVisible({
        published: page.published ?? false,
        publishAt: page.publishAt ?? null,
      });
    })
    .sort((left, right) => {
      const leftTime = left.publishAt ? new Date(left.publishAt).getTime() : 0;
      const rightTime = right.publishAt ? new Date(right.publishAt).getTime() : 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      return left.path.localeCompare(right.path, undefined, { sensitivity: "base" });
    })
    .map((page) => normalizePagePath(page.path))
    .slice(0, MAX_PAGES_PER_HUB_SECTION);
}
