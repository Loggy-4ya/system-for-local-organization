"use client";

/**
 * @fileoverview Public page categories catalog shell (`/pages/categories`).
 *
 * @module src/app/pages/categories/PageCategoriesCatalogShell
 */

import { useState } from "react";
import type { NewsCatalogHubPayload } from "@shared/constants/pageCategoriesHub";
import { NexusNewsCatalogRender } from "@/components/puck/blocks/news/NexusNewsCatalogRender";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

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
      <NexusNewsCatalogRender
        sections={payload.sections}
        activeSectionId={activeSectionId}
        onActiveSectionChange={setActiveSectionId}
        settingsHref={showEditLink ? "/pages/categories/edit" : null}
      />
    </StaticPageShell>
  );
}

export default PageCategoriesCatalogShell;
