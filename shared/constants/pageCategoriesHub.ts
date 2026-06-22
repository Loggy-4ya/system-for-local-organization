/**
 * @fileoverview Constants for the admin page categories hub and news catalog block.
 *
 * @module shared/constants/pageCategoriesHub
 */

/** Singleton MongoDB document id for page category hub settings. */
export const PAGE_CATEGORIES_SETTINGS_ID = "nexus-page-categories";

/** Maximum hub sections (one per path domain such as `news`). */
export const MAX_PAGE_CATEGORY_HUB_SECTIONS = 12;

/** Maximum curated pages per hub section. */
export const MAX_PAGES_PER_HUB_SECTION = 48;

/** Maximum publication images per page (cover + gallery). */
export const MAX_PAGE_PUBLICATION_IMAGES = 4;

/** Maximum additional gallery uploads beyond the primary cover. */
export const MAX_PAGE_GALLERY_IMAGES = MAX_PAGE_PUBLICATION_IMAGES - 1;

/** Supported preview card layouts for a hub section. */
export const NEWS_CATALOG_CARD_LAYOUTS = ["featured-grid", "uniform-grid"] as const;

/** Card layout slug union. */
export type NewsCatalogCardLayout = (typeof NEWS_CATALOG_CARD_LAYOUTS)[number];

/** Allowed images shown per catalog card (1–4). */
export const NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS = [1, 2, 3, 4] as const;

/** Images-per-card union. */
export type NewsCatalogImagesPerCard = (typeof NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS)[number];

/** Path domain row for the hub editor domain picker. */
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
export interface PageCategoryHubSection {
  /** Stable row id for drag/reorder and React keys. */
  id: string;
  /** Path domain segment (e.g. `news` for `/news/*`). */
  domain: string;
  /** Curated page paths in display order. */
  pagePaths: string[];
  /** Preview card layout for this section. */
  cardLayout: NewsCatalogCardLayout;
  /** How many publication images to show per card. */
  imagesPerCard: NewsCatalogImagesPerCard;
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
  publishDate: string;
  authorDisplayName: string | null;
  categories: string[];
}

/** Resolved hub section for public rendering. */
export interface NewsCatalogHubSection {
  id: string;
  /** Path domain segment backing this tab. */
  domain: string;
  /** Human-readable tab label (domain root page title or capitalised domain). */
  sectionLabel: string;
  cardLayout: NewsCatalogCardLayout;
  imagesPerCard: NewsCatalogImagesPerCard;
  pages: NewsCatalogPageCard[];
}

/** Public payload for `/api/page-categories/hub`. */
export interface NewsCatalogHubPayload {
  sections: NewsCatalogHubSection[];
}
