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
 * Format specialty and group for profile and directory subtitles (`SE-42`).
 *
 * @param specialty - Letter specialty code stored on the user.
 * @param group - Numeric group stored on the user.
 * @returns Combined label or null when both are empty.
 */
export function formatAcademicGroupSpecialtyLabel(
  specialty: string | null | undefined,
  group: string | null | undefined,
): string | null {
  const spec = normalizeAcademicLabel(specialty ?? null);
  const grp = normalizeAcademicLabel(group ?? null);

  if (spec && grp) return `${spec}-${grp}`;
  if (spec) return spec;
  if (grp) return grp;
  return null;
}

/**
 * Whether a value is a valid specialty letter code (no digits).
 *
 * @param value - Candidate specialty code.
 * @returns True when 2–12 letters only.
 */
export function isValidAcademicSpecialtyCode(value: string | null | undefined): boolean {
  const normalized = normalizeAcademicLabel(value ?? null);
  if (!normalized) return false;
  return /^[A-Za-z]{2,12}$/.test(normalized);
}

/**
 * Whether a value is a valid student group number.
 *
 * @param value - Candidate group number string.
 * @returns True when 1–4 digits.
 */
export function isValidAcademicGroupNumber(value: string | null | undefined): boolean {
  const normalized = normalizeAcademicLabel(value ?? null);
  if (!normalized) return false;
  return /^\d{1,4}$/.test(normalized);
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
