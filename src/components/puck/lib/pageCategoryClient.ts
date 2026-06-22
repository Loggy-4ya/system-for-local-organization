/**
 * @fileoverview Browser client for Puck page category autocomplete.
 *
 * Loads the distinct category catalog once per editor session and filters
 * client-side — focus/typing must not re-hit MongoDB.
 *
 * @module src/components/puck/lib/pageCategoryClient
 */

/** In-memory catalog cache for the current browser session. */
let cachedCategories: string[] | null = null;

/** In-flight fetch deduped across concurrent callers. */
let loadPromise: Promise<string[]> | null = null;

/**
 * Fetch distinct page category labels from MongoDB (full catalog, no server filter).
 *
 * @returns Sorted unique category labels.
 */
async function fetchPageCategoryCatalogFromApi(): Promise<string[]> {
  const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;

  const res = await fetch("/api/pages/categories", {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });

  if (!res.ok) {
    return [];
  }

  const payload = (await res.json()) as { categories?: string[] };
  return payload.categories ?? [];
}

/**
 * Return the cached catalog synchronously when already loaded this session.
 *
 * @returns Cached labels or null when not yet fetched.
 */
export function peekPageCategoryCatalog(): string[] | null {
  return cachedCategories;
}

/**
 * Load the category catalog once per session; subsequent calls reuse the cache.
 *
 * @returns Cached or freshly loaded category labels.
 */
export async function getPageCategoryCatalog(): Promise<string[]> {
  if (cachedCategories) {
    return cachedCategories;
  }

  if (!loadPromise) {
    loadPromise = fetchPageCategoryCatalogFromApi()
      .then((labels) => {
        cachedCategories = labels;
        return labels;
      })
      .finally(() => {
        loadPromise = null;
      });
  }

  return loadPromise;
}

/**
 * Append a newly created label to the session cache without a network round-trip.
 *
 * @param label - Normalised category label added on the current page.
 */
export function appendPageCategoryToCache(label: string): void {
  const trimmed = label.trim();
  if (!trimmed) return;

  if (!cachedCategories) {
    cachedCategories = [trimmed];
    return;
  }

  const key = trimmed.toLowerCase();
  if (cachedCategories.some((entry) => entry.toLowerCase() === key)) {
    return;
  }

  cachedCategories = [...cachedCategories, trimmed].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/**
 * Clear the session cache (e.g. after publish when other pages may have changed).
 */
export function invalidatePageCategoryCatalog(): void {
  cachedCategories = null;
  loadPromise = null;
}
