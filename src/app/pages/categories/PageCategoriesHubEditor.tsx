"use client";

/**
 * @fileoverview News catalog category hub editor for Page Manager (`/pages/categories/edit`).
 *
 * @module src/app/pages/categories/PageCategoriesHubEditor
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderOpen, Plus, Trash2 } from "lucide-react";
import {
  NEWS_CATALOG_CARD_LAYOUTS,
  NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS,
  type PageCategoriesHubConfig,
  type PageCategoryHubSection,
  type PagePathDomainCatalogEntry,
} from "@shared/constants/pageCategoriesHub";
import { listUnusedPagePathDomains } from "@shared/lib/pageCategoriesHubLogic";
import { formatPageDomainLabel, pagePathBelongsToDomain } from "@shared/lib/pagePathLogic";
import { AdminEditorActionToolbar } from "@/components/admin/AdminEditorActionToolbar";
import { GlobalLayoutEditorStatusBanner } from "@/components/global-layout/GlobalLayoutEditorStatusBanner";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PagePathMultiPicker } from "../PagePathMultiPicker";

/** Props for {@link PageCategoriesHubEditor}. */
export interface PageCategoriesHubEditorProps {
  initialConfig: PageCategoriesHubConfig;
  initialAvailableDomains: PagePathDomainCatalogEntry[];
}

/** Deep clone hub config for dirty tracking. */
function cloneHubConfig(config: PageCategoriesHubConfig): PageCategoriesHubConfig {
  return JSON.parse(JSON.stringify(config)) as PageCategoriesHubConfig;
}

/**
 * Resolve the display title for a domain section in the editor.
 *
 * @param domain - Path domain segment.
 * @param catalog - Available domain rows from the server.
 * @returns Section heading label.
 */
function resolveDomainSectionTitle(
  domain: string,
  catalog: readonly PagePathDomainCatalogEntry[],
): string {
  const row = catalog.find((entry) => entry.domain === domain);
  if (row?.title) return row.title;
  return formatPageDomainLabel(domain) || domain;
}

/**
 * Page Manager editor for news catalog path-domain sections.
 *
 * @param props - Server-hydrated config and domain catalog.
 * @returns Editor UI.
 */
export function PageCategoriesHubEditor({
  initialConfig,
  initialAvailableDomains,
}: PageCategoriesHubEditorProps) {
  const [config, setConfig] = useState(() => cloneHubConfig(initialConfig));
  const [savedConfig, setSavedConfig] = useState(() => cloneHubConfig(initialConfig));
  const [availableDomains, setAvailableDomains] = useState(initialAvailableDomains);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  const domainSegments = useMemo(
    () => availableDomains.map((entry) => entry.domain),
    [availableDomains],
  );

  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const unusedDomains = useMemo(
    () => listUnusedPagePathDomains(domainSegments, config.sections),
    [domainSegments, config.sections],
  );

  const updateSection = useCallback(
    (sectionId: string, patch: Partial<PageCategoryHubSection>) => {
      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId ? { ...section, ...patch } : section,
        ),
      }));
    },
    [],
  );

  const removeSection = useCallback((sectionId: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  }, []);

  const addSection = useCallback(() => {
    const nextDomain = unusedDomains[0];
    if (!nextDomain) return;

    setConfig((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `section-${Date.now()}`,
          domain: nextDomain,
          pagePaths: [],
          cardLayout: "featured-grid",
          imagesPerCard: 1,
        },
      ],
    }));
  }, [unusedDomains]);

  const handleReset = () => {
    setConfig(cloneHubConfig(savedConfig));
    setStatus(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/page-categories/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: config.sections }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save news catalog categories.");
      }

      const nextConfig = cloneHubConfig(data.config as PageCategoriesHubConfig);
      setConfig(nextConfig);
      setSavedConfig(nextConfig);
      setAvailableDomains(data.availableDomains ?? availableDomains);
      setStatus({ type: "success", message: "News catalog categories saved." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save news catalog categories.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/pages"]}
      className="gap-8 pb-24 py-12 lg:pb-12"
    >
      <div className="flex flex-col gap-2">
        <Link
          href="/pages/categories"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground no-underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to catalog
        </Link>
        <Link
          href="/pages"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground no-underline"
        >
          Page Manager
        </Link>
      </div>

        <div className="glass-panel w-full rounded-lg p-6 shadow-md border border-zinc-700/20 dark:border-zinc-300/10">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FolderOpen size={20} aria-hidden="true" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                News Catalog Categories
              </h1>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginTop: 4 }}>
                Choose which path-domain pages (such as `/news`, `/surveys`) appear as tabs on your
                news catalog and which child pages show in each section. Changes apply to every News
                Catalog block on the site.
              </p>
            </div>
          </div>
        </div>

      <GlobalLayoutEditorStatusBanner status={status} />

      <div className="glass-panel rounded-lg p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-foreground">Domain sections</h2>
            <p className="text-sm text-muted-foreground">
              Only path domains with existing Puck pages can be added.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addSection} disabled={unusedDomains.length === 0}>
            <Plus size={14} aria-hidden="true" />
            Add domain
          </Button>
        </div>

        {availableDomains.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No path domains exist yet. Create Puck pages under domains such as `/news` or `/surveys`
            in Page Manager, then return here.
          </p>
        ) : config.sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No catalog sections yet. Add a domain to curate pages for the news hub layout.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {config.sections.map((section) => {
              const sectionDomainOptions = [section.domain, ...unusedDomains].filter(
                (domain, index, list) => list.indexOf(domain) === index,
              );
              const sectionTitle = resolveDomainSectionTitle(section.domain, availableDomains);

              return (
                <div
                  key={section.id}
                  className="rounded-md border border-(--color-border-default) bg-(--color-bg-elevated) p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium text-foreground">{sectionTitle}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatPageDomainLabel(section.domain)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      label="Path domain"
                      hint="Must match an existing domain page such as /news."
                    >
                      <Select
                        value={section.domain}
                        onValueChange={(domain) => {
                          const nextDomain = domain ?? "";
                          updateSection(section.id, {
                            domain: nextDomain,
                            pagePaths: section.pagePaths.filter((path) =>
                              pagePathBelongsToDomain(path, nextDomain, domainSegments),
                            ),
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectionDomainOptions.map((domain) => (
                            <SelectItem key={domain} value={domain}>
                              {formatPageDomainLabel(domain)} —{" "}
                              {resolveDomainSectionTitle(domain, availableDomains)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Images per card" hint="Publication images shown on each preview.">
                      <Select
                        value={String(section.imagesPerCard)}
                        onValueChange={(value) =>
                          updateSection(section.id, {
                            imagesPerCard: Number(value) as PageCategoryHubSection["imagesPerCard"],
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS.map((count) => (
                            <SelectItem key={count} value={String(count)}>
                              {count} image{count === 1 ? "" : "s"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <div className="mt-4">
                    <FormField
                      label="Card layout"
                      hint="Featured + grid matches the news hub mockup (large lead card + tile grid)."
                    >
                      <Select
                        value={section.cardLayout}
                        onValueChange={(cardLayout) =>
                          updateSection(section.id, {
                            cardLayout: (cardLayout ??
                              "featured-grid") as PageCategoryHubSection["cardLayout"],
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NEWS_CATALOG_CARD_LAYOUTS.map((layout) => (
                            <SelectItem key={layout} value={layout}>
                              {layout === "featured-grid" ? "Featured + grid" : "Uniform grid"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <div className="mt-4">
                    <FormField
                      label="Pages in this domain"
                      hint="Search and add published pages under this domain. Order matches the catalog display."
                    >
                      <PagePathMultiPicker
                        value={section.pagePaths}
                        onChange={(pagePaths) => updateSection(section.id, { pagePaths })}
                        domainFilter={section.domain}
                        excludeDomainRoot
                        placeholder={`Search pages under ${formatPageDomainLabel(section.domain)}…`}
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdminEditorActionToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        onReset={handleReset}
        onSave={() => {
          void handleSave();
        }}
        saveLabel="Save categories"
        className="admin-mobile-toolbar"
      />
    </StaticPageShell>
  );
}

export default PageCategoriesHubEditor;
