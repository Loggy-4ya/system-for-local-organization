/**
 * @fileoverview Pure helpers for `${{ variable }}` page field automation.
 *
 * Tests: `npm run test:nexus-page-variables`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/nexusPageVariables
 */

import { collectPublicationImageUrls } from "@shared/lib/pageCategoriesHubLogic";
import { normalizePagePath } from "@shared/lib/pagePathLogic";

/** Regex matching `${{ variableName }}` with optional inner whitespace. */
export const NEXUS_PAGE_VARIABLE_PATTERN = /\$\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/** Resolved string map for page variable interpolation. */
export type NexusPageVariableMap = Readonly<Record<string, string>>;

/** Inputs used to build the page variable map. */
export interface NexusPageVariableSource {
  /** Human-readable page title. */
  title?: string;
  /** Publication description. */
  description?: string;
  /** Cover image URL. */
  coverImage?: string;
  /** Additional publication gallery image URLs. */
  galleryImages?: readonly string[];
  /** Combined slug without leading slash. */
  slug?: string;
  /** Canonical MongoDB path such as `/news/fair`. */
  path?: string;
  /** Category labels on the page. */
  categories?: readonly string[];
  /** Resolved author / publisher display name. */
  authorDisplayName?: string | null;
  /** Public view counter. */
  viewCount?: number;
  /** Public like counter. */
  likeCount?: number;
  /** ISO publish timestamp or null. */
  publishAt?: string | null;
}

/**
 * Format a publish timestamp for template output.
 *
 * @param publishAt - ISO string or null.
 * @returns Locale date label or empty string.
 */
export function formatNexusPagePublishDateLabel(publishAt: string | null | undefined): string {
  if (!publishAt?.trim()) return "";
  const parsed = new Date(publishAt);
  if (Number.isNaN(parsed.getTime())) return publishAt.trim();
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Build the variable map for the current page context.
 *
 * @param source - Page metadata and Puck root field values.
 * @returns Map keyed by variable name.
 */
export function buildNexusPageVariableMap(source: NexusPageVariableSource): NexusPageVariableMap {
  const title = (source.title ?? "").trim() || "Untitled Page";
  const description = (source.description ?? "").trim();
  const imageUrls = collectPublicationImageUrls(source.coverImage, source.galleryImages);
  const coverImage = imageUrls[0] ?? "";
  const image1 = coverImage;
  const image2 = imageUrls[1] ?? "";
  const image3 = imageUrls[2] ?? "";
  const image4 = imageUrls[3] ?? "";
  const slug = (source.slug ?? "").trim();
  const normalizedPath = source.path?.trim()
    ? normalizePagePath(source.path.replace(/^\//, "") || "/")
    : slug
      ? normalizePagePath(slug)
      : "/";
  const path = normalizedPath === "/" ? "/" : normalizedPath;
  const categories = (source.categories ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(", ");
  const author = (source.authorDisplayName ?? "").trim();
  const views = String(source.viewCount ?? 0);
  const likes = String(source.likeCount ?? 0);
  const publishDate = formatNexusPagePublishDateLabel(source.publishAt);

  return {
    title,
    description,
    image: coverImage,
    coverImage,
    image1,
    image2,
    image3,
    image4,
    slug,
    path,
    url: path,
    categories,
    author,
    authorName: author,
    authorDisplayName: author,
    views,
    likes,
    viewCount: views,
    likeCount: likes,
    publishDate,
  };
}

/**
 * Replace `${{ variable }}` tokens in a string using the page variable map.
 *
 * Unknown names are left unchanged so editors can spot mistakes.
 *
 * @param template - Raw field value from a Puck block.
 * @param variables - Resolved page variable map.
 * @returns Interpolated string.
 */
export function interpolateNexusPageVariables(
  template: string,
  variables: NexusPageVariableMap,
): string {
  if (!template || !template.includes("${{")) return template;

  return template.replace(NEXUS_PAGE_VARIABLE_PATTERN, (match, rawName: string) => {
    const key = rawName.trim();
    const value = variables[key];
    return value !== undefined ? value : match;
  });
}

/**
 * Whether a string contains Nexus page variable tokens.
 *
 * @param value - Candidate template string.
 * @returns True when interpolation may change the value.
 */
export function containsNexusPageVariables(value: string): boolean {
  return value.includes("${{");
}
