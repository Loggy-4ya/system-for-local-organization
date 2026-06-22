/**
 * @fileoverview Client helper for publisher invite link creation.
 *
 * @module src/components/puck/lib/pagePublisherInviteClient
 */

/** Successful invite link response from the API. */
export interface PagePublisherInviteResponse {
  /** Absolute invite URL to share. */
  url: string;
  /** ISO expiry timestamp. */
  expiresAt: string;
  /** Normalised page path the invite targets. */
  pagePath: string;
}

/**
 * Create a publisher invite link for the current page.
 *
 * @param pagePath - MongoDB page path key.
 * @returns Invite payload or throws with a message.
 */
export async function createPagePublisherInviteLink(
  pagePath: string,
): Promise<PagePublisherInviteResponse> {
  const res = await fetch("/api/pages/publisher-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pagePath }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    url?: string;
    expiresAt?: string;
    pagePath?: string;
  };

  if (!res.ok) {
    throw new Error(payload.error ?? "Failed to create invite link.");
  }

  if (!payload.url || !payload.expiresAt || !payload.pagePath) {
    throw new Error("Invalid invite response from server.");
  }

  return {
    url: payload.url,
    expiresAt: payload.expiresAt,
    pagePath: payload.pagePath,
  };
}
