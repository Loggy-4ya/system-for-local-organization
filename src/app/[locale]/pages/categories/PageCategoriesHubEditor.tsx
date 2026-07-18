"use client";

/**
 * @fileoverview News catalog category hub editor for Page Manager (`/pages/categories/edit`).
 *
 * @module src/app/pages/categories/PageCategoriesHubEditor
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, FolderOpen, LayoutGrid, Layers, Plus, Trash2 } from "lucide-react";
import "@/app/global-layout-editor.css";
import {
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
 * Label for the hub domain picker trigger and dropdown rows.
 *
 * @param domain - Path domain segment.
 * @param catalog - Available domain rows from the server.
 * @returns Combined path + title label.
 */
function formatDomainPickerLabel(
  domain: string,
  catalog: readonly PagePathDomainCatalogEntry[],
): string {
  const pathLabel = formatPageDomainLabel(domain);
  const title = resolveDomainSectionTitle(domain, catalog);
  return `${pathLabel} — ${title}`;
}

/** Shared island link styling — solid elevated surface, no transparent washes. */
const editorNavIslandClass =
  "global-layout-editor__btn-text inline-flex w-fit items-center gap-1.5 border border-(--color-border-default) bg-(--color-bg-elevated) text-xs text-(--color-text-secondary) no-underline transition-colors hover:border-(--color-border-default) hover:bg-(--color-bg-panel) hover:text-(--color-text-primary)";

/** Props for {@link CatalogHubEmptyState}. */
interface CatalogHubEmptyStateProps {
  icon: typeof LayoutGrid;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Centered dashed empty-state panel for the catalog hub editor.
 *
 * @param props - Icon, copy, and optional primary action.
 * @returns Empty-state markup.
 */
function CatalogHubEmptyState({ icon: Icon, title, description, action }: CatalogHubEmptyStateProps) {
  return (
    <div className="glass-elevated flex flex-col items-center gap-3 rounded-lg border border-dashed border-(--color-border-default) px-6 py-10 text-center">
      <div
        className="glass-panel flex size-12 items-center justify-center rounded-lg text-primary"
        aria-hidden="true"
      >
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-(--color-text-primary)">{title}</h3>
        <p className="text-xs leading-relaxed text-(--color-text-secondary)">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
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

  /** Refresh domain catalog after navigation from Page Manager (SSR snapshot may be stale). */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/page-categories/settings");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { availableDomains?: PagePathDomainCatalogEntry[] };
        if (!cancelled && Array.isArray(data.availableDomains)) {
          setAvailableDomains(data.availableDomains);
        }
      } catch {
        /* keep SSR-hydrated catalog */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
      className="global-layout-editor page-categories-hub-editor py-8 md:py-12"
      innerClassName="global-layout-editor__stack"
    >
      <div className="glass-panel w-full p-4 md:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <nav className="flex flex-wrap items-center gap-2" aria-label="Editor navigation">
              <Link href="/pages/categories" className={editorNavIslandClass}>
                <ArrowLeft size={12} aria-hidden="true" />
                <span>Back to catalog</span>
              </Link>
              <ChevronRight
                size={12}
                strokeWidth={2.25}
                className="text-(--color-text-secondary)"
                aria-hidden="true"
              />
              <Link href="/pages" className={editorNavIslandClass}>
                <span>Page Manager</span>
              </Link>
            </nav>

            <div className="flex items-start gap-3">
              <div className="glass-elevated rounded-lg p-2.5 text-primary" aria-hidden="true">
                <FolderOpen size={18} strokeWidth={1.75} />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                  Page Manager
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
                  News Catalog Categories
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-(--color-text-secondary)">
                  Choose which path-domain pages (such as `/news`, `/surveys`) appear as tabs on your
                  news catalog and in what order. Preview card images, size, and descriptions are
                  configured per page in Publication settings.
                </p>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 lg:block">
            <AdminEditorActionToolbar
              onReset={handleReset}
              onSave={handleSave}
              resetDisabled={!isDirty}
              saveDisabled={!isDirty}
              isSaving={isSaving}
              useEditorButtonStyle
            />
          </div>
        </div>
      </div>

      <GlobalLayoutEditorStatusBanner status={status} />

      <div className="glass-panel w-full p-4 md:p-6 lg:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border-default) pb-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold text-(--color-text-primary)">Domain sections</h2>
            <p className="text-sm text-(--color-text-secondary)">
              Only path domains with existing Puck pages can be added.
            </p>
          </div>
          {config.sections.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="global-layout-editor__btn-text shrink-0"
              onClick={addSection}
              disabled={unusedDomains.length === 0}
            >
              <Plus size={14} aria-hidden="true" />
              Add domain
            </Button>
          ) : null}
        </div>

        {availableDomains.length === 0 ? (
          <CatalogHubEmptyState
            icon={LayoutGrid}
            title="No path domains yet"
            description="Create Puck pages under domains such as /news or /surveys in Page Manager, then return here to curate catalog tabs."
            action={
              <Link href="/pages" className={editorNavIslandClass}>
                <span>Open Page Manager</span>
              </Link>
            }
          />
        ) : config.sections.length === 0 ? (
          <CatalogHubEmptyState
            icon={Layers}
            title="No catalog sections yet"
            description="Add a path domain to choose which pages appear as tabs on the news catalog and how each section is laid out."
            action={
              <Button
                type="button"
                variant="outline"
                className="global-layout-editor__btn-text"
                onClick={addSection}
                disabled={unusedDomains.length === 0}
              >
                <Plus size={14} aria-hidden="true" />
                Add domain
              </Button>
            }
          />
        ) : (
          <div className="page-categories-hub-editor__section-stack">
            {config.sections.map((section) => {
              const sectionDomainOptions = [section.domain, ...unusedDomains].filter(
                (domain, index, list) => list.indexOf(domain) === index,
              );
              const sectionTitle = resolveDomainSectionTitle(section.domain, availableDomains);

              return (
                <div key={section.id} className="glass-elevated p-4 md:p-5">
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
                        <SelectValue placeholder="Select domain">
                          {section.domain
                            ? formatDomainPickerLabel(section.domain, availableDomains)
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {sectionDomainOptions.map((domain) => (
                          <SelectItem
                            key={domain}
                            value={domain}
                            label={formatDomainPickerLabel(domain, availableDomains)}
                          >
                            {formatDomainPickerLabel(domain, availableDomains)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <div className="mt-4">
                    <FormField
                      label="Pages in this domain"
                      hint="Search and add published pages under this domain. Order matches the catalog display. Card preview settings live in each page's Publication chapter."
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

      {isDirty ? <div className="h-16 lg:hidden" aria-hidden="true" /> : null}

      {isDirty ? (
        <div className="admin-mobile-toolbar lg:hidden">
          <AdminEditorActionToolbar
            onReset={handleReset}
            onSave={handleSave}
            resetDisabled={!isDirty}
            saveDisabled={!isDirty}
            isSaving={isSaving}
            useEditorButtonStyle
            className="w-full justify-end"
          />
        </div>
      ) : null}
    </StaticPageShell>
  );
}

export default PageCategoriesHubEditor;
