/**
 * @fileoverview Display constants for the public Page Manager catalog (`/pages`).
 *
 * @module shared/constants/pageCatalogDisplay
 */

/** Vertical gap between stacked `glass-panel` islands on `/pages` and `/pages/edit`. */
export const PAGE_CATALOG_ISLAND_GAP_CSS_VAR = "--page-catalog-island-gap";

/** Minimum section page count before the auto-carousel layout activates. */
export const PAGE_CATALOG_CAROUSEL_MIN_PAGES = 4;

/** Autoplay interval for the public catalog carousel (milliseconds). */
export const PAGE_CATALOG_CAROUSEL_AUTOPLAY_MS = 5500;

/** Maximum cards shown in a static grid before numbered pagination kicks in. */
export const PAGE_CATALOG_GRID_PAGE_SIZE = 6;

/**
 * Viewport width at which the publisher catalog grid uses horizontal (side) drag slots
 * instead of vertical ones — must stay aligned with `@media (min-width: …)` in
 * `src/app/page-catalog.css`.
 */
export const PAGE_CATALOG_DRAG_HORIZONTAL_MIN_WIDTH = 768;

/** Responsive breakpoints for visible carousel cards (match Embla basis tiers). */
export const PAGE_CATALOG_CAROUSEL_BREAKPOINTS = {
  tablet: 640,
  desktop: 1024,
} as const;
