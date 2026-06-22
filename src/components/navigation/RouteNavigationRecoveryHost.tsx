/**
 * @fileoverview Global listeners that unblock App Router history navigation.
 *
 * - `popstate` — marks back/forward so {@link SiteLoader} uses fast recovery.
 * - `pageshow` + `persisted` — bfcache restore triggers immediate `router.refresh()`.
 *
 * @module src/components/navigation/RouteNavigationRecoveryHost
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markHistoryPopNavigation } from "@/lib/routeLoaderRecoveryLogic";

/**
 * Mounts history/bfcache recovery hooks for the whole app shell.
 *
 * @returns Null — side effects only.
 */
export function RouteNavigationRecoveryHost() {
  const router = useRouter();

  useEffect(() => {
    /**
     * Mark browser back/forward for stuck-loader fast path.
     */
    const onPopState = () => {
      markHistoryPopNavigation();
    };

    /**
     * bfcache restore can freeze a stale React tree — refresh RSC immediately.
     *
     * @param event - Page show event from the browser.
     */
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        router.refresh();
      }
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return null;
}

export default RouteNavigationRecoveryHost;
