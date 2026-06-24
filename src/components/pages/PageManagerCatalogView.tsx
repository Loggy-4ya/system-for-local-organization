"use client";

/**
 * @fileoverview Unified domain-grouped catalog for Page Manager (`/pages/edit`).
 *
 * @module src/components/pages/PageManagerCatalogView
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type {
  ManagerCatalogSection,
  PageCategoriesHubConfig,
  PagePathDomainCatalogEntry,
} from "@shared/constants/pageCategoriesHub";
import { PAGE_CATALOG_UNCATEGORIZED_DOMAIN } from "@shared/constants/pageCategoriesHub";
import type { PageCatalogDomainVisibilityFields } from "@shared/constants/pageCatalogDomainVisibility";
import { listUnusedPagePathDomains } from "@shared/lib/pageCategoriesHubLogic";
import {
  applyConfirmedCrossDomainMove,
  managerSectionsToHubConfig,
  type PageManagerCrossDomainMove,
} from "@shared/lib/pageManagerCatalogLogic";
import { formatPageDomainLabel } from "@shared/lib/pagePathLogic";
import { validatePagePathDomainSegment } from "@shared/lib/pagePathDomainListLogic";
import { AdminEditorActionToolbar } from "@/components/admin/AdminEditorActionToolbar";
import { GlobalLayoutEditorStatusBanner } from "@/components/global-layout/GlobalLayoutEditorStatusBanner";
import { EditorDragHandle } from "@/components/global-layout/EditorDragHandle";
import { EditorDropSlot } from "@/components/global-layout/EditorDropSlot";
import { useEditorSortableList } from "@/components/global-layout/useEditorSortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageCatalogCard } from "@/components/pages/PageCatalogCard";
import { CrossDomainMoveDialog } from "@/components/pages/CrossDomainMoveDialog";
import { PageCatalogDomainVisibilityField } from "@/components/pages/PageCatalogDomainVisibilityField";
import { PageCatalogSelect } from "@/components/pages/PageCatalogSelect";
import {
  RemoveCatalogDomainDialog,
  type PendingCatalogDomainRemoval,
} from "@/components/pages/RemoveCatalogDomainDialog";
import {
  PageManagerPageSortableProvider,
  usePageManagerPageSortable,
} from "@/components/pages/PageManagerPageSortableProvider";
import {
  addCatalogPagePathDomain,
  removeCatalogPagePathDomain,
} from "@/lib/pageCatalogDomainClient";

/** Props for {@link PageManagerCatalogView}. */
export interface PageManagerCatalogViewProps {
  /** Initial manager sections from the server. */
  initialSections: ManagerCatalogSection[];
  /** Saved hub config for dirty tracking. */
  initialConfig: PageCategoriesHubConfig;
  /** Visible domain catalog for labels and picker parity. */
  availableDomains: PagePathDomainCatalogEntry[];
  /** Every merged domain segment (includes institution-hidden labels). */
  allDomainSegments: string[];
  /** Whether the viewer may hide domains in MongoDB (`scope=catalog`). */
  isCatalogAdmin: boolean;
}

/** Deep clone hub config. */
function cloneHubConfig(config: PageCategoriesHubConfig): PageCategoriesHubConfig {
  return JSON.parse(JSON.stringify(config)) as PageCategoriesHubConfig;
}

/**
 * Resolve a section heading from the domain catalog or path label helper.
 *
 * @param domain - Path domain segment.
 * @param availableDomains - Visible domain catalog entries.
 * @returns Human-readable section title.
 */
function resolveSectionLabel(
  domain: string,
  availableDomains: readonly PagePathDomainCatalogEntry[],
): string {
  const entry = availableDomains.find((row) => row.domain === domain);
  if (entry?.title?.trim()) return entry.title.trim();
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

/**
 * One domain section with draggable page cards.
 *
 * @param props - Section payload and edit handlers.
 * @returns Section block UI.
 */
function ManagerCatalogSectionBlock({
  section,
  editable,
  onRemoveSection,
  onUpdateVisibility,
  onUpdateSectionLabel,
}: {
  section: ManagerCatalogSection;
  editable: boolean;
  onRemoveSection?: (sectionId: string) => void;
  onUpdateVisibility?: (
    sectionId: string,
    next: Required<PageCatalogDomainVisibilityFields>,
  ) => void;
  onUpdateSectionLabel?: (sectionId: string, sectionLabel: string) => void;
}) {
  const sortable = usePageManagerPageSortable();

  return (
    <section
      className={sortable.getSectionClassName(section.id, "page-manager-catalog__section glass-panel")}
      aria-labelledby={`page-domain-${section.id}`}
    >
      <header className="page-manager-catalog__section-header">
        <div className="page-manager-catalog__section-heading">
          <div className="nexus-news-catalog__stacked-heading">
            {editable && onUpdateSectionLabel ? (
              <Input
                value={section.sectionLabel}
                onChange={(event) => onUpdateSectionLabel(section.id, event.target.value)}
                className="page-manager-catalog__section-title-input"
                aria-label="Domain section title"
              />
            ) : (
              <h2 id={`page-domain-${section.id}`} className="page-manager-catalog__section-title">
                {section.sectionLabel}
              </h2>
            )}
            <span
              className="nexus-news-catalog__stacked-count"
              aria-label={`${section.pages.length} pages`}
            >
              {section.pages.length}
            </span>
          </div>
          <p className="page-manager-catalog__section-path">
            {section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN
              ? "Pages outside /domain/* paths"
              : formatPageDomainLabel(section.domain)}
          </p>
        </div>
        {editable ? (
          <div className="page-manager-catalog__section-controls">
            {onUpdateVisibility ? (
              <PageCatalogDomainVisibilityField
                value={section}
                onChange={(next) => onUpdateVisibility(section.id, next)}
              />
            ) : null}
            {onRemoveSection &&
            section.domain !== PAGE_CATALOG_UNCATEGORIZED_DOMAIN ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="page-manager-catalog__remove-section"
                onClick={() => onRemoveSection(section.id)}
              >
                <Trash2 size={14} aria-hidden="true" />
                Remove domain
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <div
        ref={(node) => sortable.registerSectionZone(section.id, section.pages.length, node)}
        className="page-manager-catalog__grid"
      >
        {section.pages.length === 0 ? (
          <div className="page-manager-catalog__empty-zone">Drop pages here</div>
        ) : (
          section.pages.map((page, pageIndex) => (
            <div
              key={page.path}
              ref={(node) => sortable.registerGridCell(section.id, pageIndex, node)}
              className="page-manager-catalog__grid-cell"
            >
              <div
                ref={(node) => sortable.registerPageRow(section.id, pageIndex, node)}
                data-catalog-page-path={page.path}
                className={
                  editable
                    ? sortable.getPageRowClassName(
                        section.id,
                        pageIndex,
                        "page-manager-catalog__card-wrap",
                      )
                    : "page-manager-catalog__card-wrap"
                }
              >
                <PageCatalogCard
                  page={page}
                  editable={editable}
                  dragHandleProps={
                    editable ? sortable.getPageHandleProps(section.id, pageIndex) : undefined
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/**
 * Editable catalog body with domain + page drag reorder and save toolbar.
 *
 * @param props - See {@link PageManagerCatalogViewProps}.
 * @returns Catalog UI.
 */
function EditablePageManagerCatalog({
  initialSections,
  initialConfig,
  availableDomains,
  allDomainSegments,
  isCatalogAdmin,
}: Required<
  Pick<
    PageManagerCatalogViewProps,
    | "initialSections"
    | "initialConfig"
    | "availableDomains"
    | "allDomainSegments"
    | "isCatalogAdmin"
  >
>) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [savedConfig, setSavedConfig] = useState(() => cloneHubConfig(initialConfig));
  const [domainCatalog, setDomainCatalog] = useState(allDomainSegments);
  const [visibleDomainSegments, setVisibleDomainSegments] = useState(() =>
    availableDomains.map((entry) => entry.domain),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingMove, setPendingMove] = useState<PageManagerCrossDomainMove | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [domainToAdd, setDomainToAdd] = useState<string>("");
  const [customDomainDraft, setCustomDomainDraft] = useState("");
  const [customDomainError, setCustomDomainError] = useState<string | null>(null);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<PendingCatalogDomainRemoval | null>(null);
  const [isRemovingDomain, setIsRemovingDomain] = useState(false);

  const currentConfig = useMemo(
    () => ({ sections: managerSectionsToHubConfig(sections) }),
    [sections],
  );

  const isDirty = useMemo(
    () => JSON.stringify(currentConfig) !== JSON.stringify(savedConfig),
    [currentConfig, savedConfig],
  );

  const visibleDomainSet = useMemo(
    () => new Set(visibleDomainSegments.map((domain) => domain.toLowerCase())),
    [visibleDomainSegments],
  );

  const unusedDomains = useMemo(
    () => listUnusedPagePathDomains(domainCatalog, currentConfig.sections),
    [domainCatalog, currentConfig.sections],
  );

  const addDomainOptions = useMemo(
    () =>
      unusedDomains.map((domain) => {
        const entry = availableDomains.find((row) => row.domain === domain);
        const label = entry?.title
          ? `${entry.title} (${formatPageDomainLabel(domain)})`
          : formatPageDomainLabel(domain);
        return { value: domain, label };
      }),
    [availableDomains, unusedDomains],
  );

  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    setSections(initialSections);
    setSavedConfig(cloneHubConfig(initialConfig));
    setDomainCatalog(allDomainSegments);
    setVisibleDomainSegments(availableDomains.map((entry) => entry.domain));
  }, [initialSections, initialConfig, allDomainSegments, availableDomains]);

  useEffect(() => {
    if (unusedDomains.length === 0) {
      setDomainToAdd("");
      return;
    }
    if (!domainToAdd || !unusedDomains.includes(domainToAdd)) {
      setDomainToAdd(unusedDomains[0]!);
    }
  }, [domainToAdd, unusedDomains]);

  const persistHubConfig = useCallback(
    async (nextSections: ManagerCatalogSection[]) => {
      const res = await fetch("/api/page-categories/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: managerSectionsToHubConfig(nextSections) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save catalog layout.");
      }
      const nextConfig = cloneHubConfig(data.config as PageCategoriesHubConfig);
      setSavedConfig(nextConfig);
      return nextConfig;
    },
    [],
  );

  const appendDomainSection = useCallback(
    (domain: string) => {
      setSections((prev) => [
        ...prev,
        {
          id: `section-${Date.now()}`,
          domain,
          sectionLabel: resolveSectionLabel(domain, availableDomains),
          pages: [],
          catalogVisibility: "public",
          catalogVisibleThroughLevel: 6,
        },
      ]);
    },
    [availableDomains],
  );

  const ensureDomainRegistered = useCallback(
    async (domain: string) => {
      if (visibleDomainSet.has(domain.toLowerCase())) return;
      const domains = await addCatalogPagePathDomain(domain);
      setVisibleDomainSegments(domains);
      setDomainCatalog((prev) =>
        prev.some((entry) => entry.toLowerCase() === domain.toLowerCase())
          ? prev
          : [...prev, domain].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
      );
    },
    [visibleDomainSet],
  );

  const addDomainSection = async () => {
    setCustomDomainError(null);
    setIsAddingDomain(true);
    setStatus(null);

    try {
      const customValidation = customDomainDraft.trim()
        ? validatePagePathDomainSegment(customDomainDraft)
        : null;

      if (customValidation) {
        if (!customValidation.valid || !customValidation.normalized) {
          setCustomDomainError(customValidation.error ?? "Enter a valid domain label.");
          return;
        }
        if (
          currentConfig.sections.some(
            (section) => section.domain.toLowerCase() === customValidation.normalized.toLowerCase(),
          )
        ) {
          setCustomDomainError("That domain is already in the catalog.");
          return;
        }

        await ensureDomainRegistered(customValidation.normalized);
        appendDomainSection(customValidation.normalized);
        setCustomDomainDraft("");
        setStatus({ type: "success", message: `Added ${formatPageDomainLabel(customValidation.normalized)}.` });
        return;
      }

      const nextDomain = domainToAdd || unusedDomains[0];
      if (!nextDomain) return;

      await ensureDomainRegistered(nextDomain);
      appendDomainSection(nextDomain);
      setStatus({ type: "success", message: `Added ${formatPageDomainLabel(nextDomain)}.` });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to add domain.",
      });
    } finally {
      setIsAddingDomain(false);
    }
  };

  const requestRemoveDomainSection = (sectionId: string) => {
    const section = sections.find((row) => row.id === sectionId);
    if (!section || section.domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN) return;

    if (isCatalogAdmin) {
      setPendingRemove({
        sectionId,
        domain: section.domain,
        pageCount: section.pages.length,
      });
      return;
    }

    setSections((prev) => prev.filter((row) => row.id !== sectionId));
  };

  const handleConfirmRemoveDomain = async () => {
    if (!pendingRemove) return;

    setIsRemovingDomain(true);
    setStatus(null);

    const removedDomain = pendingRemove.domain;

    try {
      const result = await removeCatalogPagePathDomain(removedDomain);
      setPendingRemove(null);
      setVisibleDomainSegments(result.domains);
      router.refresh();
      setStatus({
        type: "success",
        message:
          result.movedCount > 0
            ? `${formatPageDomainLabel(removedDomain)} removed. ${result.movedCount} page${result.movedCount === 1 ? "" : "s"} moved to Other pages.`
            : `${formatPageDomainLabel(removedDomain)} removed from the catalog.`,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to remove domain.",
      });
    } finally {
      setIsRemovingDomain(false);
    }
  };

  const updateSectionVisibility = (
    sectionId: string,
    next: Required<PageCatalogDomainVisibilityFields>,
  ) => {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, ...next } : section)),
    );
  };

  const updateSectionLabel = (sectionId: string, sectionLabel: string) => {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, sectionLabel } : section)),
    );
  };

  const handleReset = () => {
    setSections(initialSections);
    setSavedConfig(cloneHubConfig(initialConfig));
    setDomainCatalog(allDomainSegments);
    setVisibleDomainSegments(availableDomains.map((entry) => entry.domain));
    setCustomDomainDraft("");
    setCustomDomainError(null);
    setStatus(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      await persistHubConfig(sections);
      setStatus({ type: "success", message: "Catalog layout saved." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save catalog layout.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    setIsMoving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/pages/move-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: pendingMove.pagePath,
          targetDomain: pendingMove.toDomain,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to move page.");
      }
      setSections((prev) => applyConfirmedCrossDomainMove(prev, pendingMove));
      setPendingMove(null);
      setStatus({ type: "success", message: `Page moved to ${pendingMove.newPath}.` });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to move page.",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const sectionSortable = useEditorSortableList({
    items: sections,
    onReorder: setSections,
  });

  const canAddDomain = unusedDomains.length > 0 || (isCatalogAdmin && customDomainDraft.trim());

  return (
    <div className="global-layout-editor page-manager-catalog">
      <GlobalLayoutEditorStatusBanner status={status} />

      <div className="page-manager-catalog__toolbar-row">
        <p className="page-manager-catalog__toolbar-hint">
          Drag domain headings to reorder sections. Drag page cards to reorder or move across domains.
          Pages under each domain appear automatically; visibility controls who sees the section on
          /pages.
        </p>
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

      <PageManagerPageSortableProvider
        sections={sections}
        knownDomains={domainCatalog}
        onSectionsChange={setSections}
        onCrossDomainMove={setPendingMove}
      >
        <div className="page-manager-catalog__section-stack">
          {sections.map((section, sectionIndex) => (
            <div key={section.id} className="page-manager-catalog__section-shell">
              <EditorDropSlot active={sectionSortable.shouldShowDropSlotBefore(sectionIndex)} />
              <div
                ref={(node) => sectionSortable.registerRowRef(sectionIndex, node)}
                className={sectionSortable.getRowClassName(
                  sectionIndex,
                  "page-manager-catalog__section-drag-row",
                )}
              >
                <div className="page-manager-catalog__section-drag-handle">
                  <EditorDragHandle
                    {...sectionSortable.getHandleProps(sectionIndex)}
                    label="Drag to reorder domain section"
                  />
                </div>
                <ManagerCatalogSectionBlock
                  section={section}
                  editable
                  onRemoveSection={requestRemoveDomainSection}
                  onUpdateVisibility={updateSectionVisibility}
                  onUpdateSectionLabel={updateSectionLabel}
                />
              </div>
              <EditorDropSlot active={sectionSortable.shouldShowDropSlotAfter(sectionIndex)} />
            </div>
          ))}
        </div>
      </PageManagerPageSortableProvider>

      <div className="page-manager-catalog__add-domain glass-panel">
        {unusedDomains.length > 0 || isCatalogAdmin ? (
          <>
            {unusedDomains.length > 0 ? (
              unusedDomains.length > 1 ? (
                <PageCatalogSelect
                  aria-label="Domain to add"
                  value={domainToAdd}
                  options={addDomainOptions}
                  triggerClassName="page-manager-catalog__add-domain-select"
                  onValueChange={setDomainToAdd}
                />
              ) : (
                <span className="page-manager-catalog__add-domain-label">
                  {addDomainOptions[0]?.label}
                </span>
              )
            ) : null}
            {isCatalogAdmin ? (
              <div className="page-manager-catalog__custom-domain">
                <Input
                  value={customDomainDraft}
                  onChange={(event) => {
                    setCustomDomainDraft(event.target.value);
                    setCustomDomainError(null);
                  }}
                  placeholder="New domain (e.g. projects)"
                  className="page-manager-catalog__custom-domain-input"
                  aria-invalid={customDomainError ? true : undefined}
                />
                {customDomainError ? (
                  <p className="page-manager-catalog__custom-domain-error">{customDomainError}</p>
                ) : null}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void addDomainSection()}
              disabled={!canAddDomain || isAddingDomain}
            >
              <Plus size={14} aria-hidden="true" />
              {isAddingDomain ? "Adding…" : "Add domain section"}
            </Button>
          </>
        ) : (
          <p className="page-manager-catalog__add-domain-hint">
            All known path domains are already in the catalog. Create a page under a new domain
            (e.g. `/projects/foo`) to add another section.
          </p>
        )}
      </div>

      <CrossDomainMoveDialog
        pending={pendingMove}
        isSubmitting={isMoving}
        onCancel={() => setPendingMove(null)}
        onConfirm={handleConfirmMove}
      />

      <RemoveCatalogDomainDialog
        pending={pendingRemove}
        isSubmitting={isRemovingDomain}
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void handleConfirmRemoveDomain()}
      />

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
    </div>
  );
}

/**
 * Editable domain-grouped catalog for `/pages/edit`.
 *
 * @param props - See {@link PageManagerCatalogViewProps}.
 * @returns Catalog editor markup.
 */
export function PageManagerCatalogView({
  initialSections,
  initialConfig,
  availableDomains,
  allDomainSegments,
  isCatalogAdmin,
}: PageManagerCatalogViewProps) {
  return (
    <EditablePageManagerCatalog
      initialSections={initialSections}
      initialConfig={initialConfig}
      availableDomains={availableDomains}
      allDomainSegments={allDomainSegments}
      isCatalogAdmin={isCatalogAdmin}
    />
  );
}

export default PageManagerCatalogView;
