/**
 * @fileoverview Client-side page slug validation helpers.
 *
 * @module src/components/puck/lib/pageSlugValidation
 */

import { normalizePagePath } from "../PagePathEditor";

/** First path segments reserved for built-in app routes (cannot be Puck page slugs). */
export const RESERVED_SLUG_SEGMENTS = new Set([
  "edit",
  "pages",
  "api",
  "telegram",
  "login",
  "signup",
  "profile",
  "admin",
]);

/**
 * Whether the current pathname is the Puck visual editor (not app settings under `/pages/*`).
 *
 * Hides global header/footer only for CMS editor routes such as `/news/edit`, not
 * `/pages/categories/edit`.
 *
 * @param pathname - Browser pathname.
 * @returns True when global chrome should be suppressed.
 */
export function isPuckEditorRoutePath(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  if (pathname === "/edit") return true;
  if (!pathname.endsWith("/edit")) return false;

  const viewerPath = pathname.slice(0, -"/edit".length) || "/";
  if (viewerPath === "/") return true;
  return !isBuiltinAppRoutePath(viewerPath);
}

/**
 * Whether an absolute path is owned by a built-in app route (not Puck CMS).
 *
 * @param normalizedPath - Path such as `/telegram` or `/profile/settings`.
 * @returns True when the path must not be served by the Puck catch-all.
 */
export function isBuiltinAppRoutePath(normalizedPath: string): boolean {
  const first = getSlugFirstSegment(normalizedPath);
  return first !== "" && RESERVED_SLUG_SEGMENTS.has(first);
}

/**
 * Return the first segment of a normalized absolute path.
 *
 * @param normalizedPath - Path such as `/news` or `/council/about`.
 * @returns First segment without leading slash, or empty for homepage.
 */
export function getSlugFirstSegment(normalizedPath: string): string {
  return normalizedPath.replace(/^\//, "").split("/")[0] ?? "";
}

/**
 * Whether a normalized path uses a reserved first segment (e.g. `/edit`).
 *
 * @param normalizedPath - Absolute page path.
 * @returns True when the slug conflicts with app routes.
 */
export function isReservedSlugPath(normalizedPath: string): boolean {
  const first = getSlugFirstSegment(normalizedPath);
  return first !== "" && RESERVED_SLUG_SEGMENTS.has(first);
}

/** Result of validating a page slug draft. */
export interface SlugValidationResult {
  /** Normalized absolute path. */
  normalizedPath: string;
  /** Slug segment without leading slash (empty for homepage). */
  slugSegment: string;
  /** Whether the slug is valid for publish. */
  valid: boolean;
  /** User-facing error message when invalid. */
  error: string | null;
}

/**
 * Fetch all reserved page paths from the API.
 *
 * @returns Sorted list of absolute paths.
 */
export async function fetchReservedPagePaths(): Promise<string[]> {
  const res = await fetch("/api/pages/paths");
  if (!res.ok) return [];
  const payload = (await res.json()) as { paths?: string[] };
  return payload.paths ?? [];
}

/**
 * Validate a slug draft against reserved paths and homepage rules.
 *
 * @param slugDraft - Raw slug input without leading slash.
 * @param options - Validation context.
 * @returns Validation result with normalized path and error message.
 */
export function validatePageSlug(
  slugDraft: string,
  options: {
    slugLocked: boolean;
    currentPath: string;
    reservedPaths: string[];
  },
): SlugValidationResult {
  const { slugLocked, currentPath, reservedPaths } = options;

  if (slugLocked) {
    return {
      normalizedPath: "/",
      slugSegment: "",
      valid: true,
      error: null,
    };
  }

  const trimmed = slugDraft.trim();
  if (!trimmed) {
    return {
      normalizedPath: "/",
      slugSegment: "",
      valid: false,
      error: "URL slug is required for non-homepage pages.",
    };
  }

  const normalizedPath = normalizePagePath(trimmed);
  const slugSegment = normalizedPath.replace(/^\//, "");

  if (!slugSegment) {
    return {
      normalizedPath: "/",
      slugSegment: "",
      valid: false,
      error: "Enter a valid URL slug (letters, numbers, and hyphens).",
    };
  }

  if (isReservedSlugPath(normalizedPath)) {
    return {
      normalizedPath,
      slugSegment,
      valid: false,
      error: `"${slugSegment}" is reserved (/${slugSegment} is used by the app). Create a new page from Page Manager with a different slug.`,
    };
  }

  const taken = reservedPaths.some(
    (path) => path === normalizedPath && path !== currentPath,
  );

  if (taken) {
    return {
      normalizedPath,
      slugSegment,
      valid: false,
      error: `The path "${normalizedPath}" is already used by another page.`,
    };
  }

  return {
    normalizedPath,
    slugSegment,
    valid: true,
    error: null,
  };
}
