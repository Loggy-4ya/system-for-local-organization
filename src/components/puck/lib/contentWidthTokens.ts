/**
 * @fileoverview Unified content width tokens for pages, sections, and islands.
 *
 * Single source of truth for max-width presets across Puck and site chrome.
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

/** Default page / island width. */
export const DEFAULT_CONTENT_WIDTH: ContentWidthToken = "lg";

/** Select options with pixel labels for Puck sidebars. */
export const CONTENT_WIDTH_OPTIONS: ContentWidthOption[] = [
  { label: "Extra Narrow (640px)", value: "xs" },
  { label: "Narrow (800px)", value: "sm" },
  { label: "Medium (1024px)", value: "md" },
  { label: "Contained (1200px)", value: "lg" },
  { label: "Wide (1400px)", value: "xl" },
  { label: "Full Width", value: "full" },
];

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
  return { maxWidth: "var(--content-width-lg)" };
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
