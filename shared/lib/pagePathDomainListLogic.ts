/**
 * @fileoverview Pure helpers for page path domain picker visibility.
 *
 * Tests: `npm run test:page-path-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pagePathDomainListLogic
 */

import { normalizePageDomainSegment } from "@shared/lib/pagePathLogic";
import { RESERVED_PAGE_PATH_DOMAINS } from "@shared/constants/pagePathDomains";

/**
 * Normalise hidden domain labels for stable comparisons.
 *
 * @param hidden - Raw hidden domain segments from MongoDB.
 * @returns Lowercase unique hidden labels.
 */
export function normalizeHiddenPagePathDomains(hidden: readonly string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of hidden) {
    const normalized = normalizePageDomainSegment(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Remove hidden domains from a merged domain list while keeping active editor domains.
 *
 * @param domains - Full merged domain list.
 * @param hidden - Hidden domain segments.
 * @param alwaysInclude - Domains that must remain visible (e.g. current page domain).
 * @returns Visible picker domains sorted alphabetically.
 */
export function applyPagePathDomainVisibility(
  domains: readonly string[],
  hidden: readonly string[],
  alwaysInclude: readonly string[] = [],
): string[] {
  const hiddenSet = new Set(normalizeHiddenPagePathDomains(hidden));
  const includeSet = new Set(
    alwaysInclude.map((entry) => normalizePageDomainSegment(entry)).filter(Boolean),
  );
  const seen = new Set<string>();
  const visible: string[] = [];

  for (const raw of domains) {
    const normalized = normalizePageDomainSegment(raw);
    if (!normalized || seen.has(normalized)) continue;
    if (hiddenSet.has(normalized) && !includeSet.has(normalized)) continue;
    seen.add(normalized);
    visible.push(normalized);
  }

  for (const raw of alwaysInclude) {
    const normalized = normalizePageDomainSegment(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    visible.push(normalized);
  }

  return visible.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Append a domain to a hidden list when it is not already hidden.
 *
 * @param hidden - Current hidden domain segments.
 * @param domain - Domain segment to hide.
 * @returns Updated hidden list.
 */
export function appendHiddenPagePathDomain(
  hidden: readonly string[],
  domain: string,
): string[] {
  const normalized = normalizePageDomainSegment(domain);
  if (!normalized) return [...hidden];

  const next = normalizeHiddenPagePathDomains(hidden);
  if (next.includes(normalized)) return next;
  return [...next, normalized].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Normalise custom domain labels for stable comparisons.
 *
 * @param custom - Raw custom domain segments from MongoDB.
 * @returns Lowercase unique custom labels.
 */
export function normalizeCustomPagePathDomains(custom: readonly string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of custom) {
    const normalized = normalizePageDomainSegment(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Append a custom domain segment when it is not already present.
 *
 * @param custom - Current custom domain segments.
 * @param domain - Domain segment to add.
 * @returns Updated custom list.
 */
export function appendCustomPagePathDomain(
  custom: readonly string[],
  domain: string,
): string[] {
  const normalized = normalizePageDomainSegment(domain);
  if (!normalized) return [...custom];

  const next = normalizeCustomPagePathDomains(custom);
  if (next.includes(normalized)) return next;
  return [...next, normalized].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Validate a domain segment before adding it to the institutional picker.
 *
 * @param domain - Raw domain label from the editor.
 * @returns Validation result with normalised segment when valid.
 */
export function validatePagePathDomainSegment(domain: string): {
  valid: boolean;
  normalized: string;
  error: string | null;
} {
  const normalized = normalizePageDomainSegment(domain);
  if (!normalized) {
    return {
      valid: false,
      normalized: "",
      error: "Enter a valid domain label (letters, numbers, and hyphens).",
    };
  }

  if (RESERVED_PAGE_PATH_DOMAINS.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: `"/${normalized}" is reserved by the app and cannot be used as a page domain.`,
    };
  }

  return { valid: true, normalized, error: null };
}
