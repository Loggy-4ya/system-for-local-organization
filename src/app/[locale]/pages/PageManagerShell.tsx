"use client";

/**
 * @fileoverview Publisher catalog editor shell (`/pages/edit`).
 *
 * @module src/app/pages/PageManagerShell
 */

import "@/app/global-layout-editor.css";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { NewPagePopover } from "@/components/pages/NewPagePopover";
import { PageManagerCatalogView } from "@/components/pages/PageManagerCatalogView";
import type {
  ManagerCatalogSection,
  PageCategoriesHubConfig,
  PagePathDomainCatalogEntry,
} from "@shared/constants/pageCategoriesHub";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Page manager redirect notice keys from `?error=` query param. */
export type PageManagerNotice = "reserved-slug" | "homepage-code-only";

/** Props for the publisher catalog editor shell. */
interface PageManagerShellProps {
  /** Optional notice for the new-page popover. */
  notice?: PageManagerNotice;
  /** Whether the viewer may create new pages (FAB). */
  canCreatePages?: boolean;
  /** Manager sections including drafts. */
  managerSections: ManagerCatalogSection[];
  /** Saved hub config snapshot. */
  initialConfig: PageCategoriesHubConfig;
  /** Path domains for add-section UI. */
  availableDomains: PagePathDomainCatalogEntry[];
  /** Every merged domain segment (includes hidden labels). */
  allDomainSegments: string[];
  /** Whether the viewer may delete domains from MongoDB. */
  isCatalogAdmin: boolean;
}

/**
 * Publisher shell — editable catalog, FAB new-page popover, save toolbar.
 *
 * @param props - See {@link PageManagerShellProps}.
 * @returns Catalog editor UI.
 */
export function PageManagerShell({
  notice,
  canCreatePages = false,
  managerSections,
  initialConfig,
  availableDomains,
  allDomainSegments,
  isCatalogAdmin,
}: PageManagerShellProps) {
  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/pages/edit"]}
      className="py-12 page-manager-shell"
      innerClassName="page-catalog-island-stack"
    >
      <div className="glass-panel page-catalog-hero-island w-full rounded-lg p-6 shadow-md border border-zinc-700/20 dark:border-zinc-300/10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <Link
              href="/pages"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to catalog
            </Link>
            <div className="flex flex-col gap-1">
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Manage pages
              </h1>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                Reorder domain sections and page cards. Changes apply to the public catalog at
                /pages.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PageManagerCatalogView
        initialSections={managerSections}
        initialConfig={initialConfig}
        availableDomains={availableDomains}
        allDomainSegments={allDomainSegments}
        isCatalogAdmin={isCatalogAdmin}
      />

      {canCreatePages ? (
        <NewPagePopover notice={notice} availableDomains={availableDomains} />
      ) : null}
    </StaticPageShell>
  );
}

export default PageManagerShell;
