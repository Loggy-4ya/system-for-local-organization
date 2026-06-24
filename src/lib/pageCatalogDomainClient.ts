/**
 * @fileoverview Client helpers for catalog domain create/delete on `/pages/edit`.
 *
 * @module src/lib/pageCatalogDomainClient
 */

import {
  addPagePathDomain,
  invalidatePagePathDomainCache,
} from "@/components/puck/lib/pagePathDomainClient";

/**
 * Register a domain in MongoDB and make it available to the catalog editor.
 *
 * @param domain - Domain segment such as `projects`.
 * @returns Updated visible domain list from the API.
 */
export async function addCatalogPagePathDomain(domain: string): Promise<string[]> {
  return addPagePathDomain(domain);
}

/**
 * Hide a domain from the institutional catalog (admin-only, persists to DB).
 *
 * @param domain - Domain segment to remove from the catalog.
 * @returns API payload with updated domains and page count under the domain.
 */
export async function removeCatalogPagePathDomain(domain: string): Promise<{
  domains: string[];
  movedCount: number;
}> {
  const params = new URLSearchParams({ domain, scope: "catalog" });
  const res = await fetch(`/api/pages/path-domains?${params.toString()}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const payload = (await res.json()) as {
    domains?: string[];
    movedCount?: number;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error ?? "Failed to remove domain.");
  }
  invalidatePagePathDomainCache();
  return {
    domains: payload.domains ?? [],
    movedCount: payload.movedCount ?? 0,
  };
}
