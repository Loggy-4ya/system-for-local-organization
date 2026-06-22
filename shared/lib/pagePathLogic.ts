/**
 * @fileoverview Pure helpers for Puck page URL paths and public link labels.
 *
 * Centralises slug normalisation and badge-style path formatting used by the
 * page editor, mention links, and page catalog APIs.
 *
 * Tests: `npm run test:page-path-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pagePathLogic
 */

import { buildPageMentionHref } from "@shared/lib/nexusMentionTypes";
import { DEFAULT_PAGE_PATH_DOMAINS } from "@shared/constants/pagePathDomains";

/** Parsed page address parts for `/domain/page_slug` editing. */
export interface PageAddressParts {
  /** First path segment such as `news` (empty when legacy flat slug). */
  domain: string;
  /** Remaining slug after the domain segment. */
  pageSlug: string;
}

/** Summary row for page path autocomplete and link pickers. */
export interface PagePathCatalogEntry {
  /** MongoDB page document id. */
  id: string;
  /** Human-readable page title. */
  title: string;
  /** Canonical absolute path (e.g. `/news`). */
  path: string;
  /** Badge label — same as {@link formatPagePathLabel}. */
  label: string;
  /** Public href for navigation. */
  href: string;
}

/**
 * Normalise a raw slug fragment into an absolute page path.
 *
 * @param val - User-entered slug (with or without leading slash).
 * @returns Normalised path such as `/about` or `/`.
 */
export function normalizePagePath(val: string): string {
  const cleanSlug = val
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_/]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return cleanSlug ? `/${cleanSlug}` : "/";
}

/**
 * Strip the leading slash from an absolute page path.
 *
 * @param pagePath - Stored path such as `/news`.
 * @returns Slug segment without slash (empty for homepage).
 */
export function pagePathToSlug(pagePath: string): string {
  const trimmed = pagePath.trim();
  if (!trimmed || trimmed === "/") return "";
  return trimmed.replace(/^\//, "");
}

/**
 * Normalise a domain segment (first path part).
 *
 * @param domain - Raw domain label.
 * @returns Lowercase alphanumeric/hyphen segment or empty string.
 */
export function normalizePageDomainSegment(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normalise the editable page slug segment (after domain).
 *
 * @param pageSlug - Raw slug fragment.
 * @returns Lowercase alphanumeric/hyphen segment or empty string.
 */
export function normalizePageSlugSegment(pageSlug: string): string {
  return pageSlug
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Slugify a page title into the editable page slug segment (after domain).
 *
 * @param title - Human-readable page title.
 * @returns Lowercase hyphen slug such as `spring-fair`, or empty when unset.
 */
export function slugifyPageTitleToSlugSegment(title: string): string {
  const collapsed = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizePageSlugSegment(collapsed);
}

/**
 * Derive a combined Puck slug from a title while preserving the selected domain.
 *
 * @param title - Current page title draft.
 * @param currentSlug - Combined slug stored in puck (`news/fair` or flat `fair`).
 * @param knownDomains - Domain segments used to disambiguate single-segment paths.
 * @returns Combined slug without a leading slash.
 */
export function derivePageSlugFromTitle(
  title: string,
  currentSlug: string,
  knownDomains: readonly string[] = DEFAULT_PAGE_PATH_DOMAINS,
): string {
  const pageSlugPart = slugifyPageTitleToSlugSegment(title);
  const address = splitPageAddress(currentSlug, knownDomains);
  return composePageAddress(address.domain, pageSlugPart);
}

/**
 * Format a domain segment for badge display (`/news`).
 *
 * @param domain - Domain segment without slashes.
 * @returns Badge label or empty string when unset.
 */
export function formatPageDomainLabel(domain: string): string {
  const normalized = normalizePageDomainSegment(domain);
  return normalized ? `/${normalized}` : "";
}

/**
 * Compose stored slug parts into a single slug string (no leading slash).
 *
 * @param domain - Domain segment.
 * @param pageSlug - Page slug segment.
 * @returns Combined slug such as `news/spring-fair` or `news`.
 */
export function composePageAddress(domain: string, pageSlug: string): string {
  const normalizedDomain = normalizePageDomainSegment(domain);
  const normalizedSlug = normalizePageSlugSegment(pageSlug);

  if (!normalizedDomain && !normalizedSlug) return "";
  if (!normalizedDomain) return normalizedSlug;
  if (!normalizedSlug) return normalizedDomain;
  return `${normalizedDomain}/${normalizedSlug}`;
}

/**
 * Split a stored slug or absolute path into domain + page slug parts.
 *
 * @param raw - Combined slug (`news/fair`) or absolute path (`/news/fair`).
 * @param knownDomains - Domain segments used to disambiguate single-segment paths.
 * @returns Address parts for the editor UI.
 */
export function splitPageAddress(
  raw: string,
  knownDomains: readonly string[] = DEFAULT_PAGE_PATH_DOMAINS,
): PageAddressParts {
  const clean = raw.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean) return { domain: "", pageSlug: "" };

  const parts = clean.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return {
      domain: normalizePageDomainSegment(parts[0] ?? ""),
      pageSlug: parts.slice(1).join("/"),
    };
  }

  const only = parts[0] ?? "";
  const domainSet = new Set(
    knownDomains.map((entry) => normalizePageDomainSegment(entry)).filter(Boolean),
  );
  const normalizedOnly = normalizePageDomainSegment(only);

  if (domainSet.has(normalizedOnly)) {
    return { domain: normalizedOnly, pageSlug: "" };
  }

  return { domain: "", pageSlug: only };
}

/**
 * Merge default and discovered domain segments into a sorted unique list.
 *
 * @param discovered - Domain segments from existing page paths.
 * @returns Sorted domain labels without duplicates.
 */
export function mergePagePathDomains(discovered: readonly string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const raw of [...DEFAULT_PAGE_PATH_DOMAINS, ...discovered]) {
    const normalized = normalizePageDomainSegment(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(normalized);
  }

  return merged.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Format an absolute path for compact badge display in settings sidebars.
 *
 * @param pagePath - Stored path such as `/news` or `/surveys/q1`.
 * @returns Label beginning with `/` (homepage returns `/`).
 */
export function formatPagePathLabel(pagePath: string): string {
  const normalized = normalizePagePath(pagePath.replace(/^\//, "") || "/");
  return normalized === "/" ? "/" : normalized;
}

/**
 * Resolve the public navigation href for a Puck page path.
 *
 * @param pagePath - Stored path such as `/news`.
 * @returns Same path normalised with a leading slash.
 */
export function buildPagePublicHref(pagePath: string): string {
  return buildPageMentionHref(pagePath);
}

/**
 * Filter page path catalog rows by query and optional exclusions.
 *
 * @param query - Case-insensitive substring filter on path and title.
 * @param catalog - Candidate rows.
 * @param excludePaths - Paths to omit (e.g. current page while editing slug).
 * @returns Matching rows sorted by path.
 */
export function filterPagePathCatalog(
  query: string,
  catalog: readonly PagePathCatalogEntry[],
  excludePaths: readonly string[] = [],
): PagePathCatalogEntry[] {
  const exclude = new Set(excludePaths.map((path) => normalizePagePath(path.replace(/^\//, ""))));
  const needle = query.trim().toLowerCase();

  return catalog
    .filter((entry) => {
      const normalized = normalizePagePath(entry.path.replace(/^\//, ""));
      if (exclude.has(normalized)) return false;
      if (!needle) return true;
      return (
        entry.path.toLowerCase().includes(needle) ||
        entry.title.toLowerCase().includes(needle) ||
        entry.label.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));
}

/**
 * Map lean page rows into catalog entries for editor pickers.
 *
 * @param rows - MongoDB page documents with `_id`, `path`, and `title`.
 * @returns Normalised catalog entries with badge labels and hrefs.
 */
export function toPagePathCatalogEntries(
  rows: ReadonlyArray<{ _id: { toString(): string }; path: string; title?: string | null }>,
): PagePathCatalogEntry[] {
  return rows
    .map((row) => {
      const path = normalizePagePath(row.path.replace(/^\//, "") || "/");
      if (path === "/") return null;
      return {
        id: row._id.toString(),
        title: (row.title ?? "Untitled Page").trim() || "Untitled Page",
        path,
        label: formatPagePathLabel(path),
        href: buildPagePublicHref(path),
      };
    })
    .filter((entry): entry is PagePathCatalogEntry => entry != null);
}
