/**
 * @fileoverview Pure helpers for pages catalog domain visibility.
 *
 * Tests: `npm run test:page-catalog-domain-visibility-logic`
 *
 * @module shared/lib/pageCatalogDomainVisibilityLogic
 */

import {
  DEFAULT_ACCESS_LEVELS,
  type AccessLevelIndex,
} from "../constants/accessControl";
import type {
  PageCatalogDomainVisibility,
  PageCatalogDomainVisibilityFields,
} from "../constants/pageCatalogDomainVisibility";

/** Select option value for the pages catalog visibility control. */
export type PageCatalogVisibilitySelectValue = "public" | "hidden" | `level:${AccessLevelIndex}`;

/**
 * Normalise persisted visibility fields on a hub section row.
 *
 * @param row - Raw section row from MongoDB or the editor.
 * @returns Sanitised visibility fields.
 */
export function normalizePageCatalogDomainVisibility(
  row: PageCatalogDomainVisibilityFields | null | undefined,
): Required<PageCatalogDomainVisibilityFields> {
  const rawMode = String(row?.catalogVisibility ?? "public").trim() as PageCatalogDomainVisibility;
  const catalogVisibility: PageCatalogDomainVisibility =
    rawMode === "hidden" || rawMode === "level" ? rawMode : "public";

  const numeric = Number(row?.catalogVisibleThroughLevel);
  const catalogVisibleThroughLevel = (
    Number.isInteger(numeric) && numeric >= 0 && numeric <= 6 ? numeric : 6
  ) as AccessLevelIndex;

  return { catalogVisibility, catalogVisibleThroughLevel };
}

/**
 * Encode visibility fields as a single select value.
 *
 * @param fields - Normalised visibility fields.
 * @returns Select control value.
 */
export function encodePageCatalogVisibilitySelectValue(
  fields: PageCatalogDomainVisibilityFields,
): PageCatalogVisibilitySelectValue {
  const normalized = normalizePageCatalogDomainVisibility(fields);
  if (normalized.catalogVisibility === "hidden") return "hidden";
  if (normalized.catalogVisibility === "level") {
    return `level:${normalized.catalogVisibleThroughLevel}`;
  }
  return "public";
}

/**
 * Decode a select value into persisted visibility fields.
 *
 * @param value - Select control value.
 * @returns Visibility fields for hub config rows.
 */
export function decodePageCatalogVisibilitySelectValue(
  value: string,
): Required<PageCatalogDomainVisibilityFields> {
  if (value === "hidden") {
    return { catalogVisibility: "hidden", catalogVisibleThroughLevel: 6 };
  }
  if (value.startsWith("level:")) {
    const numeric = Number(value.slice("level:".length));
    const catalogVisibleThroughLevel = (
      Number.isInteger(numeric) && numeric >= 0 && numeric <= 6 ? numeric : 6
    ) as AccessLevelIndex;
    return { catalogVisibility: "level", catalogVisibleThroughLevel };
  }
  return { catalogVisibility: "public", catalogVisibleThroughLevel: 6 };
}

/**
 * Whether a viewer may see a catalog domain section on `/pages`.
 *
 * @param fields - Section visibility configuration.
 * @param viewerAccessLevelIndex - Viewer hierarchy index when signed in; null when anonymous.
 * @returns True when the section should render for the viewer.
 */
export function canViewerSeePageCatalogDomainSection(
  fields: PageCatalogDomainVisibilityFields,
  viewerAccessLevelIndex: AccessLevelIndex | null | undefined,
): boolean {
  const { catalogVisibility, catalogVisibleThroughLevel } =
    normalizePageCatalogDomainVisibility(fields);

  if (catalogVisibility === "hidden") return false;
  if (catalogVisibility === "public") return true;

  if (viewerAccessLevelIndex == null || !Number.isFinite(viewerAccessLevelIndex)) {
    return false;
  }

  return viewerAccessLevelIndex <= catalogVisibleThroughLevel;
}

/**
 * Build labelled options for the pages catalog visibility select.
 *
 * @returns Ordered select options (public, hidden, then each hierarchy tier).
 */
export function buildPageCatalogVisibilitySelectOptions(): Array<{
  value: PageCatalogVisibilitySelectValue;
  label: string;
}> {
  const options: Array<{ value: PageCatalogVisibilitySelectValue; label: string }> = [
    { value: "public", label: "Everyone" },
    { value: "hidden", label: "Hidden" },
  ];

  const shortLabels: Record<AccessLevelIndex, string> = {
    0: "Sys admin",
    1: "SG admin",
    2: "Institution",
    3: "SG member",
    4: "Starosta",
    5: "Teacher",
    6: "Student",
  };

  for (const level of DEFAULT_ACCESS_LEVELS) {
    options.push({
      value: `level:${level.index}`,
      label: `${shortLabels[level.index]} + above`,
    });
  }

  return options;
}
