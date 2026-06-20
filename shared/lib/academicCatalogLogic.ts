/**
 * @fileoverview Pure helpers for academic specialty/group catalog keys and labels.
 *
 * Tests: `tests/shared/lib/academicCatalogLogic.test.ts` — `npm run test:academic-catalog`
 *
 * @module shared/lib/academicCatalogLogic
 */

import type { AcademicCatalogKind } from "@shared/models/AcademicCatalog";

/**
 * Build a stable catalog key slug from a human label.
 *
 * @param label - Display label from user input or admin seed.
 * @returns Lowercase slug with non-alphanumeric runs collapsed to hyphens.
 */
export function slugifyAcademicCatalogLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalise a specialty or group label for storage and comparison.
 *
 * @param value - Raw user or catalog label.
 * @returns Trimmed label or null when empty.
 */
export function normalizeAcademicLabel(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Whether a submitted label exactly matches an approved catalog option (case-insensitive).
 *
 * @param label - Submitted label.
 * @param approvedLabels - Approved catalog labels for the kind.
 * @returns True when the label is already approved.
 */
export function isApprovedAcademicLabel(
  label: string | null,
  approvedLabels: readonly string[],
): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();
  return approvedLabels.some((entry) => entry.trim().toLowerCase() === normalized);
}

/**
 * Describe a catalog kind for admin UI copy.
 *
 * @param kind - Specialty or group.
 * @returns Human-readable kind label.
 */
export function academicCatalogKindLabel(kind: AcademicCatalogKind): string {
  return kind === "specialty" ? "Specialty" : "Group";
}
