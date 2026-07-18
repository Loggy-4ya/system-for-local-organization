/**
 * @fileoverview Root App Router Suspense fallback — centered loader over InfiniteGrid.
 *
 * @module src/app/[locale]/loading
 */

import { getTranslations } from "next-intl/server";
import { SiteLoader } from "@/components/ui/SiteLoader";

/**
 * Default loading UI while a route segment resolves.
 *
 * @returns Centered site loader with localized label.
 */
export default async function Loading() {
  const t = await getTranslations("common");
  return <SiteLoader label={t("loading")} />;
}
