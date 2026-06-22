/**
 * @fileoverview Pure helpers for Puck page category (Obsidian-style tag) labels.
 *
 * Categories are free-form display strings deduped case-insensitively. The
 * autocomplete catalog is derived from distinct values stored on Page documents.
 *
 * Tests: `npm run test:page-category` — see `tests/shared/lib/pageCategoryLogic.test.ts`
 *
 * @module shared/lib/pageCategoryLogic
 */

/** Maximum categories assignable to a single page. */
export const MAX_PAGE_CATEGORIES = 12;

/** Maximum length of a single category display label. */
export const MAX_PAGE_CATEGORY_LABEL_LENGTH = 48;

/** Characters forbidden in category labels (path/slug safety and XSS hygiene). */
const FORBIDDEN_CATEGORY_CHARS = /[<>{}\/\\|]/;

/**
 * Build a stable comparison key from a category label.
 *
 * @param label - Human-readable category label.
 * @returns Lowercase trimmed key for deduplication.
 */
export function pageCategoryKey(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * Normalise a single category label for storage, or reject invalid input.
 *
 * @param value - Raw label from editor input or API body.
 * @returns Trimmed canonical label, or null when empty or invalid.
 */
export function normalizePageCategoryLabel(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed === "") return null;
  if (trimmed.length > MAX_PAGE_CATEGORY_LABEL_LENGTH) return null;
  if (FORBIDDEN_CATEGORY_CHARS.test(trimmed)) return null;
  return trimmed;
}

/**
 * Normalise and dedupe a category list while preserving first-seen casing.
 *
 * @param categories - Raw category strings from Puck root props or MongoDB.
 * @returns Sanitised unique labels capped at {@link MAX_PAGE_CATEGORIES}.
 */
export function normalizePageCategoryList(categories: readonly string[] | null | undefined): string[] {
  if (!categories?.length) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of categories) {
    const label = normalizePageCategoryLabel(raw);
    if (!label) continue;

    const key = pageCategoryKey(label);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(label);

    if (result.length >= MAX_PAGE_CATEGORIES) break;
  }

  return result;
}

/**
 * Whether another category may be appended to the current selection.
 *
 * @param existing - Current normalised category labels on the page.
 * @param candidate - Proposed new label (raw).
 * @returns True when the candidate is valid and not already selected.
 */
export function canAddPageCategory(existing: readonly string[], candidate: string): boolean {
  if (existing.length >= MAX_PAGE_CATEGORIES) return false;

  const label = normalizePageCategoryLabel(candidate);
  if (!label) return false;

  const key = pageCategoryKey(label);
  return !existing.some((entry) => pageCategoryKey(entry) === key);
}

/**
 * Filter catalog suggestions by a search query (case-insensitive substring).
 *
 * @param query - User search string from the combobox input.
 * @param options - Distinct category labels from the database.
 * @param selected - Labels already on the page (excluded from results).
 * @returns Matching unselected labels sorted alphabetically (case-insensitive).
 */
export function filterPageCategorySuggestions(
  query: string,
  options: readonly string[],
  selected: readonly string[] = [],
): string[] {
  const selectedKeys = new Set(selected.map(pageCategoryKey));
  const normalizedQuery = query.trim().toLowerCase();

  return options
    .filter((option) => {
      const key = pageCategoryKey(option);
      if (selectedKeys.has(key)) return false;
      if (!normalizedQuery) return true;
      return key.includes(normalizedQuery);
    })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Whether the query can create a new category not present in the catalog.
 *
 * @param query - Current combobox search string.
 * @param options - Known labels from the database.
 * @param selected - Labels already assigned to the page.
 * @returns True when normalised query is a valid new label.
 */
export function shouldOfferCreatePageCategory(
  query: string,
  options: readonly string[],
  selected: readonly string[] = [],
): boolean {
  const label = normalizePageCategoryLabel(query);
  if (!label) return false;
  if (!canAddPageCategory(selected, label)) return false;

  const key = pageCategoryKey(label);
  const existsInCatalog = options.some((option) => pageCategoryKey(option) === key);
  const existsInSelected = selected.some((entry) => pageCategoryKey(entry) === key);

  return !existsInCatalog && !existsInSelected;
}
