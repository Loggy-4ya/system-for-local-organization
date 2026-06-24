/**
 * @fileoverview Client hook — effective blocked-word policy for live form validation.
 *
 * @module src/lib/useEffectiveContentPolicy
 */

"use client";

import { useEffect, useState } from "react";
import type { ContentPolicyBlockedWordEntry } from "@shared/constants/contentPolicy";

/** Effective blocklist snapshot for browser-side scans. */
export interface EffectiveContentPolicy {
  /** Normalised blocklist entries. */
  blockedWords: readonly ContentPolicyBlockedWordEntry[];
  /** User-facing rejection message. */
  blockedWordMessage: string;
}

/**
 * Load institutional blocked-word rules for client-side validation.
 *
 * Falls back to `null` while loading or on network failure — callers should
 * still rely on server-side enforcement in {@link CommentDomain}.
 *
 * @returns Effective policy snapshot, or null when unavailable.
 */
export function useEffectiveContentPolicy(): EffectiveContentPolicy | null {
  const [policy, setPolicy] = useState<EffectiveContentPolicy | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/general-rules/effective")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as {
          blockedWords?: string[];
          blockedWordMessage?: string;
        };
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        setPolicy({
          blockedWords: (payload.blockedWords ?? [])
            .map((term) => ({ term: term.trim() }))
            .filter((entry) => entry.term.length > 0),
          blockedWordMessage: payload.blockedWordMessage?.trim() || "",
        });
      })
      .catch(() => {
        if (!cancelled) setPolicy(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return policy;
}

export default useEffectiveContentPolicy;
