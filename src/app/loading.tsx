/**
 * @fileoverview Root App Router Suspense fallback — centered loader over InfiniteGrid.
 *
 * @module src/app/loading
 */

import { SiteLoader } from "@/components/ui/SiteLoader";

/**
 * Default loading UI while a route segment resolves.
 *
 * @returns Centered site loader.
 */
export default function Loading() {
  return <SiteLoader />;
}
