/**
 * @fileoverview Client fetch for page path domain segments.
 *
 * @module src/components/puck/lib/pagePathDomainClient
 */

let cachedDomains: string[] | null = null;

/**
 * Invalidate the in-memory domain cache after picker mutations.
 */
export function invalidatePagePathDomainCache(): void {
  cachedDomains = null;
}

/**
 * Load distinct domain segments for the page URL editor.
 *
 * @param options - Optional domains that must remain visible for the active page.
 * @returns Sorted domain labels such as `news`, `surveys`.
 */
export async function fetchPagePathDomains(options?: {
  alwaysInclude?: readonly string[];
  force?: boolean;
}): Promise<string[]> {
  if (cachedDomains && !options?.force && !options?.alwaysInclude?.length) {
    return cachedDomains;
  }

  const params = new URLSearchParams({ domains: "1" });
  if (options?.alwaysInclude?.length) {
    params.set("include", options.alwaysInclude.join(","));
  }

  const res = await fetch(`/api/pages/paths?${params.toString()}`);
  if (!res.ok) return cachedDomains ?? [];

  const payload = (await res.json()) as { domains?: string[] };
  const domains = payload.domains ?? [];
  if (!options?.alwaysInclude?.length) {
    cachedDomains = domains;
  }
  return domains;
}

/**
 * Hide a domain label from the institutional picker.
 *
 * @param domain - Domain segment such as `surveys`.
 * @returns Updated visible domain list and count of existing pages under the domain.
 * @throws Error When the API rejects the request.
 */
export async function removePagePathDomain(domain: string): Promise<{
  domains: string[];
  pageCount: number;
}> {
  const params = new URLSearchParams({ domain });
  const res = await fetch(`/api/pages/path-domains?${params.toString()}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!res.ok) {
    let message = "Failed to remove domain.";
    try {
      const payload = (await res.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      /* use default */
    }
    throw new Error(message);
  }

  const payload = (await res.json()) as { domains?: string[]; pageCount?: number };
  cachedDomains = payload.domains ?? [];
  return {
    domains: cachedDomains,
    pageCount: payload.pageCount ?? 0,
  };
}

/**
 * Add a custom domain label to the institutional picker.
 *
 * @param domain - Domain segment such as `events`.
 * @returns Updated visible domain list.
 * @throws Error When the API rejects the request.
 */
export async function addPagePathDomain(domain: string): Promise<string[]> {
  const res = await fetch("/api/pages/path-domains", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });

  if (!res.ok) {
    let message = "Failed to add domain.";
    try {
      const payload = (await res.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      /* use default */
    }
    throw new Error(message);
  }

  const payload = (await res.json()) as { domains?: string[] };
  cachedDomains = payload.domains ?? [];
  return cachedDomains;
}
