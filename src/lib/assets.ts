/**
 * @fileoverview Canonical static asset paths for Project Nexus.
 *
 * All runtime icons and brand images live under `public/` in dedicated
 * subfolders. Import paths from here instead of hardcoding URL strings so
 * moves under `public/` only require a single update.
 *
 * @module src/lib/assets
 */

/** Root-relative paths to files in `public/icons/`. */
export const ICONS = {
  /** Browser tab favicon (`public/icons/favicon.ico`). */
  favicon: "/icons/favicon.ico",
} as const;

/** Root-relative paths to files in `public/brand/`. */
export const BRAND = {
  /** Nexus logo used in header (`public/brand/logo.svg`). */
  logo: "/brand/logo.svg",
  /**
   * Filled logo mark without stroke rings — used by InfiniteGrid in light theme
   * (`public/brand/logo-grid.svg`).
   */
  logoGrid: "/brand/logo-grid.svg",
} as const;

/** Root-relative path to the uploads directory (`public/uploads/`). */
export const UPLOADS = "/uploads" as const;

/**
 * Next.js `metadata.icons` configuration — wired in `src/app/layout.tsx`.
 * Keeps favicon resolution out of `src/app/` (no file-based metadata there).
 */
export const SITE_ICONS = {
  icon: ICONS.favicon,
  shortcut: ICONS.favicon,
  apple: BRAND.logo,
} as const;
