/**
 * @fileoverview Constants for the admin page categories hub and news catalog block.
 *
 * @module shared/constants/pageCategoriesHub
 */

import type { PageCatalogDomainVisibilityFields } from "./pageCatalogDomainVisibility";

/** Singleton MongoDB document id for page category hub settings. */
export const PAGE_CATEGORIES_SETTINGS_ID = "nexus-page-categories";

/** Maximum hub sections (one per path domain such as `news`). */
export const MAX_PAGE_CATEGORY_HUB_SECTIONS = 12;

/**
 * Synthetic hub domain key for flat pages that do not live under `/domain/*`.
 * Not a real URL segment — used only in catalog section metadata.
 */
export const PAGE_CATALOG_UNCATEGORIZED_DOMAIN = "uncategorized";

/** Human-readable label for {@link PAGE_CATALOG_UNCATEGORIZED_DOMAIN} sections. */
export const PAGE_CATALOG_UNCATEGORIZED_LABEL = "Other pages";

/** Maximum curated pages per hub section. */
export const MAX_PAGES_PER_HUB_SECTION = 48;

/** Maximum publication images per page (cover + gallery). */
export const MAX_PAGE_PUBLICATION_IMAGES = 4;

/** Maximum additional gallery uploads beyond the primary cover. */
export const MAX_PAGE_GALLERY_IMAGES = MAX_PAGE_PUBLICATION_IMAGES - 1;

/** Allowed images shown per catalog preview card (1–4). */
export const NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS = [1, 2, 3, 4] as const;

/** Images-per-card union. */
export type NewsCatalogImagesPerCard = (typeof NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS)[number];

/** Per-page catalog card size variants (configured in Page Publication settings). */
export const NEWS_CATALOG_PAGE_CARD_VARIANTS = ["tile", "featured"] as const;

/** Catalog card variant union. */
export type NewsCatalogPageCardVariant = (typeof NEWS_CATALOG_PAGE_CARD_VARIANTS)[number];

export interface PagePathDomainCatalogEntry {
  /** Domain segment without slashes (e.g. `news`). */
  domain: string;
  /** Absolute domain root path (e.g. `/news`). */
  domainPath: string;
  /** Title of the domain root page when it exists. */
  title: string;
}

/**
 * One admin-configured hub section keyed by a Puck path domain.
 */
export interface PageCategoryHubSection extends PageCatalogDomainVisibilityFields {
  /** Stable row id for drag/reorder and React keys. */
  id: string;
  /** Path domain segment (e.g. `news` for `/news/*`). */
  domain: string;
  /** Optional catalog heading override — falls back to domain root page title. */
  sectionLabel?: string;
  /** Curated page paths in display order. */
  pagePaths: string[];
}

/** Public admin/editor config shape. */
export interface PageCategoriesHubConfig {
  sections: PageCategoryHubSection[];
}

/** Resolved page card for the news catalog block. */
export interface NewsCatalogPageCard {
  path: string;
  href: string;
  title: string;
  description: string;
  images: string[];
  /** Catalog preview size — `featured` may occupy the section hero slot when eligible. */
  cardVariant: NewsCatalogPageCardVariant;
  /** Display label for publish / last-update time (DD.MM.YYYY HH:mm). */
  publishDate: string;
  /** ISO-8601 value for `<time dateTime>`. */
  publishDateTime: string;
  authorDisplayName: string | null;
  categories: string[];
}

/** Manager catalog card — includes draft/published state for `/pages`. */
export interface ManagerCatalogPageCard extends NewsCatalogPageCard {
  /** Whether the page is currently published (and visible on schedule). */
  published: boolean;
}

/** Resolved manager catalog section for `/pages`. */
export interface ManagerCatalogSection extends PageCatalogDomainVisibilityFields {
  id: string;
  domain: string;
  sectionLabel: string;
  pages: ManagerCatalogPageCard[];
}

/** Manager catalog payload for `/pages`. */
export interface ManagerCatalogPayload {
  sections: ManagerCatalogSection[];
}

/** Resolved hub section for public rendering. */
export interface NewsCatalogHubSection extends PageCatalogDomainVisibilityFields {
  id: string;
  /** Path domain segment backing this tab. */
  domain: string;
  /** Human-readable tab label (domain root page title or capitalised domain). */
  sectionLabel: string;
  pages: NewsCatalogPageCard[];
}

/** Public payload for `/api/page-categories/hub`. */
export interface NewsCatalogHubPayload {
  sections: NewsCatalogHubSection[];
}
