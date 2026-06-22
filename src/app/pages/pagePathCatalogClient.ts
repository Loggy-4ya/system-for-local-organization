/**
 * @fileoverview Client helper for page path catalog autocomplete (Page Manager).
 *
 * @module src/app/pages/pagePathCatalogClient
 */

import type { PagePathCatalogEntry } from "@shared/lib/pagePathLogic";

let cachedCatalog: PagePathCatalogEntry[] | null = null;

/**
 * Fetch the full page path catalog once per session.
 *
 * @returns Catalog rows for link pickers.
 */
export async function getPagePathCatalog(): Promise<PagePathCatalogEntry[]> {
  if (cachedCatalog) return cachedCatalog;

  const res = await fetch("/api/pages/paths?catalog=1");
  if (!res.ok) {
    throw new Error("Failed to load page catalog.");
  }

  const data = (await res.json()) as { catalog?: PagePathCatalogEntry[] };
  cachedCatalog = data.catalog ?? [];
  return cachedCatalog;
}

/**
 * Search the page path catalog with optional query filter.
 *
 * @param query - Case-insensitive filter on title or path.
 * @returns Matching catalog rows.
 */
export async function searchPagePathCatalog(query: string): Promise<PagePathCatalogEntry[]> {
  const q = query.trim();
  const url = q
    ? `/api/pages/paths?catalog=1&q=${encodeURIComponent(q)}`
    : "/api/pages/paths?catalog=1";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to search page catalog.");
  }
  const data = (await res.json()) as { catalog?: PagePathCatalogEntry[] };
  return data.catalog ?? [];
}

/**
 * Invalidate the session cache after structural page changes.
 */
export function invalidatePagePathCatalogCache(): void {
  cachedCatalog = null;
}
