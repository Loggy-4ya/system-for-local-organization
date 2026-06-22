/**
 * @fileoverview Browser fetch helper for site chrome profile bootstrap.
 *
 * @module src/lib/siteProfileClient
 */

import type { BasicSiteProfile } from "@shared/lib/siteProfileBasic";

/** Successful `/api/me` payload shape. */
export interface SiteMeResponse {
  user: BasicSiteProfile;
}

/**
 * Load the authenticated viewer's basic profile from the server.
 *
 * @returns Parsed profile or `null` when the viewer is not signed in.
 * @throws When the network fails or the server returns an unexpected error.
 */
export async function fetchBasicSiteProfile(): Promise<BasicSiteProfile | null> {
  const res = await fetch("/api/me", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to load site profile (${res.status}).`);
  }

  const data = (await res.json()) as SiteMeResponse;
  return data.user ?? null;
}
