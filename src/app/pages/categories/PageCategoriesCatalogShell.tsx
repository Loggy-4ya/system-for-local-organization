"use client";

/**
 * @fileoverview Public page categories catalog shell (`/pages/categories`).
 *
 * @module src/app/pages/categories/PageCategoriesCatalogShell
 */

import { useState } from "react";
import Link from "next/link";
import type { NewsCatalogHubPayload } from "@shared/constants/pageCategoriesHub";
import { NexusNewsCatalogRender } from "@/components/puck/blocks/news/NexusNewsCatalogRender";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Button } from "@/components/ui/button";

/** Props for {@link PageCategoriesCatalogShell}. */
export interface PageCategoriesCatalogShellProps {
  /** Server-resolved catalog payload. */
  payload: NewsCatalogHubPayload;
  /** When true, publishers see a link to the curation editor. */
  showEditLink?: boolean;
}

/**
 * Public browse surface for Puck pages grouped by path domain.
 *
 * @param props - Catalog payload and optional publisher affordances.
 * @returns Public catalog page UI.
 */
export function PageCategoriesCatalogShell({
  payload,
  showEditLink = false,
}: PageCategoriesCatalogShellProps) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    payload.sections[0]?.id ?? null,
  );

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/pages/categories"]}
      className="gap-8 py-12"
    >
      <div className="glass-panel w-full rounded-lg p-6 shadow-md border border-zinc-700/20 dark:border-zinc-300/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Pages by category
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              Browse published pages grouped by site sections such as news and surveys.
            </p>
          </div>
          {showEditLink ? (
            <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
              <Link href="/pages/categories/edit">Configure catalog</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <NexusNewsCatalogRender
        sections={payload.sections}
        activeSectionId={activeSectionId}
        onActiveSectionChange={setActiveSectionId}
        emptyMessage="No published pages are available yet. Check back after content is published."
        settingsHref={showEditLink ? "/pages/categories/edit" : null}
      />
    </StaticPageShell>
  );
}

export default PageCategoriesCatalogShell;
