/**
 * @fileoverview Unified content width tokens for pages, sections, and islands.
 *
 * Single source of truth for max-width presets across Puck and global layout.
 *
 * Tests: `tests/puck/lib/contentWidthTokens.test.ts` — `npm run test:content-width-tokens`
 *
 * @module src/components/puck/lib/contentWidthTokens
 */

/** Content width preset keys. */
export type ContentWidthToken = "xs" | "sm" | "md" | "lg" | "xl" | "full";

/** Legacy island/section width values mapped to canonical tokens. */
export type LegacyContentWidth = "contained" | "narrow" | ContentWidthToken;

/** Sidebar option for width selects. */
export interface ContentWidthOption {
  label: string;
  value: ContentWidthToken;
}

/** CSS length per width token. */
export const CONTENT_WIDTH_MAP: Record<ContentWidthToken, string> = {
  xs: "640px",
  sm: "800px",
  md: "1024px",
  lg: "1200px",
  xl: "1400px",
  full: "100%",
};

/** CSS custom property names per token (for globals.css). */
export const CONTENT_WIDTH_CSS_VARS: Record<ContentWidthToken, string> = {
  xs: "--content-width-xs",
  sm: "--content-width-sm",
  md: "--content-width-md",
  lg: "--content-width-lg",
  xl: "--content-width-xl",
  full: "--content-width-full",
};

/** Max contained preset — site default container band (1400px). */
export const MAX_PROJECT_CONTENT_WIDTH: ContentWidthToken = "xl";

/** Default page / island / chrome width — {@link MAX_PROJECT_CONTENT_WIDTH} (1400px). */
export const DEFAULT_CONTENT_WIDTH: ContentWidthToken = MAX_PROJECT_CONTENT_WIDTH;

/** Global header/footer chrome band — same 1400px default as page containers. */
export const GLOBAL_LAYOUT_CONTENT_WIDTH: ContentWidthToken = MAX_PROJECT_CONTENT_WIDTH;

/**
 * Default max-width for built-in static routes (`StaticPageShell`).
 * Matches header/footer chrome (1400px / {@link MAX_PROJECT_CONTENT_WIDTH}).
 */
export const STATIC_DEFAULT_CONTENT_WIDTH: ContentWidthToken = GLOBAL_LAYOUT_CONTENT_WIDTH;

/**
 * Content width for static (non-Puck) routes.
 * All entries use {@link STATIC_DEFAULT_CONTENT_WIDTH} — same as global chrome.
 * Must stay in sync with {@link StaticPageShell} on each route.
 */
export const STATIC_ROUTE_CONTENT_WIDTH = {
  "/": STATIC_DEFAULT_CONTENT_WIDTH,
  "/pages": STATIC_DEFAULT_CONTENT_WIDTH,
  "/pages/edit": STATIC_DEFAULT_CONTENT_WIDTH,
  "/pages/categories": STATIC_DEFAULT_CONTENT_WIDTH,
  "/login": STATIC_DEFAULT_CONTENT_WIDTH,
  "/signup": STATIC_DEFAULT_CONTENT_WIDTH,
  "/telegram": STATIC_DEFAULT_CONTENT_WIDTH,
  admin: STATIC_DEFAULT_CONTENT_WIDTH,
  profile: STATIC_DEFAULT_CONTENT_WIDTH,
} as const satisfies Record<string, ContentWidthToken>;

/**
 * Resolve the content width token for a static app route, if known.
 *
 * @param pathname - Normalized pathname (no trailing slash except `/`).
 * @returns Width token when the route is static; otherwise `null`.
 */
export function resolveStaticRouteContentWidth(pathname: string): ContentWidthToken | null {
  const cleanPath =
    pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (cleanPath in STATIC_ROUTE_CONTENT_WIDTH) {
    return STATIC_ROUTE_CONTENT_WIDTH[cleanPath as keyof typeof STATIC_ROUTE_CONTENT_WIDTH];
  }

  if (cleanPath.startsWith("/admin")) {
    return STATIC_ROUTE_CONTENT_WIDTH.admin;
  }

  if (cleanPath.startsWith("/profile")) {
    return STATIC_ROUTE_CONTENT_WIDTH.profile;
  }

  return null;
}

/** Select options with pixel labels for Puck sidebars. */
export const CONTENT_WIDTH_OPTIONS: ContentWidthOption[] = [
  { label: "Extra Narrow (640px)", value: "xs" },
  { label: "Narrow (800px)", value: "sm" },
  { label: "Medium (1024px)", value: "md" },
  { label: "Contained (1200px)", value: "lg" },
  { label: "Wide (1400px)", value: "xl" },
  { label: "Full Width", value: "full" },
];

/** Page-root layout presets — includes full bleed within page gutters. */
export const PAGE_CONTENT_WIDTH_OPTIONS: ContentWidthOption[] = CONTENT_WIDTH_OPTIONS;

/**
 * Normalize legacy width values to canonical tokens.
 *
 * @param raw - Stored prop value (legacy or current).
 * @returns Canonical content width token.
 */
export function normalizeContentWidth(
  raw: LegacyContentWidth | string | undefined,
): ContentWidthToken {
  if (!raw) return DEFAULT_CONTENT_WIDTH;
  if (raw === "contained") return "lg";
  if (raw === "narrow") return "sm";
  if (raw in CONTENT_WIDTH_MAP) return raw as ContentWidthToken;
  return DEFAULT_CONTENT_WIDTH;
}

/**
 * Normalize Puck page-root width — preserves optional `full` bleed or contained presets.
 *
 * Header/footer chrome use {@link GLOBAL_LAYOUT_CONTENT_WIDTH} (default 1400px).
 *
 * @param raw - Stored page layout token or legacy value.
 * @returns Canonical page layout token.
 */
export function clampPageContentWidth(
  raw: LegacyContentWidth | string | undefined,
): ContentWidthToken {
  return normalizeContentWidth(raw);
}

/**
 * Resolve a width token to a CSS max-width value.
 *
 * @param raw - Token or legacy value.
 * @returns CSS length (e.g. `1200px`, `100%`).
 */
export function resolveContentWidth(raw: LegacyContentWidth | string | undefined): string {
  const token = normalizeContentWidth(raw);
  return CONTENT_WIDTH_MAP[token];
}

/**
 * Resolve block/section max-width relative to the page content container.
 *
 * Returns `100%` when the element should fill the page band (full bleed, same token as
 * page, or legacy `lg` blocks on an `xl` page). Otherwise returns the block token px.
 *
 * @param raw - Block or section width token (or legacy value).
 * @param custom - CSS length when `raw` is `custom`.
 * @param pageWidthToken - Active page layout token from PageRoot.
 * @returns CSS max-width for band / island outer shell.
 */
export function resolveContentBandMaxWidth(
  raw: LegacyContentWidth | string | undefined,
  custom?: string,
  pageWidthToken?: ContentWidthToken,
): string {
  if (raw === "custom") {
    return custom?.trim() || CONTENT_WIDTH_MAP[DEFAULT_CONTENT_WIDTH];
  }

  const pageToken = pageWidthToken ?? DEFAULT_CONTENT_WIDTH;
  const blockToken = normalizeContentWidth(raw);

  if (blockToken === "full") return "100%";
  if (blockToken === pageToken) return "100%";
  if (blockToken === "lg" && pageToken === "xl") return "100%";

  return CONTENT_WIDTH_MAP[blockToken];
}

/**
 * Inline style object for a centered content container.
 *
 * @param raw - Token or legacy value.
 * @returns CSS properties for max-width centering.
 */
export function contentWidthContainerStyle(
  raw: LegacyContentWidth | string | undefined,
): { maxWidth: string; width: string; marginInline: string } {
  const token = normalizeContentWidth(raw);
  return {
    maxWidth: CONTENT_WIDTH_MAP[token],
    width: "100%",
    marginInline: token === "full" ? "0" : "auto",
  };
}

/**
 * Tailwind-compatible max-width class token for header chrome.
 *
 * @returns CSS variable reference for default contained width.
 */
export function defaultHeaderMaxWidthStyle(): { maxWidth: string } {
  return { maxWidth: `var(${CONTENT_WIDTH_CSS_VARS[GLOBAL_LAYOUT_CONTENT_WIDTH]})` };
}

/**
 * Inline style for responsive page content gutters (reveals background grid).
 *
 * @returns CSS padding properties using `--page-content-gutter`.
 */
export function pageGutterStyle(): {
  paddingInline: string;
  paddingBlock: string;
} {
  return {
    paddingInline: "var(--page-content-gutter)",
    paddingBlock: "var(--page-content-gutter)",
  };
}

/**
 * Vertical gutter only — pairs with {@link GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS}
 * horizontal padding so page content shares the same inner width as header/footer.
 *
 * @returns CSS block padding using `--page-content-gutter`.
 */
export function pageContentBlockGutterStyle(): {
  paddingBlock: string;
} {
  return {
    paddingBlock: "var(--page-content-gutter)",
  };
}

/**
 * Top page gutter only — bottom separation before global footer uses `--spacing-sm`.
 *
 * @returns CSS top padding using `--page-content-gutter`.
 */
export function pageContentTopGutterStyle(): {
  paddingTop: string;
} {
  return {
    paddingTop: "var(--page-content-gutter)",
  };
}

/**
 * Class name for the shared inner width band inside global layout gutter slots.
 *
 * Pair with {@link contentWidthContainerStyle} on the same element.
 */
export const GLOBAL_LAYOUT_WIDTH_BAND_CLASS = "global-layout-width-band";

/** Fixed header slot — gutter + chrome positioning. */
export const GLOBAL_LAYOUT_HEADER_SLOT_CLASS = "global-layout-header-slot";

/** Page body slot — horizontal gutter aligned with header/footer. */
export const GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS = "global-layout-page-content-slot";

/** Footer slot — gutter + standard gap above footer chrome. */
export const GLOBAL_LAYOUT_FOOTER_SLOT_CLASS = "global-layout-footer-slot";
