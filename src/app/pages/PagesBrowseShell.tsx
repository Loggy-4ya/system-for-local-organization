"use client";

/**
 * @fileoverview Read-only public pages catalog (`/pages`).
 *
 * @module src/app/pages/PagesBrowseShell
 */

import Link from "next/link";
import { Settings } from "lucide-react";
import type { NewsCatalogHubSection } from "@shared/constants/pageCategoriesHub";
import { NexusNewsCatalogRender } from "@/components/puck/blocks/news/NexusNewsCatalogRender";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link PagesBrowseShell}. */
export interface PagesBrowseShellProps {
  /** Published catalog sections. */
  sections: NewsCatalogHubSection[];
  /** When true, show a settings control linking to `/pages/edit`. */
  showCatalogEditLink?: boolean;
}

/**
 * Public browse surface — stacked domain catalog, no drag or publisher tools.
 *
 * @param props - Catalog payload and optional edit affordance.
 * @returns Read-only pages catalog UI.
 */
export function PagesBrowseShell({
  sections,
  showCatalogEditLink = false,
}: PagesBrowseShellProps) {
  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/pages"]}
      className="py-12 page-catalog-browse-shell"
      innerClassName="page-catalog-island-stack"
    >
      <div className="glass-panel page-catalog-hero-island w-full rounded-lg p-6 shadow-md border border-zinc-700/20 dark:border-zinc-300/10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="page-catalog-hero-title">Pages</h1>
            <p className="page-catalog-hero-subtitle">
              Browse published pages grouped by domain.
            </p>
          </div>

          {showCatalogEditLink ? (
            <Link
              href="/pages/edit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              <Settings size={14} aria-hidden="true" />
              Manage catalog
            </Link>
          ) : null}
        </div>
      </div>

      <NexusNewsCatalogRender sections={sections} stacked settingsHref={null} autoplayCarousel />
    </StaticPageShell>
  );
}

export default PagesBrowseShell;
