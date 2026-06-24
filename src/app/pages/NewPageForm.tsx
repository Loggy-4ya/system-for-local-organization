"use client";

/**
 * @fileoverview Client component for creating a new Puck-managed page.
 *
 * Publishers pick a path domain, enter a title, and confirm the URL slug before
 * opening the Puck editor.
 *
 * @module src/app/pages/NewPageForm
 */

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PagePathDomainCatalogEntry } from "@shared/constants/pageCategoriesHub";
import { PAGE_CATALOG_UNCATEGORIZED_DOMAIN } from "@shared/constants/pageCategoriesHub";
import {
  composeNewPageAddressSlug,
  formatPageDomainLabel,
  normalizePageDomainSegment,
  normalizePageSlugSegment,
  slugifyPageTitleToSlugSegment,
} from "@shared/lib/pagePathLogic";
import { resolveHubSectionDisplayLabel } from "@shared/lib/pageCategoriesHubLogic";
import { validatePagePathDomainSegment } from "@shared/lib/pagePathDomainListLogic";
import { fetchReservedPagePaths, isReservedSlugPath, validatePageSlug } from "@/components/puck/lib/pageSlugValidation";
import { addCatalogPagePathDomain } from "@/lib/pageCatalogDomainClient";
import { PageCatalogSelect } from "@/components/pages/PageCatalogSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Props for {@link NewPageForm}. */
export interface NewPageFormProps {
  /** Visible path domains for the domain picker. */
  availableDomains: readonly PagePathDomainCatalogEntry[];
  /** Called with the validated editor path (e.g. `/news/about/edit?title=About`). */
  onNavigate?: (editorPath: string) => void;
  /** When true, publishers may register a new path domain inline. */
  canAddDomains?: boolean;
}

/**
 * Build domain select options including flat "Other pages".
 *
 * @param availableDomains - Domain catalog rows from the server.
 * @returns Select options for {@link PageCatalogSelect}.
 */
function buildNewPageDomainOptions(
  availableDomains: readonly PagePathDomainCatalogEntry[],
): Array<{ value: string; label: string }> {
  const options = availableDomains.map((entry) => ({
    value: entry.domain,
    label: entry.title
      ? `${entry.title} (${formatPageDomainLabel(entry.domain)})`
      : formatPageDomainLabel(entry.domain),
  }));

  options.push({
    value: PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
    label: "Other pages (flat URL)",
  });

  return options;
}

/**
 * Map the form domain select value to a path domain segment.
 *
 * @param domain - Selected domain or {@link PAGE_CATALOG_UNCATEGORIZED_DOMAIN}.
 * @returns Domain segment, or empty string for flat URLs.
 */
function resolveNewPageDomainSegment(domain: string): string {
  return domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN ? "" : domain;
}

/**
 * Merge API domain segments into catalog rows for the picker.
 *
 * @param current - Existing catalog rows.
 * @param domainSegments - Updated domain list from the API.
 * @returns Sorted unique catalog entries.
 */
function mergeDomainCatalogEntries(
  current: readonly PagePathDomainCatalogEntry[],
  domainSegments: readonly string[],
): PagePathDomainCatalogEntry[] {
  const byDomain = new Map(
    current.map((entry) => [entry.domain.toLowerCase(), entry] as const),
  );

  for (const segment of domainSegments) {
    const normalized = normalizePageDomainSegment(segment);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (byDomain.has(key)) continue;
    byDomain.set(key, {
      domain: normalized,
      domainPath: formatPageDomainLabel(normalized),
      title: resolveHubSectionDisplayLabel(normalized),
    });
  }

  return [...byDomain.values()].sort((left, right) =>
    left.domain.localeCompare(right.domain, undefined, { sensitivity: "base" }),
  );
}

/**
 * Form for creating a page — domain, title, slug, then open Puck editor.
 *
 * @param props - Domain catalog and navigation callback.
 * @returns New page creation form.
 */
export function NewPageForm({
  availableDomains,
  onNavigate,
  canAddDomains = false,
}: NewPageFormProps) {
  const router = useRouter();
  const [domainCatalog, setDomainCatalog] = useState<PagePathDomainCatalogEntry[]>(() => [
    ...availableDomains,
  ]);
  const domainOptions = useMemo(
    () => buildNewPageDomainOptions(domainCatalog),
    [domainCatalog],
  );

  const [domain, setDomain] = useState(
    () => availableDomains[0]?.domain ?? PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
  );
  const [title, setTitle] = useState("");
  const [slugSegment, setSlugSegment] = useState("");
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addDomainVisible, setAddDomainVisible] = useState(false);
  const [addDomainDraft, setAddDomainDraft] = useState("");
  const [addDomainError, setAddDomainError] = useState<string | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);

  useEffect(() => {
    setDomainCatalog([...availableDomains]);
  }, [availableDomains]);

  useEffect(() => {
    if (domainOptions.some((option) => option.value === domain)) return;
    setDomain(domainOptions[0]?.value ?? PAGE_CATALOG_UNCATEGORIZED_DOMAIN);
  }, [domain, domainOptions]);

  const handleAddDomain = async () => {
    const validation = validatePagePathDomainSegment(addDomainDraft);
    if (!validation.valid || !validation.normalized) {
      setAddDomainError(validation.error ?? "Enter a valid domain label.");
      return;
    }

    if (domainCatalog.some((entry) => entry.domain === validation.normalized)) {
      setDomain(validation.normalized);
      setAddDomainVisible(false);
      setAddDomainDraft("");
      setAddDomainError(null);
      return;
    }

    setAddDomainError(null);
    setAddingDomain(true);

    try {
      const domains = await addCatalogPagePathDomain(validation.normalized);
      const nextCatalog = mergeDomainCatalogEntries(domainCatalog, domains);
      setDomainCatalog(nextCatalog);
      setDomain(validation.normalized);
      setAddDomainVisible(false);
      setAddDomainDraft("");
    } catch (err) {
      setAddDomainError(err instanceof Error ? err.message : "Failed to add domain.");
    } finally {
      setAddingDomain(false);
    }
  };

  const previewPath = useMemo(() => {
    const pageSlug =
      normalizePageSlugSegment(slugSegment) || slugifyPageTitleToSlugSegment(title);
    if (!pageSlug) return "/…";
    const addressSlug = composeNewPageAddressSlug(resolveNewPageDomainSegment(domain), pageSlug);
    return `/${addressSlug}`;
  }, [domain, slugSegment, title]);

  /**
   * Validate inputs and navigate to the Puck editor.
   *
   * @param e - Form submit event.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Enter a page title.");
      return;
    }

    const pageSlug =
      normalizePageSlugSegment(slugSegment) || slugifyPageTitleToSlugSegment(trimmedTitle);
    if (!pageSlug) {
      setError("Enter a valid URL slug (letters, numbers, and hyphens).");
      return;
    }

    const addressSlug = composeNewPageAddressSlug(resolveNewPageDomainSegment(domain), pageSlug);
    const normalizedPath = `/${addressSlug}`.replace(/\/+/g, "/");
    if (isReservedSlugPath(normalizedPath)) {
      setError("That URL is reserved. Choose a different slug.");
      return;
    }

    setSubmitting(true);

    try {
      const reservedPaths = await fetchReservedPagePaths();
      const validation = validatePageSlug(addressSlug, {
        slugLocked: false,
        currentPath: "",
        reservedPaths,
      });

      if (!validation.valid) {
        setError(validation.error ?? "Invalid slug.");
        return;
      }

      const params = new URLSearchParams({ title: trimmedTitle });
      const editorPath = `${validation.normalizedPath}/edit?${params.toString()}`.replace("//", "/");
      if (onNavigate) {
        onNavigate(editorPath);
      } else {
        router.push(editorPath);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="page-manager-fab__form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="page-manager-fab__field">
        <Label htmlFor="new-page-domain" className="page-manager-fab__field-label">
          Domain
        </Label>
        <PageCatalogSelect
          aria-label="Page domain"
          value={domain}
          options={domainOptions}
          triggerClassName="page-manager-fab__domain-select"
          onValueChange={(next) => {
            setError(null);
            setDomain(next);
          }}
        />
        {canAddDomains ? (
          <div className="page-manager-fab__add-domain">
            {!addDomainVisible ? (
              <button
                type="button"
                className="page-manager-fab__add-domain-trigger"
                onClick={() => {
                  setAddDomainVisible(true);
                  setAddDomainError(null);
                }}
              >
                <Plus size={14} aria-hidden="true" />
                Add domain
              </button>
            ) : (
              <div className="page-manager-fab__add-domain-form">
                <div className="page-manager-fab__add-domain-row">
                  <span className="page-manager-fab__slug-prefix" aria-hidden="true">
                    /
                  </span>
                  <Input
                    value={addDomainDraft}
                    placeholder="events"
                    disabled={addingDomain}
                    className="page-manager-fab__slug-input"
                    onChange={(event) => {
                      setAddDomainDraft(event.target.value);
                      setAddDomainError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setAddDomainVisible(false);
                        setAddDomainDraft("");
                        setAddDomainError(null);
                        return;
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleAddDomain();
                      }
                    }}
                  />
                </div>
                <div className="page-manager-fab__add-domain-actions">
                  <Button
                    type="button"
                    size="sm"
                    disabled={addingDomain || !addDomainDraft.trim()}
                    onClick={() => void handleAddDomain()}
                  >
                    {addingDomain ? "Adding…" : "Add"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={addingDomain}
                    onClick={() => {
                      setAddDomainVisible(false);
                      setAddDomainDraft("");
                      setAddDomainError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {addDomainError ? (
                  <p className="page-manager-fab__alert" role="alert">
                    {addDomainError}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="page-manager-fab__field">
        <Label htmlFor="new-page-title" className="page-manager-fab__field-label">
          Title
        </Label>
        <Input
          id="new-page-title"
          value={title}
          onChange={(event) => {
            setError(null);
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            if (!slugEditedManually) {
              setSlugSegment(slugifyPageTitleToSlugSegment(nextTitle));
            }
          }}
          placeholder="Spring fair announcement"
          className="page-manager-fab__title-input"
          required
        />
      </div>

      <div className="page-manager-fab__field">
        <Label htmlFor="new-page-slug" className="page-manager-fab__field-label">
          URL slug
        </Label>
        <div className="page-manager-fab__slug-row">
          <span className="page-manager-fab__slug-prefix" aria-hidden="true">
            /
          </span>
          <Input
            id="new-page-slug"
            value={slugSegment}
            onChange={(event) => {
              setError(null);
              setSlugEditedManually(true);
              setSlugSegment(normalizePageSlugSegment(event.target.value));
            }}
            placeholder="spring-fair"
            className="page-manager-fab__slug-input"
            aria-describedby="new-page-path-preview"
            required
          />
        </div>
        <p id="new-page-path-preview" className="page-manager-fab__path-preview">
          Opens at <code>{previewPath}</code>
        </p>
      </div>

      {error ? (
        <p className="page-manager-fab__alert" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="page-manager-fab__submit" disabled={submitting}>
        {submitting ? "Opening…" : "Open editor"}
      </Button>
    </form>
  );
}

export default NewPageForm;
